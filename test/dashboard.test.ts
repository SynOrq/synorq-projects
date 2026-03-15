import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientRiskVisibility,
  buildQuickActions,
  buildRecentBlockers,
  buildUpcomingDeadlines,
  buildWeeklyCompletionTrend,
  countOverloadedMembers,
} from "../src/lib/dashboard.ts";

const now = new Date("2026-03-14T10:00:00.000Z");

test("dashboard helpers derive timelines, blockers and client visibility", () => {
  const projects = [
    {
      id: "project_1",
      name: "Northstar",
      description: null,
      color: "#2563eb",
      status: "ACTIVE",
      type: "WEBSITE",
      priority: "HIGH",
      tags: [],
      startDate: null,
      dueDate: new Date("2026-03-16T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      owner: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
      client: { id: "client_1", name: "Northstar", health: "WATCH" },
      tasks: [],
      milestones: [],
      risks: [],
      totalTasks: 4,
      completedTasks: 1,
      openTasks: 3,
      overdueTasks: 1,
      dueThisWeekTasks: 2,
      unassignedTasks: 1,
      completionRate: 25,
      activeAssignees: 2,
      health: { key: "risk", label: "Riskli", tone: "", score: 44 },
      dueDateResolved: new Date("2026-03-16T00:00:00.000Z"),
      dueInDays: 2,
      lastActivityAt: new Date("2026-03-13T00:00:00.000Z"),
      openMilestones: 1,
      completedMilestones: 0,
      milestoneCompletionRate: 0,
      nextMilestone: { id: "m1", title: "Launch", status: "AT_RISK", dueDate: new Date("2026-03-16T00:00:00.000Z") },
      openRisks: 2,
      criticalRisks: 1,
    },
  ];

  const tasks = [
    {
      id: "task_1",
      title: "Fix launch blockers",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-03-15T00:00:00.000Z"),
      completedAt: null,
      assigneeId: "user_1",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      priority: "URGENT",
      labels: ["Blocked"],
      projectId: "project_1",
      projectName: "Northstar",
      projectColor: "#2563eb",
      projectDueDate: new Date("2026-03-16T00:00:00.000Z"),
      assignee: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
      health: { key: "risk", label: "Riskli", score: 44 },
    },
    {
      id: "task_2",
      title: "Ship review deck",
      status: "DONE",
      dueDate: new Date("2026-03-13T00:00:00.000Z"),
      completedAt: new Date("2026-03-13T00:00:00.000Z"),
      assigneeId: "user_1",
      createdAt: new Date("2026-03-11T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      priority: "HIGH",
      labels: [],
      projectId: "project_1",
      projectName: "Northstar",
      projectColor: "#2563eb",
      projectDueDate: new Date("2026-03-16T00:00:00.000Z"),
      assignee: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
      health: { key: "risk", label: "Riskli", score: 44 },
    },
  ];

  const trend = buildWeeklyCompletionTrend(tasks, now);
  const deadlines = buildUpcomingDeadlines(projects as never, tasks as never, now);
  const blockers = buildRecentBlockers(projects as never, tasks as never, now);
  const clients = buildClientRiskVisibility(projects as never);
  const quickActions = buildQuickActions({
    riskProjects: 1,
    unassignedTasks: 1,
    dueThisWeekProjects: 1,
    overloadedMembers: 1,
  });

  assert.equal(trend.length, 7);
  assert.equal(trend.some((point) => point.completedCount === 1), true);
  assert.equal(trend.some((point) => point.createdCount === 1), true);
  assert.equal(deadlines[0]?.title, "Fix launch blockers");
  assert.equal(deadlines[0]?.statusLabel, "Blocked");
  assert.equal(deadlines[0]?.ownerName, "Tarik");
  assert.equal(blockers[0]?.title, "Fix launch blockers");
  assert.equal(blockers[0]?.ageDays, 1);
  assert.equal(clients[0]?.name, "Northstar");
  assert.equal(clients[0]?.riskScore, 9);
  assert.equal(quickActions[0]?.href, "/projects?health=risk&view=table");
});

test("countOverloadedMembers returns only overloaded members", () => {
  const count = countOverloadedMembers([
    { id: "1", name: "A", email: "a@test.com", role: "ADMIN", activeTasks: 4, overdueTasks: 1, dueThisWeekTasks: 2, completedLast7Days: 1, loadScore: 55, loadState: "overloaded" },
    { id: "2", name: "B", email: "b@test.com", role: "MEMBER", activeTasks: 2, overdueTasks: 0, dueThisWeekTasks: 1, completedLast7Days: 1, loadScore: 24, loadState: "balanced" },
  ]);

  assert.equal(count, 1);
});
