import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeMilestonePayload } from "@/lib/project-delivery";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId } = await params;
    const body = await req.json();
    const parsed = normalizeMilestonePayload(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const project = await db.project.findFirst({
      where: { id: projectId, workspace: { members: { some: { userId: session.user.id } } } },
      include: {
        workspace: { include: { members: { select: { userId: true } } } },
        tasks: { select: { id: true } },
      },
    });

    if (!project) return NextResponse.json({ error: "Proje bulunamadi." }, { status: 404 });

    const workspaceMemberIds = new Set(project.workspace.members.map((member) => member.userId));
    if (parsed.data.ownerId && !workspaceMemberIds.has(parsed.data.ownerId)) {
      return NextResponse.json({ error: "Milestone owner bu workspace icinde olmali." }, { status: 400 });
    }

    const projectTaskIds = new Set(project.tasks.map((task) => task.id));
    const invalidTaskId = parsed.data.taskIds.find((taskId) => !projectTaskIds.has(taskId));
    if (invalidTaskId) {
      return NextResponse.json({ error: "Secilen gorev milestone ile ayni projede olmali." }, { status: 400 });
    }

    const milestone = await db.milestone.create({
      data: {
        projectId,
        ownerId: parsed.data.ownerId,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        dueDate: parsed.data.dueDate,
      },
    });

    if (parsed.data.taskIds.length > 0) {
      await db.task.updateMany({
        where: { id: { in: parsed.data.taskIds }, projectId },
        data: { milestoneId: milestone.id },
      });
    }

    await db.activityLog.create({
      data: {
        workspaceId: project.workspaceId,
        projectId,
        userId: session.user.id,
        action: "milestone.created",
        metadata: { title: milestone.title },
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (err) {
    console.error("[projects/[projectId]/milestones/POST]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
