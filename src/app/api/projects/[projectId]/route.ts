import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/project-access";
import { normalizeProjectUpdatePayload } from "@/lib/project-settings";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }
    const currentUserId = session.user.id;

    const { projectId } = await params;
    const body = await req.json();
    const parsed = normalizeProjectUpdatePayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: { members: { some: { userId: currentUserId } } },
      },
      include: {
        workspace: {
          include: {
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadi." }, { status: 404 });
    }

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
      return NextResponse.json({ error: "Proje owner bu workspace icinde olmali." }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await db.client.findFirst({
        where: {
          id: parsed.data.clientId,
          workspaceId: project.workspaceId,
        },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json({ error: "Secilen client bu workspace icinde bulunamadi." }, { status: 400 });
      }
    }

    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: parsed.data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        userId: currentUserId,
        action: "project.updated",
        metadata: {
          projectId: project.id,
          name: updatedProject.name,
          ownerId: updatedProject.ownerId,
          clientName: updatedProject.client?.name ?? null,
          type: updatedProject.type,
          visibility: updatedProject.visibility,
          priority: updatedProject.priority,
          status: updatedProject.status,
        },
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (err) {
    console.error("[projects/[projectId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
