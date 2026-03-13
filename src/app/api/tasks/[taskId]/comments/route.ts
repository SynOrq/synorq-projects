import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const { content } = await req.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Yorum boş olamaz." }, { status: 400 });
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

    const comment = await db.comment.create({
      data: {
        taskId,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: task.project.workspaceId,
        projectId: task.project.id,
        userId: session.user.id,
        action: "task.commented",
        metadata: {
          taskId,
          commentId: comment.id,
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[tasks/comments/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
