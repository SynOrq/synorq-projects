import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProjectUpdatePayload } from "../src/lib/project-settings.ts";

test("normalizeProjectUpdatePayload parses valid project settings payload", () => {
  const result = normalizeProjectUpdatePayload({
    name: " Website refresh ",
    description: " Delivery cleanup ",
    color: "#0f172a",
    status: "active",
    type: "website",
    priority: "high",
    ownerId: "user_1",
    clientId: "client_1",
    startDate: "2026-03-14",
    dueDate: "2026-03-30",
    tags: [" launch ", "", 1],
  });

  assert.ok("data" in result);
  if (!("data" in result)) return;

  assert.equal(result.data.name, "Website refresh");
  assert.equal(result.data.description, "Delivery cleanup");
  assert.equal(result.data.status, "ACTIVE");
  assert.equal(result.data.type, "WEBSITE");
  assert.equal(result.data.priority, "HIGH");
  assert.equal(result.data.ownerId, "user_1");
  assert.equal(result.data.clientId, "client_1");
  assert.deepEqual(result.data.tags, ["launch"]);
});

test("normalizeProjectUpdatePayload rejects invalid enum and date values", () => {
  assert.equal(normalizeProjectUpdatePayload({ name: "Test", status: "broken" }).error, "Gecersiz proje durumu.");
  assert.equal(normalizeProjectUpdatePayload({ name: "Test", type: "broken" }).error, "Gecersiz proje tipi.");
  assert.equal(normalizeProjectUpdatePayload({ name: "Test", priority: "broken" }).error, "Gecersiz proje onceligi.");
  assert.equal(normalizeProjectUpdatePayload({ name: "Test", startDate: "broken-date" }).error, "Gecersiz baslangic tarihi.");
  assert.equal(normalizeProjectUpdatePayload({ name: "Test", dueDate: "broken-date" }).error, "Gecersiz hedef teslim tarihi.");
});
