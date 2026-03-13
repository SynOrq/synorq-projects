import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace bulunamadı." }, { status: 404 });

    const { name, description, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Proje adı zorunludur." }, { status: 400 });

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color ?? "#6366f1",
        sections: {
          create: [
            { name: "Yapılacak",    order: 0 },
            { name: "Devam Ediyor", order: 1 },
            { name: "İncelemede",   order: 2 },
            { name: "Tamamlandı",   order: 3 },
          ],
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[projects/POST]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
