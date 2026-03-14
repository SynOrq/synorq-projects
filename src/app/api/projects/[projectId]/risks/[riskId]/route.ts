import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeRiskPayload } from "@/lib/project-delivery";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; riskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId, riskId } = await params;
    const body = await req.json();
    const parsed = normalizeRiskPayload(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const risk = await db.risk.findFirst({
      where: {
        id: riskId,
        projectId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: {
          include: {
            workspace: { include: { members: { select: { userId: true } } } },
            tasks: { select: { id: true } },
          },
        },
      },
    });

    if (!risk) return NextResponse.json({ error: "Risk bulunamadi." }, { status: 404 });

    const workspaceMemberIds = new Set(risk.project.workspace.members.map((member) => member.userId));
    if (parsed.data.ownerId && !workspaceMemberIds.has(parsed.data.ownerId)) {
      return NextResponse.json({ error: "Risk owner bu workspace icinde olmali." }, { status: 400 });
    }

    if (parsed.data.taskId && !risk.project.tasks.some((task) => task.id === parsed.data.taskId)) {
      return NextResponse.json({ error: "Secilen gorev risk ile ayni projede olmali." }, { status: 400 });
    }

    const updatedRisk = await db.risk.update({
      where: { id: riskId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        impact: parsed.data.impact,
        likelihood: parsed.data.likelihood,
        mitigationPlan: parsed.data.mitigationPlan,
        dueDate: parsed.data.dueDate,
        ownerId: parsed.data.ownerId,
        taskId: parsed.data.taskId,
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: risk.project.workspaceId,
        projectId,
        userId: session.user.id,
        action: "risk.updated",
        metadata: { title: updatedRisk.title },
      },
    });

    return NextResponse.json({ risk: updatedRisk });
  } catch (err) {
    console.error("[projects/[projectId]/risks/[riskId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; riskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId, riskId } = await params;
    const risk = await db.risk.findFirst({
      where: {
        id: riskId,
        projectId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { workspaceId: true } },
      },
    });

    if (!risk) return NextResponse.json({ error: "Risk bulunamadi." }, { status: 404 });

    await db.risk.delete({ where: { id: riskId } });
    await db.activityLog.create({
      data: {
        workspaceId: risk.project.workspaceId,
        projectId,
        userId: session.user.id,
        action: "risk.deleted",
        metadata: { title: risk.title },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[projects/[projectId]/risks/[riskId]/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
