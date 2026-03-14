import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceTimeline } from "../src/lib/workspace-timeline.ts";

test("buildWorkspaceTimeline groups overdue, this week and later delivery items", () => {
  const timeline = buildWorkspaceTimeline(
    [
      {
        id: "milestone_1",
        title: "Launch rehearsal",
        status: "AT_RISK",
        dueDate: new Date("2026-03-13T00:00:00.000Z"),
        projectId: "project_1",
        projectName: "Northstar",
        projectColor: "#2563eb",
        ownerName: "Aylin",
        taskCount: 4,
        completedTaskCount: 2,
      },
      {
        id: "milestone_2",
        title: "Client handoff",
        status: "PLANNED",
        dueDate: new Date("2026-03-21T00:00:00.000Z"),
        projectId: "project_2",
        projectName: "Helix",
        projectColor: "#0f766e",
        ownerName: "Tarik",
        taskCount: 0,
        completedTaskCount: 0,
      },
    ],
    [
      {
        id: "task_1",
        title: "Fix QA blockers",
        status: "IN_PROGRESS",
        dueDate: new Date("2026-03-15T00:00:00.000Z"),
        priority: "URGENT",
        labels: ["Blocked"],
        projectId: "project_1",
        projectName: "Northstar",
        projectColor: "#2563eb",
        assigneeName: "Aylin",
      },
      {
        id: "task_2",
        title: "Publish recap",
        status: "TODO",
        dueDate: new Date("2026-03-24T00:00:00.000Z"),
        priority: "MEDIUM",
        labels: [],
        projectId: "project_2",
        projectName: "Helix",
        projectColor: "#0f766e",
        assigneeName: "Tarik",
      },
    ],
    new Date("2026-03-14T10:00:00.000Z")
  );

  assert.equal(timeline.summary.overdueCount, 1);
  assert.equal(timeline.summary.dueThisWeekCount, 1);
  assert.equal(timeline.buckets.later.length, 2);
  assert.equal(timeline.featuredMilestones[0]?.tone, "risk");
  assert.equal(timeline.busiestDay?.count, 1);
});
