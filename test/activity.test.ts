import test from "node:test";
import assert from "node:assert/strict";
import {
  getActivityCategory,
  getActivityDetail,
  getActivitySeverity,
  shouldSurfaceAsActionRequired,
} from "../src/lib/activity.ts";

test("activity category resolves workspace team and file actions", () => {
  assert.equal(getActivityCategory("workspace.member.invited"), "team");
  assert.equal(getActivityCategory("workspace.updated"), "workspace");
  assert.equal(getActivityCategory("export.created"), "workspace");
  assert.equal(getActivityCategory("risk.created"), "project");
  assert.equal(getActivityCategory("task.attachment.created"), "file");
  assert.equal(getActivityCategory("task.updated"), "task");
});

test("activity severity escalates critical task changes", () => {
  assert.equal(
    getActivitySeverity("task.due_date_changed", {
      changes: [{ field: "dueDate", label: "Due date", from: null, to: "2025-01-01T00:00:00.000Z" }],
    }),
    "critical"
  );
  assert.equal(getActivitySeverity("task.deleted", null), "critical");
  assert.equal(getActivitySeverity("workspace.preference_changed", null), "info");
  assert.equal(getActivitySeverity("export.created", null), "info");
});

test("action required picks up mentions and critical events", () => {
  assert.equal(
    shouldSurfaceAsActionRequired("task.updated", { targetUserId: "user_1" }, "user_1"),
    true
  );
  assert.equal(shouldSurfaceAsActionRequired("risk.created", null, "user_1"), true);
  assert.equal(shouldSurfaceAsActionRequired("task.deleted", null, "user_1"), true);
  assert.equal(shouldSurfaceAsActionRequired("project.created", null, "user_1"), false);
});

test("activity detail renders update context", () => {
  const detail = getActivityDetail({
    action: "task.updated",
    metadata: {
      changes: [{ field: "priority", label: "Oncelik", from: "MEDIUM", to: "HIGH" }],
    },
    actorName: "Tarik",
    projectName: "Ops Console",
  });

  assert.match(detail, /Oncelik: MEDIUM -> HIGH/);
});

test("activity detail renders export action", () => {
  const detail = getActivityDetail({
    action: "export.created",
    metadata: null,
    actorName: "Tarik",
    projectName: null,
  });

  assert.match(detail, /disa aktardi/);
});
