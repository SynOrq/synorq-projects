import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutiveWeeklyDigest } from "../src/lib/executive-digest.ts";
import { buildExecutiveReport } from "../src/lib/reports.ts";

const now = new Date("2026-03-15T10:00:00.000Z");

test("buildExecutiveWeeklyDigest converts report into weekly leadership blocks", () => {
  const report = buildExecutiveReport(
    [
      {
        id: "project_1",
        name: "Helio Sprint",
        description: null,
        color: "#ea580c",
        status: "ACTIVE",
        type: "RETAINER",
        priority: "HIGH",
        tags: [],
        startDate: null,
        dueDate: new Date("2026-03-17T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-14T00:00:00.000Z"),
        owner: { id: "user_1", name: "Aylin", email: "aylin@synorq.demo" },
        client: { id: "client_1", name: "Helio", health: "AT_RISK" },
        tasks: [],
        milestones: [],
        risks: [],
        totalTasks: 3,
        completedTasks: 1,
        openTasks: 2,
        overdueTasks: 1,
        dueThisWeekTasks: 2,
        unassignedTasks: 0,
        completionRate: 33,
        activeAssignees: 1,
        health: { key: "risk", label: "Riskli", tone: "", score: 42 },
        dueDateResolved: new Date("2026-03-17T00:00:00.000Z"),
        dueInDays: 2,
        lastActivityAt: new Date("2026-03-14T00:00:00.000Z"),
        openMilestones: 1,
        completedMilestones: 0,
        milestoneCompletionRate: 0,
        nextMilestone: null,
        openRisks: 2,
        criticalRisks: 1,
      },
    ],
    [
      {
        id: "user_1",
        name: "Aylin",
        email: "aylin@synorq.demo",
        image: null,
        role: "ADMIN",
        weeklyCapacityHours: 30,
        projectedHours: 29,
        loggedHours: 8,
        availableHours: 1,
        utilization: 97,
        activeTasks: 4,
        overdueTasks: 1,
        dueThisWeekTasks: 3,
        blockedTasks: 1,
        completedLast7Days: 1,
        loadState: "overloaded",
        upcomingTasks: [],
      },
    ],
    [{ id: "activity_1", action: "risk.created", createdAt: new Date("2026-03-14T00:00:00.000Z") }],
    now
  );

  const digest = buildExecutiveWeeklyDigest(report);

  assert.equal(digest.tone, "attention");
  assert.match(digest.headline, /yakin takip/i);
  assert.equal(digest.leadershipBlocks.length, 3);
  assert.equal(digest.deliveryFocus[0]?.title, "Helio Sprint");
  assert.equal(digest.teamFocus[0]?.title, "Aylin");
  assert.ok(digest.recommendations.length > 0);
});
