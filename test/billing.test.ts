import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceBillingSummary, normalizeWorkspaceBillingPayload } from "../src/lib/billing.ts";

test("normalizeWorkspaceBillingPayload validates and sanitizes billing inputs", () => {
  const result = normalizeWorkspaceBillingPayload({
    plan: "growth",
    status: "active",
    billingEmail: " FINANCE@SYNORQ.DEMO ",
    seatCap: "18",
    allowOverage: true,
    usageAlertThresholdPct: "90",
    renewalDate: "2026-04-15",
  });

  assert.ok("data" in result);
  if (!("data" in result)) return;

  assert.equal(result.data.plan, "GROWTH");
  assert.equal(result.data.status, "ACTIVE");
  assert.equal(result.data.billingEmail, "finance@synorq.demo");
  assert.equal(result.data.seatCap, 18);
  assert.equal(result.data.allowOverage, true);
  assert.equal(result.data.usageAlertThresholdPct, 90);
  assert.equal(result.data.renewalDate?.toISOString(), "2026-04-15T00:00:00.000Z");
});

test("normalizeWorkspaceBillingPayload rejects invalid billing fields", () => {
  assert.deepEqual(normalizeWorkspaceBillingPayload({ plan: "broken", status: "active", usageAlertThresholdPct: 85 }), {
    error: "Gecersiz workspace plani.",
  });
  assert.deepEqual(normalizeWorkspaceBillingPayload({ plan: "team", status: "broken", usageAlertThresholdPct: 85 }), {
    error: "Gecersiz billing durumu.",
  });
  assert.deepEqual(normalizeWorkspaceBillingPayload({ plan: "team", status: "active", billingEmail: "broken", usageAlertThresholdPct: 85 }), {
    error: "Billing email gecersiz.",
  });
  assert.deepEqual(normalizeWorkspaceBillingPayload({ plan: "team", status: "active", seatCap: 0, usageAlertThresholdPct: 85 }), {
    error: "Seat cap pozitif bir tam sayi olmali.",
  });
  assert.deepEqual(normalizeWorkspaceBillingPayload({ plan: "team", status: "active", usageAlertThresholdPct: 20 }), {
    error: "Usage alert threshold 50 ile 100 arasinda olmali.",
  });
});

test("buildWorkspaceBillingSummary derives seat usage and alert state", () => {
  const summary = buildWorkspaceBillingSummary({
    plan: "GROWTH",
    status: "ACTIVE",
    seatCap: 5,
    allowOverage: false,
    usageAlertThresholdPct: 80,
    activeMembers: 6,
    viewerMembers: 1,
    adminMembers: 2,
    projectCount: 7,
    publishedPortalCount: 2,
    exportCountLast30Days: 4,
    weeklyDigestEnabled: true,
  });

  assert.equal(summary.metrics.seatUsagePct, 120);
  assert.equal(summary.metrics.overageSeats, 1);
  assert.equal(summary.flags.alertState, "critical");
  assert.equal(summary.flags.overageBlocked, true);
  assert.match(summary.guidance, /aksiyon/i);
});
