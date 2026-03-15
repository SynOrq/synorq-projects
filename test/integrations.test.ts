import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkspaceIntegrationPayload, summarizeWorkspaceIntegrations } from "../src/lib/integrations.ts";

test("normalizeWorkspaceIntegrationPayload validates slack and webhook payloads", () => {
  const slack = normalizeWorkspaceIntegrationPayload("SLACK", {
    status: "connected",
    label: " Delivery alerts ",
    channel: "#delivery-alerts",
    lastSyncedAt: "2026-03-15",
  });

  assert.ok("data" in slack);
  if ("data" in slack) {
    assert.equal(slack.data.status, "CONNECTED");
    assert.equal(slack.data.label, "Delivery alerts");
    assert.deepEqual(slack.data.config, { channel: "#delivery-alerts" });
  }

  const webhook = normalizeWorkspaceIntegrationPayload("WEBHOOK", {
    status: "error",
    endpoint: "https://hooks.synorq.demo/delivery",
    events: ["project.updated", "workspace.billing_updated"],
    secretPreview: "whsec_****",
  });

  assert.ok("data" in webhook);
  if ("data" in webhook) {
    assert.equal(webhook.data.status, "ERROR");
    assert.deepEqual(webhook.data.config, {
      endpoint: "https://hooks.synorq.demo/delivery",
      secretPreview: "whsec_****",
      events: ["project.updated", "workspace.billing_updated"],
    });
  }
});

test("normalizeWorkspaceIntegrationPayload rejects invalid provider config", () => {
  assert.deepEqual(normalizeWorkspaceIntegrationPayload("GOOGLE_CALENDAR", { status: "connected", calendarId: "", syncWindowDays: 21 }), {
    error: "Calendar ID zorunlu.",
  });
  assert.deepEqual(normalizeWorkspaceIntegrationPayload("WEBHOOK", { status: "connected", endpoint: "notaurl", events: ["project.updated"] }), {
    error: "Webhook endpoint gecersiz.",
  });
  assert.deepEqual(normalizeWorkspaceIntegrationPayload("API_KEY", { status: "connected", keyName: "bot", secretPreview: "123" }), {
    error: "API key preview zorunlu.",
  });
});

test("summarizeWorkspaceIntegrations counts connected, configured and error states", () => {
  const summary = summarizeWorkspaceIntegrations([
    { provider: "SLACK", status: "CONNECTED", config: { channel: "#ops" } },
    { provider: "GOOGLE_CALENDAR", status: "DISCONNECTED", config: null },
    { provider: "WEBHOOK", status: "ERROR", config: { endpoint: "https://hooks" } },
  ]);

  assert.equal(summary.connected, 1);
  assert.equal(summary.configured, 2);
  assert.equal(summary.errors, 1);
});
