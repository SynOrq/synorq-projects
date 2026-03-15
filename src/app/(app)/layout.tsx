import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildOnboardingChecklist } from "@/lib/onboarding";
import { filterAccessibleProjects } from "@/lib/project-access";
import { normalizeSavedProjectsView } from "@/lib/projects-saved-view";
import { formatRelative } from "@/lib/utils";
import { findWorkspaceState } from "@/lib/workspace-state";
import AppTopbar from "@/components/layout/AppTopbar";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: {
      members: { some: { userId } },
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { members: true, projects: true } },
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  const projectsRaw = workspace
    ? await db.project.findMany({
        where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
        select: { id: true, name: true, color: true, ownerId: true, visibility: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const currentMembership = workspace?.members.find((member) => member.user.id === userId) ?? null;
  const projects =
    workspace && currentMembership
      ? filterAccessibleProjects(projectsRaw, {
          userId,
          workspaceOwnerId: workspace.ownerId,
          workspaceRole: currentMembership.role,
        })
      : [];
  const accessibleProjectIds = new Set(projects.map((project) => project.id));

  const [taskCount, overdueTasks, activity] = workspace
    ? await Promise.all([
        db.task.count({
          where: {
            project: { workspaceId: workspace.id },
          },
        }),
        db.task.findMany({
          where: {
            project: { workspaceId: workspace.id },
            dueDate: { not: null },
            status: { notIn: ["DONE", "CANCELLED"] },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            updatedAt: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 2,
        }),
        db.activityLog.findMany({
          where: { workspaceId: workspace.id },
          include: {
            project: { select: { id: true, name: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        }),
      ])
    : [0, [], []];
  const focusTasks = workspace
    ? await db.task.findMany({
        where: {
          project: { workspaceId: workspace.id },
          assigneeId: userId,
          status: { notIn: ["DONE", "CANCELLED"] },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        take: 6,
      })
    : [];
  const visibleOverdueTasks = overdueTasks.filter((task) => accessibleProjectIds.has(task.project.id));
  const visibleActivity = activity.filter((item) => !item.project || accessibleProjectIds.has(item.project.id));
  const visibleFocusTasks = focusTasks.filter((task) => accessibleProjectIds.has(task.project.id));
  const workspaceState = workspace
    ? await findWorkspaceState({
        workspaceId: workspace.id,
      userId,
      includeOnboarding: true,
      includePreferences: true,
      includeProjectView: true,
    })
    : null;

  const now = new Date();
  const overdueCount = visibleOverdueTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now).length;
  const notificationsReadAt = workspaceState?.notificationsReadAt ?? null;
  const riskAlertsEnabled = workspaceState?.riskAlertsEnabled ?? true;
  const activityAlertsEnabled = workspaceState?.activityAlertsEnabled ?? true;

  const alerts = [
    ...(riskAlertsEnabled
      ? visibleOverdueTasks
      .filter((task) => task.dueDate && new Date(task.dueDate) < now)
      .map((task) => ({
        id: `risk-${task.id}`,
        title: task.title,
        detail: `${task.project.name} icinde gecikmis gorev • ${formatRelative(task.dueDate as Date)}`,
        href: `/projects/${task.project.id}`,
        tone: "risk" as const,
        unread: !notificationsReadAt || task.updatedAt > notificationsReadAt,
      }))
      : []),
    ...(activityAlertsEnabled
      ? visibleActivity.map((item) => ({
      id: `activity-${item.id}`,
      title: item.project?.name ?? "Workspace aktivitesi",
      detail: `${item.user.name ?? item.user.email} • ${item.action} • ${formatRelative(item.createdAt)}`,
      href: item.project?.id ? `/projects/${item.project.id}` : "/dashboard",
      tone: "activity" as const,
      unread: !notificationsReadAt || item.createdAt > notificationsReadAt,
    }))
      : []),
  ].slice(0, 4);
  const unreadAlertCount = alerts.filter((item) => item.unread).length;

  const onboarding = buildOnboardingChecklist({
    hasProfileIdentity: Boolean(session.user.name) && Boolean(session.user.image),
    hasWorkspace: Boolean(workspace),
    hasWorkspaceBrand: Boolean(workspace?.logoUrl),
    projectCount: projects.length,
    memberCount: workspace?._count.members ?? 0,
    taskCount,
    reportsReady: projects.length > 0,
    weeklyDigestEnabled: workspaceState?.weeklyDigestEnabled ?? false,
    hasSavedProjectView: Boolean(normalizeSavedProjectsView(workspaceState?.savedProjectsView ?? null).data),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      <Sidebar session={session} workspace={workspace} projects={projects} />
      <main className="flex-1 overflow-y-auto">
        {workspace && (
          <AppTopbar
            workspaceName={workspace.name}
            activeProjectCount={projects.length}
            overdueCount={overdueCount}
            unreadAlertCount={unreadAlertCount}
            alerts={alerts}
            commandProjects={projects}
            commandTasks={visibleFocusTasks.map((task) => ({
              id: task.id,
              title: task.title,
              href: `/projects/${task.project.id}`,
              projectName: task.project.name,
              dueLabel: task.dueDate ? formatRelative(task.dueDate) : null,
            }))}
            commandPeople={workspace.members.map((member) => ({
              id: member.user.id,
              name: member.user.name ?? member.user.email,
              email: member.user.email,
              role: member.role,
              isOwner: member.user.id === workspace.ownerId,
            }))}
            checklist={onboarding.items.map((item) => ({ label: item.label, done: item.done }))}
            onboardingHref="/onboarding"
            nextChecklistHref={onboarding.nextItem?.href ?? "/onboarding"}
            nextChecklistLabel={onboarding.nextItem?.cta ?? "Setup hub"}
            showChecklist={!workspaceState?.onboardingDismissedAt}
          />
        )}
        {children}
      </main>
    </div>
  );
}
