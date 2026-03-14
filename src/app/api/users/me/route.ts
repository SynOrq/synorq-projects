import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeProfilePayload } from "@/lib/settings";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeProfilePayload(body);
    if ("error" in payload) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }
    const data = payload.data;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        image: data.image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[users/me/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
