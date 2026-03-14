import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.toUpperCase() : "";

    if (!email) {
      return NextResponse.json({ error: "E-posta zorunludur." }, { status: 400 });
    }

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

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." }, { status: 404 });
    }

    const existingMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "Bu kullanıcı zaten workspace üyesi." }, { status: 409 });
    }

    const member = await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: role as "ADMIN" | "MEMBER" | "VIEWER",
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "workspace.member.invited",
        metadata: {
          invitedUserId: user.id,
          invitedEmail: user.email,
          targetUserId: user.id,
          targetUserEmail: user.email,
          targetUserName: user.name,
          role,
        },
      },
    });

    return NextResponse.json({
      member,
      message: "Kullanıcı workspace'e eklendi.",
    });
  } catch (err) {
    console.error("[workspace/members/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
