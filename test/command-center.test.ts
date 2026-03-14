import test from "node:test";
import assert from "node:assert/strict";
import { buildCommandItems, filterCommandItems } from "../src/lib/command-center.ts";

test("buildCommandItems includes navigation, projects, tasks and signals", () => {
  const items = buildCommandItems({
    projects: [{ id: "project_1", name: "Northstar", color: "#2563eb" }],
    focusTasks: [
      {
        id: "task_1",
        title: "Launch checklist",
        href: "/projects/project_1",
        projectName: "Northstar",
        dueLabel: "Bugun",
      },
    ],
    alerts: [
      {
        id: "alert_1",
        title: "Overdue task",
        detail: "Northstar icinde gecikmis gorev",
        href: "/projects/project_1",
        tone: "risk",
      },
    ],
  });

  assert.ok(items.some((item) => item.id === "nav-reports"));
  assert.ok(items.some((item) => item.id === "project-project_1"));
  assert.ok(items.some((item) => item.id === "task-task_1"));
  assert.ok(items.some((item) => item.id === "signal-alert_1"));
});

test("filterCommandItems matches query against titles and keywords", () => {
  const items = buildCommandItems({
    projects: [{ id: "project_1", name: "Northstar", color: "#2563eb" }],
    focusTasks: [],
    alerts: [],
  });

  const reports = filterCommandItems(items, "executive");
  const projects = filterCommandItems(items, "northstar");

  assert.ok(reports.some((item) => item.id === "nav-reports"));
  assert.ok(projects.some((item) => item.id === "project-project_1"));
});
