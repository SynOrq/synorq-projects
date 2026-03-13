import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

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

    const body = await req.json();
    const name = normalizeText(body.name);
    const description = "description" in body ? normalizeText(body.description) : workspace.description;
    const logoUrl = "logoUrl" in body ? normalizeUrl(body.logoUrl) : workspace.logoUrl;

    if (!name) {
      return NextResponse.json({ error: "Workspace adı zorunludur." }, { status: 400 });
    }

    if (logoUrl === undefined) {
      return NextResponse.json({ error: "Logo URL gecersiz." }, { status: 400 });
    }

    const updatedWorkspace = await db.workspace.update({
      where: { id: workspace.id },
      data: {
        name,
        description,
        logoUrl,
      },
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
