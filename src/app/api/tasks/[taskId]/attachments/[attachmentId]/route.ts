import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; attachmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { taskId, attachmentId } = await params;
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

    const attachment = await db.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Ek dosya bulunamadı." }, { status: 404 });
    }

    await db.attachment.delete({
      where: { id: attachment.id },
    });

    await db.activityLog.create({
      data: {
        workspaceId: task.project.workspaceId,
        projectId: task.project.id,
        userId: session.user.id,
        action: "task.attachment.deleted",
        metadata: {
          taskId,
          attachmentId,
          name: attachment.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tasks/[taskId]/attachments/[attachmentId]/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
