import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace bulunamadi." }, { status: 404 });
    }

    const body = await req.json();
    const format = body?.format === "json" ? "json" : "csv";
    const rowCount = typeof body?.rowCount === "number" && Number.isFinite(body.rowCount) ? body.rowCount : 0;
    const scope = typeof body?.scope === "string" ? body.scope : "all";
    const severity = typeof body?.severity === "string" ? body.severity : "all";
    const range = typeof body?.range === "string" ? body.range : "all";

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "export.created",
        metadata: {
          format,
          rowCount,
          scope,
          severity,
          range,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[audit/export/POST]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
