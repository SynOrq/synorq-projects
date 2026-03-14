import test from "node:test";
import assert from "node:assert/strict";
import { analyzeProjects, analyzeTeamLoad, getWorkloadImbalanceScore } from "../src/lib/portfolio.ts";

const now = new Date("2026-03-14T10:00:00.000Z");

test("analyzeProjects derives health and workload signals", () => {
  const projects = analyzeProjects(
    [
      {
        id: "project_1",
        name: "Website Refresh",
        description: null,
        color: "#6366f1",
        status: "ACTIVE",
        type: "WEBSITE",
        priority: "HIGH",
        tags: ["launch"],
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        dueDate: new Date("2026-03-20T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
        owner: {
          id: "user_1",
          name: "Tarik",
          email: "tarik@synorq.com",
        },
        client: {
          id: "client_1",
          name: "Northstar",
          health: "WATCH",
        },
        milestones: [
          {
            id: "milestone_1",
            title: "Launch readiness",
            status: "AT_RISK",
            dueDate: new Date("2026-03-15T00:00:00.000Z"),
            tasks: [
              { id: "task_1", status: "DONE" },
              { id: "task_2", status: "IN_PROGRESS" },
            ],
          },
        ],
        risks: [
          {
            id: "risk_1",
            status: "OPEN",
            impact: "HIGH",
            likelihood: "HIGH",
            dueDate: new Date("2026-03-15T00:00:00.000Z"),
          },
        ],
        tasks: [
          {
            id: "task_1",
            title: "Kickoff",
            status: "DONE",
            dueDate: new Date("2026-03-05T00:00:00.000Z"),
            completedAt: new Date("2026-03-05T00:00:00.000Z"),
            assigneeId: "user_1",
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            updatedAt: new Date("2026-03-05T00:00:00.000Z"),
            priority: "MEDIUM",
          },
          {
            id: "task_2",
            title: "QA",
            status: "IN_PROGRESS",
            dueDate: new Date("2026-03-13T00:00:00.000Z"),
            completedAt: null,
            assigneeId: null,
            createdAt: new Date("2026-03-02T00:00:00.000Z"),
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
            priority: "HIGH",
          },
        ],
      },
    ],
    now
  );

  assert.equal(projects[0]?.overdueTasks, 1);
  assert.equal(projects[0]?.unassignedTasks, 1);
  assert.equal(projects[0]?.completionRate, 50);
  assert.equal(projects[0]?.health.key, "risk");
  assert.equal(projects[0]?.openMilestones, 1);
  assert.equal(projects[0]?.openRisks, 1);
  assert.equal(projects[0]?.criticalRisks, 1);
  assert.equal(projects[0]?.nextMilestone?.title, "Launch readiness");
});

test("analyzeTeamLoad orders members by load and computes imbalance", () => {
  const teamLoad = analyzeTeamLoad(
    [
      { id: "user_1", name: "Tarik", email: "tarik@synorq.com", role: "ADMIN" },
      { id: "user_2", name: "Elif", email: "elif@synorq.com", role: "MEMBER" },
    ],
    [
      {
        id: "task_1",
        title: "Ops review",
        status: "IN_PROGRESS",
        dueDate: new Date("2026-03-14T00:00:00.000Z"),
        completedAt: null,
        assigneeId: "user_1",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      },
      {
        id: "task_2",
        title: "Client deck",
        status: "TODO",
        dueDate: new Date("2026-03-16T00:00:00.000Z"),
        completedAt: null,
        assigneeId: "user_1",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      },
      {
        id: "task_3",
        title: "Launch checklist",
        status: "DONE",
        dueDate: new Date("2026-03-11T00:00:00.000Z"),
        completedAt: new Date("2026-03-12T00:00:00.000Z"),
        assigneeId: "user_2",
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ],
    now
  );

  assert.equal(teamLoad[0]?.id, "user_1");
  assert.equal(teamLoad[0]?.loadState, "watch");
  assert.equal(teamLoad[1]?.completedLast7Days, 1);
  assert.equal(getWorkloadImbalanceScore(teamLoad), 100);
});
