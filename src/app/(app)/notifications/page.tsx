import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/utils";
import { findWorkspaceState } from "@/lib/workspace-state";
import { redirect } from "next/navigation";
import NotificationsConsole from "@/components/notifications/NotificationsConsole";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  });

  if (!workspace) redirect("/auth/login");

  const now = new Date();
  const [workspaceState, overdueTasks, activity] = await Promise.all([
    findWorkspaceState({
      workspaceId: workspace.id,
      userId: session.user.id,
      includePreferences: true,
    }),
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        dueDate: { not: null },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 12,
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const riskAlertsEnabled = workspaceState?.riskAlertsEnabled ?? true;
  const activityAlertsEnabled = workspaceState?.activityAlertsEnabled ?? true;
  const weeklyDigestEnabled = workspaceState?.weeklyDigestEnabled ?? false;
  const overdueItems = riskAlertsEnabled
    ? overdueTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now)
    : [];
  const notificationsReadAt = workspaceState?.notificationsReadAt ?? null;

  return (
    <NotificationsConsole
      workspaceName={workspace.name}
      riskAlertsEnabled={riskAlertsEnabled}
      activityAlertsEnabled={activityAlertsEnabled}
      weeklyDigestEnabled={weeklyDigestEnabled}
      overdueItems={overdueItems.map((task) => ({
        id: task.id,
        title: task.title,
        detail: `${task.project.name}${task.assignee ? ` • ${task.assignee.name ?? task.assignee.email}` : ""}`,
        href: `/projects/${task.project.id}`,
        meta: formatRelative(task.dueDate as Date),
        unread: !notificationsReadAt || task.updatedAt > notificationsReadAt,
      }))}
      activityItems={(activityAlertsEnabled ? activity : []).map((item) => ({
        id: item.id,
        title: item.project?.name ?? "Workspace aktivitesi",
        detail: `${item.user.name ?? item.user.email} • ${item.action}`,
        href: item.project?.id ? `/projects/${item.project.id}` : "/dashboard",
        meta: formatRelative(item.createdAt),
        unread: !notificationsReadAt || item.createdAt > notificationsReadAt,
      }))}
    />
  );
}
