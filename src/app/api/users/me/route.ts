import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const body = await req.json();
    const name = normalizeText(body.name);
    const image = "image" in body ? normalizeUrl(body.image) : undefined;

    if (!name) {
      return NextResponse.json({ error: "Ad alanı zorunludur." }, { status: 400 });
    }

    if (image === undefined) {
      return NextResponse.json({ error: "Avatar URL gecersiz." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        ...(image !== undefined ? { image } : {}),
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
