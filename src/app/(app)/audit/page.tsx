import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getActivityCategory,
  getActivityDetail,
  getActivitySeverity,
  getActivityTitle,
} from "@/lib/activity";
import { formatDateTime, formatRelative } from "@/lib/utils";
import AuditConsole from "@/components/audit/AuditConsole";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  });

  if (!workspace) redirect("/auth/login");

  const items = await db.activityLog.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const normalized = items.map((item) => {
    const actorName = item.user.name ?? item.user.email;
    const category = getActivityCategory(item.action);
    const severity = getActivitySeverity(item.action, item.metadata);

    return {
      id: item.id,
      action: item.action,
      title: getActivityTitle(item.action),
      detail: getActivityDetail({
        action: item.action,
        metadata: item.metadata,
        actorName,
        projectName: item.project?.name ?? null,
      }),
      meta: `${formatRelative(item.createdAt)} • ${formatDateTime(item.createdAt)}`,
      category,
      severity,
      projectName: item.project?.name ?? null,
      actorName,
    };
  });

  const summary = [
    { label: "Toplam kayit", value: normalized.length, icon: "activity" as const },
    { label: "Critical / warning", value: normalized.filter((item) => item.severity !== "info").length, icon: "workspace" as const },
    { label: "Ekip hareketi", value: normalized.filter((item) => item.category === "team").length, icon: "team" as const },
    { label: "Project / task", value: normalized.filter((item) => item.category === "project" || item.category === "task").length, icon: "task" as const },
  ];

  return <AuditConsole workspaceName={workspace.name} items={normalized} summary={summary} />;
}
