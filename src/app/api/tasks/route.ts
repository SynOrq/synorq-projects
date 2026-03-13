import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { projectId, sectionId, title, creatorId } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: "Başlık zorunludur." }, { status: 400 });

    // Verify access
    const project = await db.project.findFirst({
      where: { id: projectId, workspace: { members: { some: { userId: session.user.id } } } },
    });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });

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
        creatorId: session.user.id,
        order: (lastTask?.order ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        creator:  { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[tasks/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
