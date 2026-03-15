import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/project-access";
import { taskCardInclude } from "@/lib/task-detail";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    const currentUserId = session.user.id;

    const { projectId, sectionId, title } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: "Başlık zorunludur." }, { status: 400 });

    // Verify access
    const project = await db.project.findFirst({
      where: { id: projectId, workspace: { members: { some: { userId: currentUserId } } } },
      include: {
        workspace: {
          select: {
            ownerId: true,
            members: {
              where: { userId: currentUserId },
              select: { role: true },
            },
          },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });

    const currentMembership = project.workspace.members[0];
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

    const lastTask = await db.task.findFirst({
      where: { sectionId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const task = await db.task.create({
      data: {
        projectId,
        sectionId: sectionId ?? null,
        title: title.trim(),
        creatorId: currentUserId,
        order: (lastTask?.order ?? -1) + 1,
      },
      include: taskCardInclude,
    });

    await db.activityLog.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        userId: currentUserId,
        action: "task.created",
        metadata: {
          taskId: task.id,
          toSectionName: null,
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[tasks/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
