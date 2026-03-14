import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { upsertWorkspaceState } from "@/lib/workspace-state";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace bulunamadi." }, { status: 404 });
    }

    const body = await req.json();
    const now = new Date();
    const preferenceKeys: string[] = [];
    const updates: {
      notificationsReadAt?: Date | null;
      onboardingDismissedAt?: Date | null;
      riskAlertsEnabled?: boolean;
      activityAlertsEnabled?: boolean;
      weeklyDigestEnabled?: boolean;
    } = {};

    if (body.markNotificationsRead) {
      updates.notificationsReadAt = now;
    }

    if (body.dismissOnboarding) {
      updates.onboardingDismissedAt = now;
    }

    if (body.restoreOnboarding) {
      updates.onboardingDismissedAt = null;
    }

    if (typeof body.riskAlertsEnabled === "boolean") {
      updates.riskAlertsEnabled = body.riskAlertsEnabled;
      preferenceKeys.push("riskAlertsEnabled");
    }

    if (typeof body.activityAlertsEnabled === "boolean") {
      updates.activityAlertsEnabled = body.activityAlertsEnabled;
      preferenceKeys.push("activityAlertsEnabled");
    }

    if (typeof body.weeklyDigestEnabled === "boolean") {
      updates.weeklyDigestEnabled = body.weeklyDigestEnabled;
      preferenceKeys.push("weeklyDigestEnabled");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Gecerli bir state guncellemesi gerekli." }, { status: 400 });
    }

    const state = await upsertWorkspaceState({
      workspaceId: workspace.id,
      userId: session.user.id,
      updates,
    });

    if (!state) {
      return NextResponse.json(
        { error: "Workspace state modeli henuz yuklenmedi. Dev serveri yeniden baslatin." },
        { status: 503 }
      );
    }

    if (preferenceKeys.length > 0) {
      await db.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId: session.user.id,
          action: "workspace.preference_changed",
          metadata: {
            preferenceKeys,
          },
        },
      });
    }

    return NextResponse.json({ state });
  } catch (err) {
    console.error("[workspace/state/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
