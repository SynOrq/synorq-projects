import test from "node:test";
import assert from "node:assert/strict";
import { buildReleaseHealthPayload } from "../src/lib/release-health.ts";

test("buildReleaseHealthPayload returns ok when critical checks pass", () => {
  const payload = buildReleaseHealthPayload({
    app: "synorq-projects",
    version: "1.0.0",
    databaseOk: true,
    envOk: true,
    timestamp: new Date("2026-03-15T12:00:00.000Z"),
  });

  assert.equal(payload.status, "ok");
  assert.equal(payload.checks.every((check) => check.ok), true);
  assert.equal(payload.timestamp, "2026-03-15T12:00:00.000Z");
});

test("buildReleaseHealthPayload returns degraded when any critical check fails", () => {
  const payload = buildReleaseHealthPayload({
    app: "synorq-projects",
    version: "1.0.0",
    databaseOk: false,
    envOk: true,
    timestamp: new Date("2026-03-15T12:00:00.000Z"),
  });

  assert.equal(payload.status, "degraded");
  assert.equal(payload.checks.find((check) => check.key === "database")?.detail, "Primary database baglantisi basarisiz.");
});
