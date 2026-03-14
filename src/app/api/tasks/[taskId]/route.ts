import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  taskActivityInclude,
  taskCardInclude,
  taskDetailInclude,
  type TaskActivityChange,
  type TaskActivityMetadata,
} from "@/lib/task-detail";

const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] as const;
const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const CHANGE_LABELS: Record<string, string> = {
  title: "Başlık",
  description: "Açıklama",
  status: "Durum",
  priority: "Öncelik",
  assigneeId: "Atanan",
  dueDate: "Bitiş tarihi",
};

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function readMetadata(value: unknown): TaskActivityMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as TaskActivityMetadata;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringifyValue(field: string, value: string | null, assigneeName: string | null) {
  if (!value) {
    return null;
  }

  if (field === "assigneeId") {
    return assigneeName;
  }

  if (field === "dueDate") {
    return value.slice(0, 10);
  }

  return value;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const { taskId } = await params;
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: taskDetailInclude,
    });

    if (!task) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const activity = await db.activityLog.findMany({
      where: { projectId: task.projectId },
      include: taskActivityInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const taskActivity = activity
      .filter((entry) => readMetadata(entry.metadata)?.taskId === taskId)
      .slice(0, 20);

    return NextResponse.json({
      ...task,
      activity: taskActivity,
    });
  } catch (err) {
    console.error("[tasks/GET]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }
    const currentUserId = session.user.id;

    const { taskId } = await params;
    const body = await req.json();

    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { id: true, workspaceId: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const nextTitle = "title" in body ? normalizeText(body.title) : existingTask.title;
    if (!nextTitle) {
      return NextResponse.json({ error: "Başlık zorunludur." }, { status: 400 });
    }

    if ("status" in body && !TASK_STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
    }

    if ("priority" in body && !PRIORITY_VALUES.includes(body.priority)) {
      return NextResponse.json({ error: "Geçersiz öncelik." }, { status: 400 });
    }

    let nextDueDate: Date | null | undefined;
    if ("dueDate" in body) {
      if (!body.dueDate) {
        nextDueDate = null;
      } else if (typeof body.dueDate === "string" && isValidDate(body.dueDate)) {
        nextDueDate = new Date(body.dueDate);
      } else {
        return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
      }
    }

    let nextAssigneeId: string | null | undefined;
    let nextAssigneeName: string | null = existingTask.assignee?.name ?? existingTask.assignee?.email ?? null;

    if ("assigneeId" in body) {
      if (!body.assigneeId) {
        nextAssigneeId = null;
        nextAssigneeName = null;
      } else if (typeof body.assigneeId === "string") {
        const member = await db.workspaceMember.findFirst({
          where: {
            workspaceId: existingTask.project.workspaceId,
            userId: body.assigneeId,
          },
          include: {
            user: { select: { name: true, email: true } },
          },
        });

        if (!member) {
          return NextResponse.json({ error: "Atanan kullanıcı workspace üyesi değil." }, { status: 400 });
        }

        nextAssigneeId = body.assigneeId;
        nextAssigneeName = member.user.name ?? member.user.email;
      } else {
        return NextResponse.json({ error: "Geçersiz atanan değeri." }, { status: 400 });
      }
    }

    const nextStatus = ("status" in body ? body.status : existingTask.status) as typeof existingTask.status;
    const updateData = {
      title: nextTitle,
      description: "description" in body ? normalizeText(body.description) : existingTask.description,
      status: nextStatus,
      priority: ("priority" in body ? body.priority : existingTask.priority) as typeof existingTask.priority,
      assigneeId: "assigneeId" in body ? (nextAssigneeId ?? null) : existingTask.assigneeId,
      dueDate: "dueDate" in body ? (nextDueDate ?? null) : existingTask.dueDate,
      completedAt: nextStatus === "DONE" ? existingTask.completedAt ?? new Date() : null,
    };

    const changes: TaskActivityChange[] = [];

    const fromValues: Record<string, string | null> = {
      title: existingTask.title,
      description: existingTask.description,
      status: existingTask.status,
      priority: existingTask.priority,
      assigneeId: existingTask.assigneeId,
      dueDate: existingTask.dueDate ? existingTask.dueDate.toISOString() : null,
    };

    const toValues: Record<string, string | null> = {
      title: updateData.title,
      description: updateData.description,
      status: updateData.status,
      priority: updateData.priority,
      assigneeId: updateData.assigneeId,
      dueDate: updateData.dueDate ? updateData.dueDate.toISOString() : null,
    };

    for (const field of Object.keys(CHANGE_LABELS)) {
      if (fromValues[field] !== toValues[field]) {
        changes.push({
          field,
          label: CHANGE_LABELS[field],
          from: stringifyValue(field, fromValues[field], existingTask.assignee?.name ?? existingTask.assignee?.email ?? null),
          to: stringifyValue(field, toValues[field], nextAssigneeName),
        });
      }
    }

    const task = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: taskCardInclude,
    });

    const specialChanges = new Set(changes.map((change) => change.field));
    const activityPayloads: Array<{
      action: string;
      metadata: TaskActivityMetadata;
    }> = [];

    if (specialChanges.has("assigneeId")) {
      activityPayloads.push({
        action: "task.assignee_changed",
        metadata: {
          taskId,
          targetUserId: updateData.assigneeId,
          targetUserName: nextAssigneeName,
          changes: changes.filter((change) => change.field === "assigneeId"),
        },
      });
    }

    if (specialChanges.has("dueDate")) {
      activityPayloads.push({
        action: "task.due_date_changed",
        metadata: {
          taskId,
          changes: changes.filter((change) => change.field === "dueDate"),
        },
      });
    }

    const genericChanges = changes.filter((change) => !["assigneeId", "dueDate"].includes(change.field));
    if (genericChanges.length > 0) {
      activityPayloads.push({
        action: "task.updated",
        metadata: {
          taskId,
          changes: genericChanges,
        },
      });
    }

    if (activityPayloads.length > 0) {
      await Promise.all(activityPayloads.map((entry) =>
        db.activityLog.create({
        data: {
          workspaceId: existingTask.project.workspaceId,
          projectId: existingTask.project.id,
          userId: currentUserId,
          action: entry.action,
          metadata: entry.metadata,
        },
      })));
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("[tasks/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }
    const currentUserId = session.user.id;

    const { taskId } = await params;
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    await db.task.delete({ where: { id: taskId } });
    await db.activityLog.create({
      data: {
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        userId: currentUserId,
        action: "task.deleted",
        metadata: {
          taskId: task.id,
          title: task.title,
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tasks/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
