import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPortfolioHealthSummary,
  buildTeamWorkloadMetrics,
  buildWeeklyReportingMetrics,
} from "../src/lib/analytics.ts";

const now = new Date("2026-03-14T10:00:00.000Z");

test("buildPortfolioHealthSummary aggregates portfolio health metrics", () => {
  const summary = buildPortfolioHealthSummary(
    [
      {
        id: "project_1",
        name: "Northstar",
        description: null,
        color: "#2563eb",
        status: "ACTIVE",
        type: "WEBSITE",
        visibility: "WORKSPACE",
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
        totalTasks: 3,
        completedTasks: 1,
        openTasks: 2,
        overdueTasks: 1,
        dueThisWeekTasks: 2,
        unassignedTasks: 1,
        completionRate: 33,
        activeAssignees: 1,
        health: { key: "risk", label: "Riskli", tone: "", score: 48 },
        healthFactors: [],
        healthStrategy: "derived",
        dueDateResolved: new Date("2026-03-16T00:00:00.000Z"),
        dueInDays: 2,
        lastActivityAt: new Date("2026-03-13T00:00:00.000Z"),
        openMilestones: 1,
        completedMilestones: 0,
        milestoneCompletionRate: 25,
        nextMilestone: null,
        openRisks: 2,
        criticalRisks: 1,
      },
      {
        id: "project_2",
        name: "Atlas",
        description: null,
        color: "#0f766e",
        status: "ACTIVE",
        type: "MOBILE_APP",
        visibility: "MEMBERS",
        priority: "MEDIUM",
        tags: [],
        startDate: null,
        dueDate: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T00:00:00.000Z"),
        owner: { id: "user_2", name: "Elif", email: "elif@synorq.com" },
        client: null,
        tasks: [],
        milestones: [],
        risks: [],
        totalTasks: 2,
        completedTasks: 1,
        openTasks: 1,
        overdueTasks: 0,
        dueThisWeekTasks: 0,
        unassignedTasks: 0,
        completionRate: 50,
        activeAssignees: 1,
        health: { key: "steady", label: "Izleniyor", tone: "", score: 72 },
        healthFactors: [],
        healthStrategy: "derived",
        dueDateResolved: null,
        dueInDays: null,
        lastActivityAt: new Date("2026-03-13T00:00:00.000Z"),
        openMilestones: 0,
        completedMilestones: 1,
        milestoneCompletionRate: 100,
        nextMilestone: null,
        openRisks: 1,
        criticalRisks: 0,
      },
    ] as never,
    now
  );

  assert.equal(summary.riskProjects.length, 1);
  assert.equal(summary.watchedProjects.length, 1);
  assert.equal(summary.overdueTasks, 1);
  assert.equal(summary.openRisks, 3);
  assert.equal(summary.averageHealth, 60);
  assert.equal(summary.averageMilestoneCompletion, 63);
});

test("buildTeamWorkloadMetrics aggregates capacity summary", () => {
  const metrics = buildTeamWorkloadMetrics([
    {
      id: "user_1",
      name: "Tarik",
      email: "tarik@synorq.com",
      image: null,
      role: "ADMIN",
      defaultRoleCapacityHours: 30,
      configuredCapacityHours: 30,
      reservedHours: 2,
      outOfOfficeHours: 0,
      weeklyCapacityHours: 28,
      projectedHours: 21,
      loggedHours: 4,
      availableHours: 7,
      utilization: 75,
      activeTasks: 3,
      overdueTasks: 1,
      dueThisWeekTasks: 2,
      blockedTasks: 0,
      completedLast7Days: 1,
      loadState: "watch",
      upcomingTasks: [],
    },
    {
      id: "user_2",
      name: "Elif",
      email: "elif@synorq.com",
      image: null,
      role: "MEMBER",
      defaultRoleCapacityHours: 34,
      configuredCapacityHours: 34,
      reservedHours: 0,
      outOfOfficeHours: 4,
      weeklyCapacityHours: 30,
      projectedHours: 29,
      loggedHours: 8,
      availableHours: 1,
      utilization: 97,
      activeTasks: 5,
      overdueTasks: 0,
      dueThisWeekTasks: 3,
      blockedTasks: 1,
      completedLast7Days: 2,
      loadState: "overloaded",
      upcomingTasks: [],
    },
  ]);

  assert.equal(metrics.totalCapacityHours, 58);
  assert.equal(metrics.projectedHours, 50);
  assert.equal(metrics.utilization, 86);
  assert.equal(metrics.averageUtilization, 86);
  assert.equal(metrics.overloadedMembers.length, 1);
  assert.equal(metrics.topLoad[0]?.name, "Elif");
});

test("buildWeeklyReportingMetrics summarizes completion and activity cadence", () => {
  const metrics = buildWeeklyReportingMetrics(
    [
      {
        id: "project_1",
        name: "Northstar",
        description: null,
        color: "#2563eb",
        status: "ACTIVE",
        type: "WEBSITE",
        visibility: "WORKSPACE",
        priority: "HIGH",
        tags: [],
        startDate: null,
        dueDate: new Date("2026-03-16T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T00:00:00.000Z"),
        owner: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
        client: null,
        tasks: [
          {
            id: "task_1",
            title: "Ship",
            status: "DONE",
            dueDate: new Date("2026-03-13T00:00:00.000Z"),
            completedAt: new Date("2026-03-13T00:00:00.000Z"),
            assigneeId: "user_1",
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
            updatedAt: new Date("2026-03-13T00:00:00.000Z"),
            priority: "HIGH",
          },
        ],
        milestones: [],
        risks: [],
        totalTasks: 1,
        completedTasks: 1,
        openTasks: 0,
        overdueTasks: 0,
        dueThisWeekTasks: 0,
        unassignedTasks: 0,
        completionRate: 100,
        activeAssignees: 0,
        health: { key: "good", label: "Saglikli", tone: "", score: 90 },
        healthFactors: [],
        healthStrategy: "derived",
        dueDateResolved: new Date("2026-03-16T00:00:00.000Z"),
        dueInDays: 2,
        lastActivityAt: new Date("2026-03-13T00:00:00.000Z"),
        openMilestones: 0,
        completedMilestones: 0,
        milestoneCompletionRate: 0,
        nextMilestone: null,
        openRisks: 0,
        criticalRisks: 0,
      },
    ] as never,
    [
      { id: "activity_1", action: "task.updated", createdAt: new Date("2026-03-13T00:00:00.000Z") },
      { id: "activity_2", action: "task.updated", createdAt: new Date("2026-03-05T00:00:00.000Z") },
    ],
    now
  );

  assert.equal(metrics.completedLast7Days, 1);
  assert.equal(metrics.deliveriesThisWeek.length, 1);
  assert.equal(metrics.activityLast7Days, 1);
});
