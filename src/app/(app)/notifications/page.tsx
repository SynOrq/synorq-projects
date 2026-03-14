import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNotificationConsoleState } from "@/lib/notifications";
import { findWorkspaceState } from "@/lib/workspace-state";
import {
  getActivityCategory,
  getActivityDetail,
  getActivitySeverity,
  getActivityTitle,
  isMentionForUser,
  isProjectUpdate,
  shouldSurfaceAsActionRequired,
} from "@/lib/activity";
import { formatRelative } from "@/lib/utils";
import NotificationsConsole from "@/components/notifications/NotificationsConsole";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    select: { id: true, name: true },
  });

  if (!workspace) redirect("/auth/login");

  const now = new Date();
  const [workspaceState, overdueTasks, activity] = await Promise.all([
    findWorkspaceState({
      workspaceId: workspace.id,
      userId,
      includePreferences: true,
      includeNotificationConsole: true,
    }),
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        dueDate: { not: null },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const riskAlertsEnabled = workspaceState?.riskAlertsEnabled ?? true;
  const activityAlertsEnabled = workspaceState?.activityAlertsEnabled ?? true;
  const weeklyDigestEnabled = workspaceState?.weeklyDigestEnabled ?? false;
  const notificationsReadAt = workspaceState?.notificationsReadAt ?? null;
  const notificationConsoleState = normalizeNotificationConsoleState(workspaceState?.notificationConsoleState);

  const overdueItems = (riskAlertsEnabled
    ? overdueTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now)
    : []
  ).map((task) => ({
    id: `risk-${task.id}`,
    title: task.title,
    detail: `${task.project.name}${task.assignee ? ` • ${task.assignee.name ?? task.assignee.email}` : " • Atama bekliyor"}`,
    href: `/projects/${task.project.id}`,
    meta: formatRelative(task.dueDate as Date),
    unread: !notificationsReadAt || task.updatedAt > notificationsReadAt,
    kind: "risk" as const,
    scope: {
      mine: task.assignee?.id === userId,
      risk: true,
      project: true,
      mention: task.assignee?.id === userId,
    },
    severity: "critical" as const,
  }));

  const activityItems = (activityAlertsEnabled ? activity : []).map((item) => {
    const actorName = item.user.name ?? item.user.email;
    return {
      id: item.id,
      title: getActivityTitle(item.action),
      detail: getActivityDetail({
        action: item.action,
        metadata: item.metadata,
        actorName,
        projectName: item.project?.name ?? null,
      }),
      href: item.project?.id ? `/projects/${item.project.id}` : "/dashboard",
      meta: formatRelative(item.createdAt),
      unread: !notificationsReadAt || item.createdAt > notificationsReadAt,
      kind: shouldSurfaceAsActionRequired(item.action, item.metadata, userId) ? "action" as const : "activity" as const,
      scope: {
        mine: isMentionForUser(item.metadata, userId),
        risk: getActivitySeverity(item.action, item.metadata) !== "info",
        project: isProjectUpdate(item.action),
        mention: isMentionForUser(item.metadata, userId),
      },
      severity: getActivitySeverity(item.action, item.metadata),
      category: getActivityCategory(item.action),
    };
  });

  const digest = {
    activeProjectSignals: activityItems.filter((item) => item.scope.project).length,
    riskSignals: overdueItems.length + activityItems.filter((item) => item.scope.risk).length,
    mentionSignals: activityItems.filter((item) => item.scope.mention).length,
    summary: [
      `${overdueItems.length} geciken is teslim riski uretiyor`,
      `${activityItems.filter((item) => item.scope.project).length} proje guncellemesi son akista yer aliyor`,
      `${activityItems.filter((item) => item.scope.mention).length} dogrudan size ilgili hareket var`,
    ],
    weeklyDigestEnabled,
  };

  return (
    <NotificationsConsole
      workspaceName={workspace.name}
      riskAlertsEnabled={riskAlertsEnabled}
      activityAlertsEnabled={activityAlertsEnabled}
      weeklyDigestEnabled={weeklyDigestEnabled}
      items={[...overdueItems, ...activityItems]}
      digest={digest}
      initialConsoleState={notificationConsoleState}
    />
  );
}
