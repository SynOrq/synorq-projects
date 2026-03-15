import type { ProjectVisibility, WorkspaceRole } from "@prisma/client";

export const PROJECT_VISIBILITY_OPTIONS: Array<{
  value: ProjectVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "WORKSPACE",
    label: "Workspace",
    description: "Tum workspace uyeleri ve viewer seat'ler proje yuzeyini gorebilir.",
  },
  {
    value: "MEMBERS",
    label: "Members only",
    description: "Sadece admin ve member rolleri; viewer seat'ler proje detayini goremez.",
  },
  {
    value: "LEADERSHIP",
    label: "Leadership",
    description: "Workspace owner, admin'ler ve proje owner bu projeye erisir.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Sadece workspace owner ve proje owner erisimi korunur.",
  },
] as const;

export function canAccessProject(params: {
  visibility: ProjectVisibility;
  workspaceRole: WorkspaceRole;
  isWorkspaceOwner: boolean;
  isProjectOwner: boolean;
}) {
  if (params.isWorkspaceOwner || params.isProjectOwner) return true;

  switch (params.visibility) {
    case "WORKSPACE":
      return true;
    case "MEMBERS":
      return params.workspaceRole !== "VIEWER";
    case "LEADERSHIP":
      return params.workspaceRole === "ADMIN";
    case "PRIVATE":
      return false;
    default:
      return false;
  }
}

export function filterAccessibleProjects<T extends { visibility: ProjectVisibility; ownerId: string | null }>(
  projects: T[],
  params: {
    userId: string;
    workspaceOwnerId: string;
    workspaceRole: WorkspaceRole;
  }
) {
  return projects.filter((project) =>
    canAccessProject({
      visibility: project.visibility,
      workspaceRole: params.workspaceRole,
      isWorkspaceOwner: params.workspaceOwnerId === params.userId,
      isProjectOwner: project.ownerId === params.userId,
    })
  );
}

export function getProjectVisibilityMeta(visibility: ProjectVisibility) {
  return (
    PROJECT_VISIBILITY_OPTIONS.find((option) => option.value === visibility) ?? PROJECT_VISIBILITY_OPTIONS[0]
  );
}
