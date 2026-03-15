import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/project-access";
import { normalizeRiskPayload } from "@/lib/project-delivery";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    const currentUserId = session.user.id;

    const { projectId } = await params;
    const body = await req.json();
    const parsed = normalizeRiskPayload(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const project = await db.project.findFirst({
      where: { id: projectId, workspace: { members: { some: { userId: currentUserId } } } },
      include: {
        workspace: { include: { members: { select: { userId: true, role: true } } } },
        tasks: { select: { id: true } },
      },
    });

    if (!project) return NextResponse.json({ error: "Proje bulunamadi." }, { status: 404 });

    const currentMembership = project.workspace.members.find((member) => member.userId === currentUserId);
    if (
      !currentMembership ||
      !canAccessProject({
        visibility: project.visibility,
        workspaceRole: currentMembership.role,
        isWorkspaceOwner: project.workspace.ownerId === currentUserId,
        isProjectOwner: project.ownerId === currentUserId,
      })
    ) {
      return NextResponse.json({ error: "Bu proje gorunurluk politikasiyla size acik degil." }, { status: 403 });
    }

    const workspaceMemberIds = new Set(project.workspace.members.map((member) => member.userId));
    if (parsed.data.ownerId && !workspaceMemberIds.has(parsed.data.ownerId)) {
      return NextResponse.json({ error: "Risk owner bu workspace icinde olmali." }, { status: 400 });
    }

    if (parsed.data.taskId && !project.tasks.some((task) => task.id === parsed.data.taskId)) {
      return NextResponse.json({ error: "Secilen gorev risk ile ayni projede olmali." }, { status: 400 });
    }

    const risk = await db.risk.create({
      data: {
        projectId,
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
        workspaceId: project.workspaceId,
        projectId,
        userId: currentUserId,
        action: "risk.created",
        metadata: { title: risk.title },
      },
    });

    return NextResponse.json({ risk }, { status: 201 });
  } catch (err) {
    console.error("[projects/[projectId]/risks/POST]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
