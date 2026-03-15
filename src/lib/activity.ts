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
  plan?: string | null;
  fromSectionName?: string | null;
  toSectionName?: string | null;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
  invitedEmail?: string | null;
  clientName?: string | null;
  billingEmail?: string | null;
  seatCap?: number | null;
  allowOverage?: boolean | null;
  usageAlertThresholdPct?: number | null;
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
  if (action === "export.created") return "workspace";
  if (action.startsWith("client.portal")) return "project";
  if (action.startsWith("milestone.") || action.startsWith("risk.")) return "project";
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
  if (action === "risk.created" || action === "risk.updated" || action === "milestone.created" || action === "milestone.updated") {
    return "warning";
  }
  if (action === "workspace.preference_changed") return "info";
  if (action === "workspace.billing_updated") return "info";
  if (action === "workspace.integration_updated") return "info";
  if (action === "export.created") return "info";
  if (action.startsWith("client.portal")) return "info";
  if (action === "task.moved" || action === "task.updated" || action === "project.created") return "info";
  if (action === "task.deleted") return "critical";
  return "info";
}

export function getActivityTitle(action: string) {
  const labelMap: Record<string, string> = {
    "project.created": "Yeni proje olusturuldu",
    "workspace.updated": "Workspace ayarlari guncellendi",
    "workspace.preference_changed": "Bildirim tercihleri guncellendi",
    "workspace.billing_updated": "Billing ayarlari guncellendi",
    "workspace.integration_updated": "Integration ayarlari guncellendi",
    "export.created": "Export olusturuldu",
    "client.portal_published": "Client portal yayinlandi",
    "client.portal_updated": "Client portal guncellendi",
    "client.portal_unpublished": "Client portal taslaga alindi",
    "client.portal_token_regenerated": "Client portal linki yenilendi",
    "workspace.member.invited": "Yeni ekip uyesi davet edildi",
    "workspace.member.role_updated": "Rol yetkisi guncellendi",
    "task.created": "Yeni gorev olusturuldu",
    "task.updated": "Gorev guncellendi",
    "task.assignee_changed": "Gorev sahipligi degisti",
    "task.due_date_changed": "Teslim tarihi guncellendi",
    "task.deleted": "Gorev silindi",
    "task.moved": "Gorev kolon degistirdi",
    "milestone.created": "Yeni milestone eklendi",
    "milestone.updated": "Milestone guncellendi",
    "risk.created": "Risk kaydi olusturuldu",
    "risk.updated": "Risk kaydi guncellendi",
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
    case "workspace.billing_updated":
      return `${params.actorName} billing planini ${metadata?.plan ?? "guncel"} seviyesine aldi ve usage guardrail ayarlarini kaydetti.`;
    case "workspace.integration_updated":
      return `${params.actorName} ${metadata?.name ?? "integration"} baglantisini ${metadata?.status ?? "guncel"} duruma getirdi.`;
    case "export.created":
      return `${params.actorName} filtrelenmis timeline verisini disa aktardi.`;
    case "client.portal_published":
      return `${params.actorName} ${metadata?.clientName ?? "client"} icin read-only portal yayina aldi.`;
    case "client.portal_updated":
      return `${params.actorName} ${metadata?.clientName ?? "client"} portal mesajini veya gorunumunu guncelledi.`;
    case "client.portal_unpublished":
      return `${params.actorName} ${metadata?.clientName ?? "client"} portalini taslak moduna aldi.`;
    case "client.portal_token_regenerated":
      return `${params.actorName} ${metadata?.clientName ?? "client"} portal baglantisini yeniledi.`;
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
    case "milestone.created":
      return `${params.actorName} ${metadata?.title ?? "yeni bir milestone"} kaydi ekledi.`;
    case "milestone.updated":
      return `${params.actorName} ${metadata?.title ?? "milestone"} kaydini guncelledi.`;
    case "risk.created":
      return `${params.actorName} ${metadata?.title ?? "risk"} icin yeni bir kayit olusturdu.`;
    case "risk.updated":
      return `${params.actorName} ${metadata?.title ?? "risk"} kaydini guncelledi.`;
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
  return action === "task.due_date_changed" || action === "task.assignee_changed" || action === "risk.created";
}
