import test from "node:test";
import assert from "node:assert/strict";
import {
  applyNotificationConsoleState,
  buildNotificationConsoleState,
  normalizeNotificationConsoleState,
} from "../src/lib/notifications.ts";

test("normalizeNotificationConsoleState returns empty state for invalid input", () => {
  assert.deepEqual(normalizeNotificationConsoleState(null), {
    archivedIds: [],
    snoozedUntil: {},
  });

  assert.deepEqual(normalizeNotificationConsoleState({ archivedIds: ["a", 1], snoozedUntil: { a: "2026-03-20T10:00:00.000Z", broken: 1 } }), {
    archivedIds: ["a"],
    snoozedUntil: { a: "2026-03-20T10:00:00.000Z" },
  });
});

test("applyNotificationConsoleState hides archived and future snoozed items", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const state = {
    archivedIds: ["a"],
    snoozedUntil: {
      b: "2026-03-20T10:00:00.000Z",
      c: "2026-03-10T10:00:00.000Z",
    },
  };

  assert.deepEqual(applyNotificationConsoleState(items, state, new Date("2026-03-14T10:00:00.000Z")), [{ id: "c" }]);
});

test("buildNotificationConsoleState merges archive and snooze mutations", () => {
  const nextState = buildNotificationConsoleState({
    current: {
      archivedIds: ["risk-1"],
      snoozedUntil: {
        "act-1": "2026-03-20T10:00:00.000Z",
      },
    },
    archiveIds: ["risk-2"],
    unarchiveIds: ["risk-1"],
    snooze: {
      ids: ["act-2"],
      until: "2026-03-21T10:00:00.000Z",
    },
    clearSnoozeIds: ["act-1"],
  });

  assert.deepEqual(nextState, {
    archivedIds: ["risk-2"],
    snoozedUntil: {
      "act-2": "2026-03-21T10:00:00.000Z",
    },
  });
});
