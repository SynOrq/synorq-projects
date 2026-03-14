import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoWorkspaceState, buildOnboardingChecklist } from "../src/lib/onboarding.ts";

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
    hasSavedProjectView: false,
  });

  assert.equal(onboarding.completed, 2);
  assert.equal(onboarding.total, 7);
  assert.equal(onboarding.progress, 29);
  assert.equal(onboarding.nextItem?.id, "workspace");
});

test("buildDemoWorkspaceState highlights dense demo readiness and recommended paths", () => {
  const state = buildDemoWorkspaceState({
    workspaceName: "Synorq Demo",
    projectCount: 4,
    memberCount: 5,
    taskCount: 16,
    activityCount: 12,
    riskProjectCount: 2,
    overdueTaskCount: 3,
    openRiskCount: 4,
    criticalMilestoneCount: 1,
    weeklyDigestEnabled: true,
  });

  assert.equal(state.hasDemoDensity, true);
  assert.equal(state.tone, "active");
  assert.equal(state.metrics[0]?.value, "4");
  assert.equal(state.explorationPaths[0]?.href, "/projects?health=risk&view=table");
});
