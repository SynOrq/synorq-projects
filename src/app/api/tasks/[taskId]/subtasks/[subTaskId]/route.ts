import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskCardInclude } from "@/lib/task-detail";

const STATUS_VALUES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; subTaskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { taskId, subTaskId } = await params;
    const body = await req.json();
    const nextTitle = typeof body.title === "string" ? body.title.trim() : undefined;
    const nextStatus = typeof body.status === "string" ? body.status.toUpperCase() : undefined;

    if (nextTitle !== undefined && !nextTitle) {
      return NextResponse.json({ error: "Alt görev başlığı boş olamaz." }, { status: 400 });
    }

    if (nextStatus !== undefined && !STATUS_VALUES.includes(nextStatus as (typeof STATUS_VALUES)[number])) {
      return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
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
      return NextResponse.json({ error: "Ana görev bulunamadı." }, { status: 404 });
    }

    const existingSubTask = await db.task.findFirst({
      where: {
        id: subTaskId,
        parentId: taskId,
      },
    });

    if (!existingSubTask) {
      return NextResponse.json({ error: "Alt görev bulunamadı." }, { status: 404 });
    }

    const status = (nextStatus ?? existingSubTask.status) as typeof existingSubTask.status;
    const updatedSubTask = await db.task.update({
      where: { id: subTaskId },
      data: {
        title: nextTitle ?? existingSubTask.title,
        status,
        completedAt: status === "DONE" ? existingSubTask.completedAt ?? new Date() : null,
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
        action: "task.subtask.updated",
        metadata: {
          taskId,
          subTaskId,
          status,
        },
      },
    });

    return NextResponse.json({
      subTask: updatedSubTask,
      parentTask: updatedParent,
    });
  } catch (err) {
    console.error("[tasks/[taskId]/subtasks/[subTaskId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; subTaskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { taskId, subTaskId } = await params;
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
      return NextResponse.json({ error: "Ana görev bulunamadı." }, { status: 404 });
    }

    const existingSubTask = await db.task.findFirst({
      where: {
        id: subTaskId,
        parentId: taskId,
      },
      select: { id: true, title: true },
    });

    if (!existingSubTask) {
      return NextResponse.json({ error: "Alt görev bulunamadı." }, { status: 404 });
    }

    await db.task.delete({
      where: { id: subTaskId },
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
        action: "task.subtask.deleted",
        metadata: {
          taskId,
          subTaskId,
          title: existingSubTask.title,
        },
      },
    });

    return NextResponse.json({ parentTask: updatedParent });
  } catch (err) {
    console.error("[tasks/[taskId]/subtasks/[subTaskId]/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
