import type { MilestoneStatus, RiskLevel, RiskStatus } from "@prisma/client";

export const VALID_MILESTONE_STATUSES: MilestoneStatus[] = ["PLANNED", "IN_PROGRESS", "AT_RISK", "COMPLETED"];
export const VALID_RISK_STATUSES: RiskStatus[] = ["OPEN", "MITIGATING", "WATCH", "CLOSED"];
export const VALID_RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

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

export function normalizeMilestonePayload(body: Record<string, unknown>) {
  const title = normalizeText(body.title);
  if (!title) return { error: "Milestone basligi zorunludur." } as const;

  const status = typeof body.status === "string" ? body.status.toUpperCase() : "PLANNED";
  if (!VALID_MILESTONE_STATUSES.includes(status as MilestoneStatus)) {
    return { error: "Gecersiz milestone durumu." } as const;
  }

  const dueDate = normalizeDate(body.dueDate);
  if (typeof body.dueDate !== "undefined" && typeof dueDate === "undefined") {
    return { error: "Gecersiz milestone tarihi." } as const;
  }

  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  return {
    data: {
      title,
      description: normalizeText(body.description),
      status: status as MilestoneStatus,
      dueDate,
      ownerId: typeof body.ownerId === "string" && body.ownerId ? body.ownerId : null,
      taskIds,
    },
  } as const;
}

export function normalizeRiskPayload(body: Record<string, unknown>) {
  const title = normalizeText(body.title);
  if (!title) return { error: "Risk basligi zorunludur." } as const;

  const status = typeof body.status === "string" ? body.status.toUpperCase() : "OPEN";
  if (!VALID_RISK_STATUSES.includes(status as RiskStatus)) {
    return { error: "Gecersiz risk durumu." } as const;
  }

  const impact = typeof body.impact === "string" ? body.impact.toUpperCase() : "MEDIUM";
  if (!VALID_RISK_LEVELS.includes(impact as RiskLevel)) {
    return { error: "Gecersiz risk impact seviyesi." } as const;
  }

  const likelihood = typeof body.likelihood === "string" ? body.likelihood.toUpperCase() : "MEDIUM";
  if (!VALID_RISK_LEVELS.includes(likelihood as RiskLevel)) {
    return { error: "Gecersiz risk likelihood seviyesi." } as const;
  }

  const dueDate = normalizeDate(body.dueDate);
  if (typeof body.dueDate !== "undefined" && typeof dueDate === "undefined") {
    return { error: "Gecersiz risk tarihi." } as const;
  }

  return {
    data: {
      title,
      description: normalizeText(body.description),
      status: status as RiskStatus,
      impact: impact as RiskLevel,
      likelihood: likelihood as RiskLevel,
      mitigationPlan: normalizeText(body.mitigationPlan),
      dueDate,
      ownerId: typeof body.ownerId === "string" && body.ownerId ? body.ownerId : null,
      taskId: typeof body.taskId === "string" && body.taskId ? body.taskId : null,
    },
  } as const;
}
