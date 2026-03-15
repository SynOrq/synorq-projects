import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { normalizeWorkspaceAutomationPayload } from "@/lib/automations";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
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
    const canManageAutomations = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageAutomations) {
      return NextResponse.json({ error: "Automation ayarlari icin yonetici yetkisi gerekir." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeWorkspaceAutomationPayload(body);
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    if (payload.data.targetProjectId) {
      const project = await db.project.findFirst({
        where: {
          id: payload.data.targetProjectId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Secilen proje workspace icinde bulunamadi." }, { status: 400 });
      }
    }

    const automation = await db.workspaceAutomation.create({
      data: {
        workspaceId: workspace.id,
        ...payload.data,
        config: payload.data.config as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        description: true,
        trigger: true,
        action: true,
        status: true,
        targetProjectId: true,
        config: true,
        lastRunAt: true,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.automation_created",
        metadata: {
          name: automation.name,
          status: automation.status,
        },
      },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("[workspace/automations/POST]", error);
    return NextResponse.json({ error: "Automation kaydi olusturulamadi." }, { status: 500 });
  }
}
