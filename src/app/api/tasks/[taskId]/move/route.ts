import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskCardInclude } from "@/lib/task-detail";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }
    const userId = session.user.id;

    const { taskId } = await params;
    const { sectionId, order } = await req.json();

    if (typeof order !== "number" || order < 0) {
      return NextResponse.json({ error: "Geçersiz sıra bilgisi." }, { status: 400 });
    }

    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId: session.user.id } } } },
      },
      include: {
        project: { select: { id: true, workspaceId: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const destinationSection = sectionId
      ? await db.section.findFirst({
          where: { id: sectionId, projectId: existingTask.project.id },
          select: { id: true, name: true },
        })
      : null;

    if (sectionId && !destinationSection) {
      return NextResponse.json({ error: "Hedef kolon bulunamadı." }, { status: 404 });
    }

    const movedTask = await db.$transaction(async (tx) => {
      const sourceTasks = await tx.task.findMany({
        where: { sectionId: existingTask.sectionId },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      const destinationTasks =
        existingTask.sectionId === (sectionId ?? null)
          ? sourceTasks
          : await tx.task.findMany({
              where: { sectionId: sectionId ?? null },
              orderBy: { order: "asc" },
              select: { id: true },
            });

      const sourceIds = sourceTasks.map((task) => task.id).filter((id) => id !== taskId);
      const destinationIds =
        existingTask.sectionId === (sectionId ?? null)
          ? sourceIds
          : destinationTasks.map((task) => task.id).filter((id) => id !== taskId);

      const insertIndex = Math.min(order, destinationIds.length);
      destinationIds.splice(insertIndex, 0, taskId);

      if (existingTask.sectionId === (sectionId ?? null)) {
        await Promise.all(
          destinationIds.map((id, index) =>
            tx.task.update({
              where: { id },
              data: { order: index },
            })
          )
        );
      } else {
        await Promise.all(
          sourceIds.map((id, index) =>
            tx.task.update({
              where: { id },
              data: { order: index },
            })
          )
        );

        await Promise.all(
          destinationIds.map((id, index) =>
            tx.task.update({
              where: { id },
              data: id === taskId ? { sectionId: sectionId ?? null, order: index } : { order: index },
            })
          )
        );

        await tx.activityLog.create({
          data: {
            workspaceId: existingTask.project.workspaceId,
            projectId: existingTask.project.id,
            userId,
            action: "task.moved",
            metadata: {
              taskId,
              fromSectionName: existingTask.section?.name ?? null,
              toSectionName: destinationSection?.name ?? null,
            },
          },
        });
      }

      return tx.task.findUnique({
        where: { id: taskId },
        include: taskCardInclude,
      });
    });

    return NextResponse.json(movedTask);
  } catch (err) {
    console.error("[tasks/move]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
