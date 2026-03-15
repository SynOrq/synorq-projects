import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeWorkspaceIntegrationPayload, WORKSPACE_INTEGRATION_PROVIDERS } from "@/lib/integrations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { provider } = await params;
    const normalizedProvider = provider.toUpperCase();
    const allowedProviders = new Set(WORKSPACE_INTEGRATION_PROVIDERS.map((item) => item.value));
    if (!allowedProviders.has(normalizedProvider as never)) {
      return NextResponse.json({ error: "Bilinmeyen integration provider." }, { status: 400 });
    }

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace bulunamadi." }, { status: 404 });
    }

    const currentRole = workspace.members[0]?.role;
    const canManageIntegrations = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageIntegrations) {
      return NextResponse.json({ error: "Integration ayarlari icin yonetici yetkisi gerekir." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeWorkspaceIntegrationPayload(normalizedProvider as (typeof WORKSPACE_INTEGRATION_PROVIDERS)[number]["value"], body);
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }
    const integrationInput = {
      ...payload.data,
      config: payload.data.config as Prisma.InputJsonValue,
    };

    const integration = await db.workspaceIntegration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: normalizedProvider as (typeof WORKSPACE_INTEGRATION_PROVIDERS)[number]["value"],
        },
      },
      update: integrationInput,
      create: {
        workspaceId: workspace.id,
        provider: normalizedProvider as (typeof WORKSPACE_INTEGRATION_PROVIDERS)[number]["value"],
        ...integrationInput,
      },
      select: {
        provider: true,
        status: true,
        label: true,
        config: true,
        lastSyncedAt: true,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.integration_updated",
        metadata: {
          name: integration.provider,
          status: integration.status,
        },
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("[workspace/integrations/[provider]/PATCH]", error);
    return NextResponse.json({ error: "Integration kaydi guncellenemedi." }, { status: 500 });
  }
}
