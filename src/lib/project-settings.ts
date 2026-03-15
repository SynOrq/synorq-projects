import type { Priority, ProjectStatus, ProjectType, ProjectVisibility } from "@prisma/client";

export const VALID_PROJECT_TYPES: ProjectType[] = ["WEBSITE", "MOBILE_APP", "RETAINER", "INTERNAL", "MAINTENANCE"];
export const VALID_PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
export const VALID_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const VALID_PROJECT_VISIBILITY: ProjectVisibility[] = ["WORKSPACE", "MEMBERS", "LEADERSHIP", "PRIVATE"];

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value: unknown) {
  if (value === null || value === "" || typeof value === "undefined") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function normalizeProjectUpdatePayload(body: Record<string, unknown>) {
  const name = normalizeText(body.name);
  if (!name) {
    return { error: "Proje adi zorunludur." } as const;
  }

  const status = typeof body.status === "string" ? body.status.toUpperCase() : "ACTIVE";
  if (!VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) {
    return { error: "Gecersiz proje durumu." } as const;
  }

  const type = typeof body.type === "string" ? body.type.toUpperCase() : "INTERNAL";
  if (!VALID_PROJECT_TYPES.includes(type as ProjectType)) {
    return { error: "Gecersiz proje tipi." } as const;
  }

  const priority = typeof body.priority === "string" ? body.priority.toUpperCase() : "MEDIUM";
  if (!VALID_PRIORITIES.includes(priority as Priority)) {
    return { error: "Gecersiz proje onceligi." } as const;
  }

  const visibility = typeof body.visibility === "string" ? body.visibility.toUpperCase() : "WORKSPACE";
  if (!VALID_PROJECT_VISIBILITY.includes(visibility as ProjectVisibility)) {
    return { error: "Gecersiz proje gorunurluk seviyesi." } as const;
  }

  const startDate = normalizeDate(body.startDate);
  if (typeof body.startDate !== "undefined" && typeof startDate === "undefined") {
    return { error: "Gecersiz baslangic tarihi." } as const;
  }

  const dueDate = normalizeDate(body.dueDate);
  if (typeof body.dueDate !== "undefined" && typeof dueDate === "undefined") {
    return { error: "Gecersiz hedef teslim tarihi." } as const;
  }

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    data: {
      name,
      description: normalizeText(body.description),
      color: typeof body.color === "string" && body.color.trim() ? body.color : "#6366f1",
      status: status as ProjectStatus,
      type: type as ProjectType,
      visibility: visibility as ProjectVisibility,
      priority: priority as Priority,
      startDate,
      dueDate,
      tags,
      ownerId: typeof body.ownerId === "string" && body.ownerId ? body.ownerId : null,
      clientId: typeof body.clientId === "string" && body.clientId ? body.clientId : null,
    },
  } as const;
}
