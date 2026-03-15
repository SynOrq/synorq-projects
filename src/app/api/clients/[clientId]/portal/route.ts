import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeClientPortalPayload } from "@/lib/client-portal";
import { db } from "@/lib/db";

function createShareToken() {
  return randomBytes(18).toString("hex");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const { clientId } = await params;
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        workspace: { members: { some: { userId: session.user.id } } },
      },
      include: {
        portal: true,
        workspace: {
          select: {
            id: true,
            ownerId: true,
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client bulunamadi." }, { status: 404 });
    }

    const currentRole = client.workspace.members[0]?.role;
    const canManagePortal = client.workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManagePortal) {
      return NextResponse.json({ error: "Portal ayarlari icin admin veya owner erisimi gerekir." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = normalizeClientPortalPayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const nextIsPublished = parsed.data.isPublished ?? client.portal?.isPublished ?? false;
    const token = parsed.data.regenerateToken || !client.portal?.shareToken ? createShareToken() : client.portal.shareToken;
    const nextPublishedAt = nextIsPublished ? client.portal?.publishedAt ?? new Date() : null;
    const hasWelcomeTitle = Object.prototype.hasOwnProperty.call(parsed.data, "welcomeTitle");
    const hasWelcomeMessage = Object.prototype.hasOwnProperty.call(parsed.data, "welcomeMessage");
    const hasAccentColor = Object.prototype.hasOwnProperty.call(parsed.data, "accentColor");
    const welcomeTitle = hasWelcomeTitle
      ? parsed.data.welcomeTitle
      : client.portal?.welcomeTitle ?? `${client.name} delivery portal`;
    const welcomeMessage = hasWelcomeMessage
      ? parsed.data.welcomeMessage
      : client.portal?.welcomeMessage ?? "Bu read-only yuzey aktif proje, teslim ve risk sinyallerini tek akista toplar.";
    const accentColor = hasAccentColor ? parsed.data.accentColor ?? "#0f172a" : client.portal?.accentColor ?? "#0f172a";

    const portal = await db.clientPortal.upsert({
      where: { clientId: client.id },
      update: {
        isPublished: nextIsPublished,
        welcomeTitle,
        welcomeMessage,
        accentColor,
        shareToken: token,
        publishedAt: nextPublishedAt,
      },
      create: {
        clientId: client.id,
        isPublished: nextIsPublished,
        welcomeTitle,
        welcomeMessage,
        accentColor,
        shareToken: token,
        publishedAt: nextIsPublished ? new Date() : null,
      },
      select: {
        id: true,
        isPublished: true,
        shareToken: true,
        welcomeTitle: true,
        welcomeMessage: true,
        accentColor: true,
        publishedAt: true,
      },
    });

    const action =
      parsed.data.regenerateToken
        ? "client.portal_token_regenerated"
        : portal.isPublished && !client.portal?.isPublished
          ? "client.portal_published"
          : !portal.isPublished && client.portal?.isPublished
            ? "client.portal_unpublished"
            : "client.portal_updated";

    await db.activityLog.create({
      data: {
        workspaceId: client.workspace.id,
        userId: session.user.id,
        action,
        metadata: {
          clientName: client.name,
          title: portal.welcomeTitle,
          status: portal.isPublished ? "published" : "draft",
        },
      },
    });

    return NextResponse.json({
      portal: {
        ...portal,
        sharePath: `/portal/${portal.shareToken}`,
      },
      message: portal.isPublished ? "Client portal yayinlandi." : "Client portal taslagi kaydedildi.",
    });
  } catch (error) {
    console.error("[clients/[clientId]/portal/PATCH]", error);
    return NextResponse.json({ error: "Client portal guncellenemedi." }, { status: 500 });
  }
}
