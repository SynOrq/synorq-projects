import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceRiskRegister } from "../src/lib/workspace-risks.ts";

test("buildWorkspaceRiskRegister sorts critical open risks and groups project hotspots", () => {
  const register = buildWorkspaceRiskRegister(
    [
      {
        id: "risk_1",
        title: "Approval delay",
        status: "OPEN",
        impact: "CRITICAL",
        likelihood: "HIGH",
        mitigationPlan: "Escalate review cadence",
        dueDate: new Date("2026-03-15T00:00:00.000Z"),
        ownerName: "Tarik",
        taskTitle: "Prepare launch deck",
        projectId: "project_1",
        projectName: "Northstar",
        projectColor: "#2563eb",
      },
      {
        id: "risk_2",
        title: "Copy review",
        status: "MITIGATING",
        impact: "MEDIUM",
        likelihood: "MEDIUM",
        mitigationPlan: null,
        dueDate: new Date("2026-03-13T00:00:00.000Z"),
        ownerName: "Aylin",
        taskTitle: null,
        projectId: "project_1",
        projectName: "Northstar",
        projectColor: "#2563eb",
      },
      {
        id: "risk_3",
        title: "Archive",
        status: "CLOSED",
        impact: "LOW",
        likelihood: "LOW",
        mitigationPlan: null,
        dueDate: null,
        ownerName: "Aylin",
        taskTitle: null,
        projectId: "project_2",
        projectName: "Helix",
        projectColor: "#0f766e",
      },
    ],
    new Date("2026-03-14T10:00:00.000Z")
  );

  assert.equal(register.summary.openCount, 2);
  assert.equal(register.summary.criticalCount, 1);
  assert.equal(register.items[0]?.id, "risk_1");
  assert.equal(register.hotspots[0]?.projectName, "Northstar");
  assert.equal(register.hotspots[0]?.overdueRisks, 1);
});
