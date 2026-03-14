import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { members: true, projects: true } },
    },
  });

  const projects = workspace
    ? await db.project.findMany({
        where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
        select: { id: true, name: true, color: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

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
  const workspaceState = workspace
    ? await findWorkspaceState({
        workspaceId: workspace.id,
        userId,
        includeOnboarding: true,
        includePreferences: true,
      })
    : null;

  const now = new Date();
  const overdueCount = overdueTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now).length;
  const notificationsReadAt = workspaceState?.notificationsReadAt ?? null;
  const riskAlertsEnabled = workspaceState?.riskAlertsEnabled ?? true;
  const activityAlertsEnabled = workspaceState?.activityAlertsEnabled ?? true;

  const alerts = [
    ...(riskAlertsEnabled
      ? overdueTasks
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
      ? activity.map((item) => ({
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

  const checklist = [
    { label: "Profil kimligi tanimli", done: Boolean(session.user.name) && Boolean(session.user.image) },
    { label: "Workspace olusturuldu", done: Boolean(workspace) },
    { label: "Workspace markasi tanimli", done: Boolean(workspace?.logoUrl) },
    { label: "Ilk proje olusturuldu", done: projects.length > 0 },
    { label: "Ekip daveti basladi", done: (workspace?._count.members ?? 0) > 1 },
    { label: "Task akisi basladi", done: taskCount > 0 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <Sidebar session={session} workspace={workspace} projects={projects} />
      <main className="flex-1 overflow-y-auto">
        {workspace && (
          <AppTopbar
            workspaceName={workspace.name}
            activeProjectCount={projects.length}
            overdueCount={overdueCount}
            unreadAlertCount={unreadAlertCount}
            alerts={alerts}
            checklist={checklist}
            showChecklist={!workspaceState?.onboardingDismissedAt}
          />
        )}
        {children}
      </main>
    </div>
  );
}
