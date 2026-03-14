import test from "node:test";
import assert from "node:assert/strict";
import { buildAuditExportRows, filterAuditItems, serializeAuditRowsToCsv } from "../src/lib/audit.ts";

const now = new Date("2026-03-14T10:00:00.000Z");

const items = [
  {
    id: "audit_1",
    action: "task.updated",
    title: "Gorev guncellendi",
    detail: "Oncelik degisti.",
    meta: "Bugün • 14 Mar 2026",
    category: "task",
    severity: "warning",
    projectName: "Northstar",
    actorName: "Tarik",
    createdAt: "2026-03-14T08:00:00.000Z",
    changes: [{ field: "priority", label: "Oncelik", from: "MEDIUM", to: "HIGH" }],
  },
  {
    id: "audit_2",
    action: "workspace.member.invited",
    title: "Yeni ekip uyesi davet edildi",
    detail: "Aylin ekibe eklendi.",
    meta: "12 Mar 2026",
    category: "team",
    severity: "info",
    projectName: null,
    actorName: "Elif",
    createdAt: "2026-03-12T08:00:00.000Z",
    changes: [],
  },
] as const;

test("filterAuditItems applies actor, severity and date range filters", () => {
  const filtered = filterAuditItems(
    items as never,
    {
      scope: "all",
      severity: "warning",
      actor: "Tarik",
      range: "24h",
      query: "oncelik",
    },
    now
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "audit_1");
});

test("audit export rows include diff text and csv serialization", () => {
  const rows = buildAuditExportRows(items as never);
  const csv = serializeAuditRowsToCsv(rows);

  assert.match(rows[0]?.diff ?? "", /Oncelik: MEDIUM -> HIGH/);
  assert.match(csv, /createdAt,actor,category,severity/);
  assert.match(csv, /Tarik/);
});
