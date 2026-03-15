import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildReleaseHealthPayload } from "@/lib/release-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const envOk = Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);

  let databaseOk = false;

  try {
    await db.$queryRawUnsafe("SELECT 1");
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  const payload = buildReleaseHealthPayload({
    app: "synorq-projects",
    version: process.env.npm_package_version ?? "0.1.0",
    databaseOk,
    envOk,
  });

  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
