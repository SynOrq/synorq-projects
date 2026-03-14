import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeMilestonePayload } from "@/lib/project-delivery";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId, milestoneId } = await params;
    const body = await req.json();
    const parsed = normalizeMilestonePayload(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const milestone = await db.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: {
          include: {
            workspace: { include: { members: { select: { userId: true } } } },
            tasks: { select: { id: true, milestoneId: true } },
          },
        },
      },
    });

    if (!milestone) return NextResponse.json({ error: "Milestone bulunamadi." }, { status: 404 });

    const workspaceMemberIds = new Set(milestone.project.workspace.members.map((member) => member.userId));
    if (parsed.data.ownerId && !workspaceMemberIds.has(parsed.data.ownerId)) {
      return NextResponse.json({ error: "Milestone owner bu workspace icinde olmali." }, { status: 400 });
    }

    const projectTaskIds = new Set(milestone.project.tasks.map((task) => task.id));
    const invalidTaskId = parsed.data.taskIds.find((taskId) => !projectTaskIds.has(taskId));
    if (invalidTaskId) {
      return NextResponse.json({ error: "Secilen gorev milestone ile ayni projede olmali." }, { status: 400 });
    }

    const updatedMilestone = await db.milestone.update({
      where: { id: milestoneId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        dueDate: parsed.data.dueDate,
        ownerId: parsed.data.ownerId,
      },
    });

    await db.task.updateMany({
      where: { projectId, milestoneId, id: { notIn: parsed.data.taskIds } },
      data: { milestoneId: null },
    });

    if (parsed.data.taskIds.length > 0) {
      await db.task.updateMany({
        where: { projectId, id: { in: parsed.data.taskIds } },
        data: { milestoneId },
      });
    }

    await db.activityLog.create({
      data: {
        workspaceId: milestone.project.workspaceId,
        projectId,
        userId: session.user.id,
        action: "milestone.updated",
        metadata: { title: updatedMilestone.title },
      },
    });

    return NextResponse.json({ milestone: updatedMilestone });
  } catch (err) {
    console.error("[projects/[projectId]/milestones/[milestoneId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId, milestoneId } = await params;
    const milestone = await db.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { workspaceId: true } },
      },
    });

    if (!milestone) return NextResponse.json({ error: "Milestone bulunamadi." }, { status: 404 });

    await db.task.updateMany({
      where: { projectId, milestoneId },
      data: { milestoneId: null },
    });

    await db.milestone.delete({ where: { id: milestoneId } });
    await db.activityLog.create({
      data: {
        workspaceId: milestone.project.workspaceId,
        projectId,
        userId: session.user.id,
        action: "milestone.deleted",
        metadata: { title: milestone.title },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[projects/[projectId]/milestones/[milestoneId]/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
