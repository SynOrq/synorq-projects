import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingChecklist } from "../src/lib/onboarding.ts";

test("buildOnboardingChecklist computes progress and next step", () => {
  const onboarding = buildOnboardingChecklist({
    hasProfileIdentity: true,
    hasWorkspace: true,
    hasWorkspaceBrand: false,
    projectCount: 1,
    memberCount: 1,
    taskCount: 0,
    reportsReady: true,
    weeklyDigestEnabled: false,
  });

  assert.equal(onboarding.completed, 2);
  assert.equal(onboarding.total, 6);
  assert.equal(onboarding.progress, 33);
  assert.equal(onboarding.nextItem?.id, "workspace");
});
