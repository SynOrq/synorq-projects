import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnerDistribution,
  buildPortfolioRiskTrend,
  buildPortfolioWorkloadSummary,
} from "../src/lib/projects-portfolio.ts";

test("projects portfolio helpers summarize risk, owner distribution and workload", () => {
  const projects = [
    {
      id: "project_1",
      name: "Northstar",
      owner: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
      health: { key: "risk", label: "Riskli", tone: "", score: 44 },
      overdueTasks: 2,
      openRisks: 3,
      completionRate: 40,
    },
    {
      id: "project_2",
      name: "Atlas",
      owner: { id: "user_1", name: "Tarik", email: "tarik@synorq.com" },
      health: { key: "good", label: "Saglikli", tone: "", score: 88 },
      overdueTasks: 0,
      openRisks: 1,
      completionRate: 70,
    },
    {
      id: "project_3",
      name: "Helio",
      owner: { id: "user_2", name: "Elif", email: "elif@synorq.com" },
      health: { key: "steady", label: "Izleniyor", tone: "", score: 68 },
      overdueTasks: 1,
      openRisks: 2,
      completionRate: 50,
    },
  ] as never;

  const riskTrend = buildPortfolioRiskTrend(projects);
  const owners = buildOwnerDistribution(projects);
  const workload = buildPortfolioWorkloadSummary([
    {
      id: "user_1",
      name: "Tarik",
      email: "tarik@synorq.com",
      image: null,
      role: "ADMIN",
      weeklyCapacityHours: 30,
      projectedHours: 26,
      loggedHours: 8,
      availableHours: 4,
      utilization: 87,
      activeTasks: 5,
      overdueTasks: 2,
      dueThisWeekTasks: 3,
      blockedTasks: 1,
      completedLast7Days: 2,
      loadState: "watch",
      upcomingTasks: [],
    },
    {
      id: "user_2",
      name: "Elif",
      email: "elif@synorq.com",
      image: null,
      role: "MEMBER",
      weeklyCapacityHours: 34,
      projectedHours: 33,
      loggedHours: 9,
      availableHours: 1,
      utilization: 97,
      activeTasks: 6,
      overdueTasks: 1,
      dueThisWeekTasks: 4,
      blockedTasks: 2,
      completedLast7Days: 1,
      loadState: "overloaded",
      upcomingTasks: [],
    },
  ]);

  assert.equal(riskTrend[0]?.count, 1);
  assert.equal(riskTrend[2]?.count, 3);
  assert.equal(owners[0]?.name, "Tarik");
  assert.equal(owners[0]?.averageCompletion, 55);
  assert.equal(workload.overloadedMembers, 1);
  assert.equal(workload.averageUtilization, 92);
  assert.equal(workload.topLoad[0]?.name, "Elif");
});
