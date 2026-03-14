import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTeamCapacity } from "../src/lib/team-capacity.ts";

const now = new Date("2026-03-14T10:00:00.000Z");

test("analyzeTeamCapacity computes utilization, load state and heatmap", () => {
  const result = analyzeTeamCapacity(
    [
      {
        id: "user_1",
        name: "Tarik",
        email: "tarik@synorq.com",
        image: null,
        role: "ADMIN",
        isOwner: true,
      },
      {
        id: "user_2",
        name: "Elif",
        email: "elif@synorq.com",
        image: null,
        role: "MEMBER",
      },
    ],
    [
      {
        id: "task_1",
        title: "Launch checklist",
        status: "IN_PROGRESS",
        priority: "URGENT",
        dueDate: new Date("2026-03-14T00:00:00.000Z"),
        completedAt: null,
        assigneeId: "user_1",
        estimatedH: 12,
        loggedH: 4,
        labels: ["Blocked"],
        project: { id: "project_1", name: "Northstar", color: "#2563eb" },
      },
      {
        id: "task_2",
        title: "Client review deck",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date("2026-03-16T00:00:00.000Z"),
        completedAt: null,
        assigneeId: "user_1",
        estimatedH: 10,
        loggedH: 0,
        labels: [],
        project: { id: "project_1", name: "Northstar", color: "#2563eb" },
      },
      {
        id: "task_3",
        title: "QA summary",
        status: "DONE",
        priority: "MEDIUM",
        dueDate: new Date("2026-03-13T00:00:00.000Z"),
        completedAt: new Date("2026-03-13T12:00:00.000Z"),
        assigneeId: "user_2",
        estimatedH: 5,
        loggedH: 5,
        labels: [],
        project: { id: "project_2", name: "Atlas", color: "#0f766e" },
      },
    ],
    now
  );

  assert.equal(result.snapshots[0]?.id, "user_1");
  assert.equal(result.snapshots[0]?.projectedHours, 22);
  assert.equal(result.snapshots[0]?.utilization, 73);
  assert.equal(result.snapshots[0]?.loadState, "watch");
  assert.equal(result.summary.dueThisWeekTasks, 2);
  assert.equal(result.summary.weeklyCapacityHours, 64);
  assert.equal(result.heatmap.days.length, 7);
  assert.equal(result.heatmap.rows.find((row) => row.memberId === "user_1")?.values[0], 1);
  assert.equal(result.heatmap.rows.find((row) => row.memberId === "user_1")?.values[2], 1);
});
