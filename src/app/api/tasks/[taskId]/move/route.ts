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
    const { sectionId, order } = await req.json();

    const task = await db.task.update({
      where: { id: taskId },
      data: { sectionId, order },
    });

    return NextResponse.json(task);
  } catch (err) {
    console.error("[tasks/move]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
