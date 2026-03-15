import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWorkspaceAutomationPayload,
  summarizeWorkspaceAutomations,
} from "../src/lib/automations.ts";

test("normalizeWorkspaceAutomationPayload validates trigger and action specific config", () => {
  const result = normalizeWorkspaceAutomationPayload({
    name: "Overdue to Slack",
    trigger: "task_overdue",
    action: "slack_message",
    status: "active",
    targetProjectId: "project_1",
    thresholdHours: 24,
    channel: "#delivery-alerts",
    messageTemplate: "Owner checkpoint ac",
    lastRunAt: "2026-03-15",
  });

  assert.ok("data" in result);
  if ("data" in result) {
    assert.equal(result.data.trigger, "TASK_OVERDUE");
    assert.equal(result.data.action, "SLACK_MESSAGE");
    assert.equal(result.data.status, "ACTIVE");
    assert.equal(result.data.targetProjectId, "project_1");
    assert.deepEqual(result.data.config, {
      thresholdHours: 24,
      channel: "#delivery-alerts",
      messageTemplate: "Owner checkpoint ac",
    });
  }
});

test("normalizeWorkspaceAutomationPayload rejects invalid automation config", () => {
  assert.deepEqual(
    normalizeWorkspaceAutomationPayload({
      name: "Broken",
      trigger: "task_overdue",
      action: "slack_message",
      status: "active",
      thresholdHours: 500,
      channel: "#ops",
      messageTemplate: "Ping",
    }),
    { error: "Overdue threshold 1 ile 168 saat arasinda olmali." }
  );

  assert.deepEqual(
    normalizeWorkspaceAutomationPayload({
      name: "Broken",
      trigger: "weekly_digest_ready",
      action: "webhook",
      status: "draft",
      digestDay: 2,
      endpoint: "notaurl",
    }),
    { error: "Webhook endpoint gecersiz." }
  );
});

test("summarizeWorkspaceAutomations counts active posture and scope", () => {
  const summary = summarizeWorkspaceAutomations([
    { status: "ACTIVE", targetProjectId: "project_1", action: "SLACK_MESSAGE" },
    { status: "DRAFT", targetProjectId: null, action: "CREATE_TASK" },
    { status: "PAUSED", targetProjectId: "project_2", action: "WEBHOOK" },
  ]);

  assert.equal(summary.active, 1);
  assert.equal(summary.draft, 1);
  assert.equal(summary.paused, 1);
  assert.equal(summary.projectScoped, 2);
  assert.equal(summary.outbound, 2);
});
