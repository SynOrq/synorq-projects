import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, workspaceName } = await req.json();

    if (!name || !email || !password || !workspaceName) {
      return NextResponse.json({ error: "Tüm alanlar zorunludur." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Şifre en az 8 karakter olmalıdır." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hash,
        role: "OWNER",
      },
    });

    // Workspace oluştur
    const slug = slugify(workspaceName) + "-" + Math.random().toString(36).slice(2, 6);
    const workspace = await db.workspace.create({
      data: {
        name: workspaceName,
        slug,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "ADMIN" },
        },
      },
    });

    // Örnek proje oluştur
    await db.project.create({
      data: {
        workspaceId: workspace.id,
        ownerId: user.id,
        name: "İlk Projem",
        description: "Synorq Projects'e hoş geldiniz! Bu örnek projeyi keşfedin.",
        color: "#6366f1",
        type: "INTERNAL",
        priority: "MEDIUM",
        tags: ["onboarding", "starter"],
        sections: {
          create: [
            { name: "Yapılacak",     order: 0 },
            { name: "Devam Ediyor",  order: 1 },
            { name: "İncelemede",    order: 2 },
            { name: "Tamamlandı",    order: 3 },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
