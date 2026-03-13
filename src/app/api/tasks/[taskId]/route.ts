import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { taskId } = await params;
    const body = await req.json();

    const allowed = ["title", "description", "status", "priority", "assigneeId", "dueDate", "sectionId", "order"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const task = await db.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        creator:  { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task);
  } catch (err) {
    console.error("[tasks/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { taskId } = await params;
    await db.task.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tasks/DELETE]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
