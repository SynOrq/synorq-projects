import test from "node:test";
import assert from "node:assert/strict";
import { buildClientPortalSummary, normalizeClientPortalPayload } from "../src/lib/client-portal.ts";

const now = new Date("2026-03-15T10:00:00.000Z");

test("normalizeClientPortalPayload trims fields and validates accent color", () => {
  const result = normalizeClientPortalPayload({
    isPublished: true,
    welcomeTitle: " Northstar portal ",
    welcomeMessage: " Weekly delivery summary ",
    accentColor: "#2563EB",
    regenerateToken: true,
  });

  assert.ok("data" in result);
  if (!("data" in result)) return;

  assert.equal(result.data.isPublished, true);
  assert.equal(result.data.welcomeTitle, "Northstar portal");
  assert.equal(result.data.welcomeMessage, "Weekly delivery summary");
  assert.equal(result.data.accentColor, "#2563eb");
  assert.equal(result.data.regenerateToken, true);
});

test("normalizeClientPortalPayload rejects invalid accent color", () => {
  const result = normalizeClientPortalPayload({
    accentColor: "blue",
  });

  assert.deepEqual(result, {
    error: "Portal accent rengi #RRGGBB formatinda olmali.",
  });
});

test("buildClientPortalSummary aggregates delivery metrics for client portal", () => {
  const summary = buildClientPortalSummary({
    client: { name: "Northstar", health: "WATCH" },
    recentActivityCount: 4,
    now,
    projects: [
      {
        id: "project_1",
        name: "Northstar Website Relaunch",
        description: null,
        color: "#2563eb",
        status: "ACTIVE",
        type: "WEBSITE",
        visibility: "WORKSPACE",
        priority: "HIGH",
        tags: [],
        startDate: null,
        dueDate: new Date("2026-03-18T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-14T00:00:00.000Z"),
        owner: { id: "user_1", name: "Aylin", email: "aylin@synorq.demo" },
        client: { id: "client_1", name: "Northstar", health: "WATCH" },
        tasks: [
          {
            id: "task_1",
            title: "Launch checklist",
            status: "IN_REVIEW",
            dueDate: new Date("2026-03-16T00:00:00.000Z"),
            completedAt: null,
            assigneeId: "user_1",
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
            updatedAt: new Date("2026-03-14T00:00:00.000Z"),
            priority: "HIGH",
          },
          {
            id: "task_2",
            title: "CMS migration note",
            status: "DONE",
            dueDate: new Date("2026-03-12T00:00:00.000Z"),
            completedAt: new Date("2026-03-13T00:00:00.000Z"),
            assigneeId: "user_2",
            createdAt: new Date("2026-03-09T00:00:00.000Z"),
            updatedAt: new Date("2026-03-13T00:00:00.000Z"),
            priority: "MEDIUM",
          },
        ],
        milestones: [],
        risks: [],
        totalTasks: 2,
        completedTasks: 1,
        openTasks: 1,
        overdueTasks: 0,
        dueThisWeekTasks: 1,
        unassignedTasks: 0,
        completionRate: 50,
        activeAssignees: 1,
        health: { key: "steady", label: "Izleniyor", tone: "", score: 72 },
        healthFactors: [],
        healthStrategy: "derived",
        dueDateResolved: new Date("2026-03-18T00:00:00.000Z"),
        dueInDays: 3,
        lastActivityAt: new Date("2026-03-14T00:00:00.000Z"),
        openMilestones: 1,
        completedMilestones: 0,
        milestoneCompletionRate: 0,
        nextMilestone: {
          id: "milestone_1",
          title: "Launch readiness",
          status: "AT_RISK",
          dueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
        openRisks: 1,
        criticalRisks: 0,
      },
      {
        id: "project_2",
        name: "Northstar Care Ops",
        description: null,
        color: "#0f766e",
        status: "ACTIVE",
        type: "RETAINER",
        visibility: "MEMBERS",
        priority: "MEDIUM",
        tags: [],
        startDate: null,
        dueDate: new Date("2026-03-25T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-14T00:00:00.000Z"),
        owner: { id: "user_2", name: "Emre", email: "emre@synorq.demo" },
        client: { id: "client_1", name: "Northstar", health: "WATCH" },
        tasks: [
          {
            id: "task_3",
            title: "SEO catch-up",
            status: "TODO",
            dueDate: new Date("2026-03-13T00:00:00.000Z"),
            completedAt: null,
            assigneeId: "user_2",
            createdAt: new Date("2026-03-11T00:00:00.000Z"),
            updatedAt: new Date("2026-03-14T00:00:00.000Z"),
            priority: "HIGH",
          },
        ],
        milestones: [],
        risks: [],
        totalTasks: 1,
        completedTasks: 0,
        openTasks: 1,
        overdueTasks: 1,
        dueThisWeekTasks: 0,
        unassignedTasks: 0,
        completionRate: 0,
        activeAssignees: 1,
        health: { key: "risk", label: "Riskli", tone: "", score: 44 },
        healthFactors: [],
        healthStrategy: "derived",
        dueDateResolved: new Date("2026-03-25T00:00:00.000Z"),
        dueInDays: 10,
        lastActivityAt: new Date("2026-03-14T00:00:00.000Z"),
        openMilestones: 0,
        completedMilestones: 0,
        milestoneCompletionRate: 0,
        nextMilestone: null,
        openRisks: 2,
        criticalRisks: 1,
      },
    ] as never,
  });

  assert.equal(summary.tone, "attention");
  assert.equal(summary.metrics.activeProjects, 2);
  assert.equal(summary.metrics.deliveriesNext14Days, 2);
  assert.equal(summary.metrics.overdueTasks, 1);
  assert.equal(summary.metrics.openRisks, 3);
  assert.equal(summary.metrics.completedLast14Days, 1);
  assert.equal(summary.watchlist[0]?.name, "Northstar Care Ops");
});
