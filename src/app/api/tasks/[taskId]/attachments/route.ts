import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Dosya adı zorunludur." }, { status: 400 });
    }

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: "Geçerli bir bağlantı girin." }, { status: 400 });
    }

    const task = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { id: true, workspaceId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const attachment = await db.attachment.create({
      data: {
        taskId,
        name,
        url,
        mimeType: typeof body.mimeType === "string" ? body.mimeType.trim() || null : null,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: task.project.workspaceId,
        projectId: task.project.id,
        userId: session.user.id,
        action: "task.attachment.created",
        metadata: {
          taskId,
          attachmentId: attachment.id,
          name: attachment.name,
        },
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    console.error("[tasks/[taskId]/attachments/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
