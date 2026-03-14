import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeWorkspacePayload } from "@/lib/settings";

export async function PATCH(req: NextRequest) {
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
      return NextResponse.json({ error: "Workspace bulunamadı." }, { status: 404 });
    }

    const currentRole = workspace.members[0]?.role;
    const canManageWorkspace = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageWorkspace) {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekir." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeWorkspacePayload(body, {
      description: workspace.description,
      logoUrl: workspace.logoUrl,
    });
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }
    const data = payload.data;

    const updatedWorkspace = await db.workspace.update({
      where: { id: workspace.id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.updated",
        metadata: {
          name: updatedWorkspace.name,
          logoUrl: updatedWorkspace.logoUrl,
        },
      },
    });

    return NextResponse.json({ workspace: updatedWorkspace });
  } catch (err) {
    console.error("[workspace/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
