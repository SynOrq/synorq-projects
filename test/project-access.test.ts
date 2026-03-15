import test from "node:test";
import assert from "node:assert/strict";
import { canAccessProject, filterAccessibleProjects, getProjectVisibilityMeta } from "../src/lib/project-access.ts";

test("canAccessProject applies visibility policy by workspace role", () => {
  assert.equal(
    canAccessProject({
      visibility: "WORKSPACE",
      workspaceRole: "VIEWER",
      isWorkspaceOwner: false,
      isProjectOwner: false,
    }),
    true
  );
  assert.equal(
    canAccessProject({
      visibility: "MEMBERS",
      workspaceRole: "VIEWER",
      isWorkspaceOwner: false,
      isProjectOwner: false,
    }),
    false
  );
  assert.equal(
    canAccessProject({
      visibility: "LEADERSHIP",
      workspaceRole: "ADMIN",
      isWorkspaceOwner: false,
      isProjectOwner: false,
    }),
    true
  );
  assert.equal(
    canAccessProject({
      visibility: "PRIVATE",
      workspaceRole: "ADMIN",
      isWorkspaceOwner: false,
      isProjectOwner: false,
    }),
    false
  );
});

test("project owner and workspace owner bypass visibility restrictions", () => {
  assert.equal(
    canAccessProject({
      visibility: "PRIVATE",
      workspaceRole: "VIEWER",
      isWorkspaceOwner: true,
      isProjectOwner: false,
    }),
    true
  );
  assert.equal(
    canAccessProject({
      visibility: "PRIVATE",
      workspaceRole: "MEMBER",
      isWorkspaceOwner: false,
      isProjectOwner: true,
    }),
    true
  );
});

test("filterAccessibleProjects keeps only visible projects for current user", () => {
  const visible = filterAccessibleProjects(
    [
      { id: "project_1", visibility: "WORKSPACE", ownerId: null },
      { id: "project_2", visibility: "MEMBERS", ownerId: null },
      { id: "project_3", visibility: "LEADERSHIP", ownerId: null },
      { id: "project_4", visibility: "PRIVATE", ownerId: "user_1" },
    ],
    {
      userId: "user_2",
      workspaceOwnerId: "user_0",
      workspaceRole: "MEMBER",
    }
  );

  assert.deepEqual(
    visible.map((project) => project.id),
    ["project_1", "project_2"]
  );
});

test("getProjectVisibilityMeta returns label and description", () => {
  const meta = getProjectVisibilityMeta("LEADERSHIP");
  assert.equal(meta.label, "Leadership");
  assert.match(meta.description, /admin/i);
});
