import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceActivityFeed, filterWorkspaceActivity } from "../src/lib/workspace-activity.ts";

test("workspace activity feed builds flags and filters segments", () => {
  const feed = buildWorkspaceActivityFeed(
    [
      {
        id: "1",
        action: "task.assignee_changed",
        metadata: {
          changes: [{ field: "assigneeId", label: "Assignee", from: "Tarik", to: "Aylin" }],
          targetUserId: "user_1",
        },
        actorId: "user_2",
        actorName: "Aylin",
        projectId: "project_1",
        projectName: "Northstar",
        createdAt: new Date("2026-03-15T09:00:00.000Z"),
      },
      {
        id: "2",
        action: "workspace.member.role_updated",
        metadata: {
          targetUserId: "user_3",
          targetUserName: "Melis",
          roleTo: "ADMIN",
        },
        actorId: "user_1",
        actorName: "Tarik",
        projectId: null,
        projectName: null,
        createdAt: new Date("2026-03-15T08:00:00.000Z"),
      },
    ],
    "user_1"
  );

  assert.equal(feed.summary.total, 2);
  assert.equal(feed.summary.mine, 1);
  assert.equal(feed.summary.mentions, 1);

  const mentions = filterWorkspaceActivity(feed.items, "mentions", "");
  const mine = filterWorkspaceActivity(feed.items, "mine", "");
  const delivery = filterWorkspaceActivity(feed.items, "delivery", "northstar");

  assert.equal(mentions.length, 1);
  assert.equal(mine.length, 1);
  assert.equal(delivery[0]?.projectName, "Northstar");
});
