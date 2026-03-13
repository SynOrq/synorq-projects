import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskCardInclude } from "@/lib/task-detail";

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
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Alt görev başlığı zorunludur." }, { status: 400 });
    }

    const parentTask = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { id: true, workspaceId: true } },
      },
    });

    if (!parentTask) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const lastSubTask = await db.task.findFirst({
      where: { parentId: taskId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const subTask = await db.task.create({
      data: {
        title,
        projectId: parentTask.projectId,
        sectionId: parentTask.sectionId,
        parentId: taskId,
        creatorId: session.user.id,
        order: (lastSubTask?.order ?? -1) + 1,
      },
      include: taskCardInclude,
    });

    const updatedParent = await db.task.findUnique({
      where: { id: taskId },
      include: taskCardInclude,
    });

    await db.activityLog.create({
      data: {
        workspaceId: parentTask.project.workspaceId,
        projectId: parentTask.project.id,
        userId: session.user.id,
        action: "task.subtask.created",
        metadata: {
          taskId,
          subTaskId: subTask.id,
          title: subTask.title,
        },
      },
    });

    return NextResponse.json({
      subTask,
      parentTask: updatedParent,
    }, { status: 201 });
  } catch (err) {
    console.error("[tasks/[taskId]/subtasks/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
