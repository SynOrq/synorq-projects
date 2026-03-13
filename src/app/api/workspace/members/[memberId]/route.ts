import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const body = await req.json();
    const role = typeof body.role === "string" ? body.role.toUpperCase() : "";

    if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
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
    const canManageMembers = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageMembers) {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekir." }, { status: 403 });
    }

    const { memberId } = await params;
    const member = await db.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: workspace.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    }

    if (member.userId === workspace.ownerId) {
      return NextResponse.json({ error: "Workspace sahibi rolü değiştirilemez." }, { status: 400 });
    }

    if (member.userId === session.user.id) {
      return NextResponse.json({ error: "Kendi rolünüzü bu panelden değiştiremezsiniz." }, { status: 400 });
    }

    const updatedMember = await db.workspaceMember.update({
      where: { id: member.id },
      data: { role: role as "ADMIN" | "MEMBER" | "VIEWER" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.member.role_updated",
        metadata: {
          memberId: member.id,
          targetUserId: member.userId,
          role,
        },
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (err) {
    console.error("[workspace/members/[memberId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
