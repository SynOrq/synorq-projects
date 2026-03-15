import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeWorkspaceBillingPayload } from "@/lib/billing";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        billing: true,
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
    const canManageBilling = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageBilling) {
      return NextResponse.json({ error: "Billing ayarlari icin yonetici yetkisi gerekir." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeWorkspaceBillingPayload(body);
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const billing = await db.workspaceBilling.upsert({
      where: { workspaceId: workspace.id },
      update: payload.data,
      create: {
        workspaceId: workspace.id,
        ...payload.data,
      },
      select: {
        id: true,
        plan: true,
        status: true,
        billingEmail: true,
        seatCap: true,
        allowOverage: true,
        usageAlertThresholdPct: true,
        renewalDate: true,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.billing_updated",
        metadata: {
          plan: billing.plan,
          status: billing.status,
          billingEmail: billing.billingEmail,
          seatCap: billing.seatCap,
          allowOverage: billing.allowOverage,
          usageAlertThresholdPct: billing.usageAlertThresholdPct,
        },
      },
    });

    return NextResponse.json({ billing });
  } catch (error) {
    console.error("[workspace/billing/PATCH]", error);
    return NextResponse.json({ error: "Billing ayarlari guncellenemedi." }, { status: 500 });
  }
}
