import type { ActivityCategory, ActivityMetadata, ActivitySeverity } from "@/lib/activity";

export type AuditItemRecord = {
  id: string;
  action: string;
  title: string;
  detail: string;
  meta: string;
  category: ActivityCategory;
  severity: ActivitySeverity;
  projectName: string | null;
  actorName: string;
  createdAt: string;
  changes: NonNullable<ActivityMetadata>["changes"];
};

export type AuditFilterState = {
  scope: "all" | ActivityCategory;
  severity: "all" | ActivitySeverity;
  actor: string;
  range: "all" | "24h" | "7d" | "30d";
  query: string;
};

export function filterAuditItems(items: AuditItemRecord[], filters: AuditFilterState, now = new Date()) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const boundary =
    filters.range === "24h"
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : filters.range === "7d"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : filters.range === "30d"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : null;

  return items.filter((item) => {
    if (filters.scope !== "all" && item.category !== filters.scope) return false;
    if (filters.severity !== "all" && item.severity !== filters.severity) return false;
    if (filters.actor !== "all" && item.actorName !== filters.actor) return false;
    if (boundary && new Date(item.createdAt) < boundary) return false;
    if (!normalizedQuery) return true;

    return [item.title, item.detail, item.meta, item.projectName, item.actorName, item.action]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
}

export function buildAuditExportRows(items: AuditItemRecord[]) {
  return items.map((item) => ({
    createdAt: item.createdAt,
    actor: item.actorName,
    category: item.category,
    severity: item.severity,
    action: item.action,
    title: item.title,
    detail: item.detail,
    project: item.projectName ?? "",
    diff: item.changes?.map((change) => `${change.label}: ${change.from ?? "-"} -> ${change.to ?? "-"}`).join(" | ") ?? "",
  }));
}

export function serializeAuditRowsToCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escape = (value: string) => `"${value.replaceAll(`"`, `""`)}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(",")),
  ];

  return lines.join("\n");
}
