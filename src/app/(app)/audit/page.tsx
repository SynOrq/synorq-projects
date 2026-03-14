import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { redirect } from "next/navigation";
import AuditConsole from "@/components/audit/AuditConsole";

function getCategory(action: string) {
  if (action.startsWith("workspace.member")) return "team" as const;
  if (action.startsWith("workspace.")) return "workspace" as const;
  if (action.startsWith("task.attachment")) return "file" as const;
  return "task" as const;
}

function getTitle(action: string) {
  const labelMap: Record<string, string> = {
    "workspace.updated": "Workspace ayarlari guncellendi",
    "workspace.member.invited": "Yeni ekip uyesi davet edildi",
    "workspace.member.role_updated": "Rol yetkisi guncellendi",
    "task.created": "Yeni task olusturuldu",
    "task.updated": "Task guncellendi",
    "task.moved": "Task kolon degistirdi",
    "task.commented": "Task yorum aldi",
    "task.subtask.created": "Alt gorev eklendi",
    "task.subtask.updated": "Alt gorev guncellendi",
    "task.subtask.deleted": "Alt gorev silindi",
    "task.attachment.created": "Dosya baglandi",
    "task.attachment.deleted": "Dosya kaldirildi",
  };

  return labelMap[action] ?? action;
}

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
    take: 80,
  });

  const categorized = items.map((item) => ({
    id: item.id,
    title: getTitle(item.action),
    detail: `${item.user.name ?? item.user.email} • ${item.action}`,
    meta: `${formatRelative(item.createdAt)} • ${formatDateTime(item.createdAt)}`,
    category: getCategory(item.action),
    projectName: item.project?.name ?? null,
    actorName: item.user.name ?? item.user.email,
  }));

  const summary = [
    { label: "Toplam kayit", value: categorized.length, icon: "activity" as const },
    { label: "Workspace hareketi", value: categorized.filter((item) => item.category === "workspace").length, icon: "workspace" as const },
    { label: "Ekip yonetimi", value: categorized.filter((item) => item.category === "team").length, icon: "team" as const },
    { label: "Task operasyonu", value: categorized.filter((item) => item.category === "task").length + categorized.filter((item) => item.category === "file").length, icon: "task" as const },
  ];

  return <AuditConsole workspaceName={workspace.name} items={categorized} summary={summary} />;
}
