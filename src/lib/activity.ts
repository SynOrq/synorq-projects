export type ActivityCategory = "workspace" | "team" | "project" | "task" | "file";
export type ActivitySeverity = "info" | "warning" | "critical";

export type ActivityMetadata = {
  taskId?: string;
  projectId?: string;
  attachmentId?: string;
  commentId?: string;
  field?: string;
  name?: string;
  title?: string;
  status?: string;
  role?: string;
  roleFrom?: string | null;
  roleTo?: string | null;
  fromSectionName?: string | null;
  toSectionName?: string | null;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
  invitedEmail?: string | null;
  clientName?: string | null;
  preferenceKeys?: string[];
  changes?: Array<{
    field: string;
    label: string;
    from: string | null;
    to: string | null;
  }>;
} | null;

function readMetadata(value: unknown): ActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ActivityMetadata;
}

export function getActivityCategory(action: string): ActivityCategory {
  if (action.startsWith("workspace.member")) return "team";
  if (action.startsWith("workspace.")) return "workspace";
  if (action.startsWith("project.")) return "project";
  if (action.startsWith("task.attachment")) return "file";
  return "task";
}

export function getActivitySeverity(action: string, metadataValue: unknown): ActivitySeverity {
  const metadata = readMetadata(metadataValue);

  if (action === "task.due_date_changed") {
    const due = metadata?.changes?.find((change) => change.field === "dueDate")?.to ?? null;
    if (due) {
      const dueDate = new Date(due);
      const now = new Date();
      if (!Number.isNaN(dueDate.getTime()) && dueDate < now) return "critical";
    }
    return "warning";
  }

  if (action === "task.assignee_changed" || action === "workspace.member.role_updated") return "warning";
  if (action === "workspace.preference_changed") return "info";
  if (action === "task.moved" || action === "task.updated" || action === "project.created") return "info";
  if (action === "task.deleted") return "critical";
  return "info";
}

export function getActivityTitle(action: string) {
  const labelMap: Record<string, string> = {
    "project.created": "Yeni proje olusturuldu",
    "workspace.updated": "Workspace ayarlari guncellendi",
    "workspace.preference_changed": "Bildirim tercihleri guncellendi",
    "workspace.member.invited": "Yeni ekip uyesi davet edildi",
    "workspace.member.role_updated": "Rol yetkisi guncellendi",
    "task.created": "Yeni gorev olusturuldu",
    "task.updated": "Gorev guncellendi",
    "task.assignee_changed": "Gorev sahipligi degisti",
    "task.due_date_changed": "Teslim tarihi guncellendi",
    "task.deleted": "Gorev silindi",
    "task.moved": "Gorev kolon degistirdi",
    "task.commented": "Yeni yorum eklendi",
    "task.subtask.created": "Alt gorev eklendi",
    "task.subtask.updated": "Alt gorev guncellendi",
    "task.subtask.deleted": "Alt gorev silindi",
    "task.attachment.created": "Dosya eklendi",
    "task.attachment.deleted": "Dosya kaldirildi",
  };

  return labelMap[action] ?? action;
}

export function getActivityDetail(params: {
  action: string;
  metadata: unknown;
  actorName: string;
  projectName: string | null;
}) {
  const metadata = readMetadata(params.metadata);
  const targetName = metadata?.targetUserName ?? metadata?.targetUserEmail ?? metadata?.invitedEmail ?? "ekip uyesi";

  switch (params.action) {
    case "project.created":
      return `${params.actorName} yeni bir proje akisi baslatti${metadata?.clientName ? ` • ${metadata.clientName}` : ""}.`;
    case "workspace.updated":
      return `${params.actorName} workspace kimligini guncelledi.`;
    case "workspace.preference_changed":
      return `${params.actorName} bildirim tercihlerini guncelledi${metadata?.preferenceKeys?.length ? ` • ${metadata.preferenceKeys.join(", ")}` : ""}.`;
    case "workspace.member.invited":
      return `${params.actorName} ${targetName} kisini ekibe davet etti.`;
    case "workspace.member.role_updated":
      return `${params.actorName} ${targetName} icin rolü ${metadata?.roleTo ?? metadata?.role ?? "guncelledi"} olarak degistirdi.`;
    case "task.moved":
      return `${params.projectName ?? "Proje"} icinde ${metadata?.fromSectionName ?? "bir kolon"} -> ${metadata?.toSectionName ?? "yeni kolon"}.`;
    case "task.assignee_changed": {
      const assigneeChange = metadata?.changes?.find((change) => change.field === "assigneeId");
      return `${params.actorName} gorevi ${assigneeChange?.from ?? "atanmamis"} -> ${assigneeChange?.to ?? "atanmamis"} olarak guncelledi.`;
    }
    case "task.due_date_changed": {
      const dueChange = metadata?.changes?.find((change) => change.field === "dueDate");
      return `${params.actorName} teslim tarihini ${dueChange?.from ?? "-"} -> ${dueChange?.to ?? "-" } olarak degistirdi.`;
    }
    case "task.updated":
      return metadata?.changes?.length
        ? metadata.changes.map((change) => `${change.label}: ${change.from ?? "-"} -> ${change.to ?? "-"}`).join(" • ")
        : `${params.actorName} gorev alanlarini guncelledi.`;
    case "task.created":
      return `${params.actorName} yeni bir gorev karti acti.`;
    case "task.deleted":
      return `${params.actorName} gorev kaydini kaldirdi.`;
    case "task.commented":
      return `${params.actorName} gorev uzerine yeni bir not birakti.`;
    case "task.attachment.created":
      return `${params.actorName} ${metadata?.name ?? "yeni bir dosya"} ekledi.`;
    case "task.attachment.deleted":
      return `${params.actorName} ${metadata?.name ?? "bir dosyayi"} kaldirdi.`;
    default:
      return `${params.actorName} • ${params.action}`;
  }
}

export function isMentionForUser(metadataValue: unknown, userId: string) {
  const metadata = readMetadata(metadataValue);
  return metadata?.targetUserId === userId;
}

export function isProjectUpdate(action: string) {
  return action.startsWith("project.") || action.startsWith("task.");
}

export function shouldSurfaceAsActionRequired(action: string, metadataValue: unknown, userId: string) {
  const severity = getActivitySeverity(action, metadataValue);
  if (severity === "critical") return true;
  if (isMentionForUser(metadataValue, userId)) return true;
  return action === "task.due_date_changed" || action === "task.assignee_changed";
}
