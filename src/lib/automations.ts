export type WorkspaceAutomationTrigger =
  | "TASK_OVERDUE"
  | "RISK_CREATED"
  | "MILESTONE_AT_RISK"
  | "WEEKLY_DIGEST_READY";
export type WorkspaceAutomationAction = "SLACK_MESSAGE" | "WEBHOOK" | "CREATE_TASK";
export type WorkspaceAutomationStatus = "DRAFT" | "ACTIVE" | "PAUSED";

type MutationResult<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export const WORKSPACE_AUTOMATION_TRIGGER_OPTIONS: Array<{
  value: WorkspaceAutomationTrigger;
  label: string;
  note: string;
}> = [
  { value: "TASK_OVERDUE", label: "Task overdue", note: "Overdue work sinyali olustugunda aksiyon uretir." },
  { value: "RISK_CREATED", label: "Risk created", note: "Yeni risk kaydi acildiginda routing tetikler." },
  { value: "MILESTONE_AT_RISK", label: "Milestone at risk", note: "Milestone posture AT_RISK oldugunda devreye girer." },
  { value: "WEEKLY_DIGEST_READY", label: "Weekly digest ready", note: "Haftalik leadership snapshot'i paylasir." },
];

export const WORKSPACE_AUTOMATION_ACTION_OPTIONS: Array<{
  value: WorkspaceAutomationAction;
  label: string;
  note: string;
}> = [
  { value: "SLACK_MESSAGE", label: "Slack message", note: "Slack kanalina otomatik delivery notu yollar." },
  { value: "WEBHOOK", label: "Webhook", note: "Harici sisteme normalized event gonderir." },
  { value: "CREATE_TASK", label: "Create task", note: "Workspace icinde takip gorevi acar." },
];

export const WORKSPACE_AUTOMATION_STATUS_OPTIONS: Array<{ value: WorkspaceAutomationStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

function normalizeText(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeInteger(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function normalizeAbsoluteUrl(value: unknown) {
  const normalized = normalizeText(value, 240);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return normalized;
  } catch {
    return undefined;
  }
  return undefined;
}

export function normalizeWorkspaceAutomationPayload(body: Record<string, unknown>): MutationResult<{
  name: string;
  description: string | null;
  trigger: WorkspaceAutomationTrigger;
  action: WorkspaceAutomationAction;
  status: WorkspaceAutomationStatus;
  targetProjectId: string | null;
  config: Record<string, unknown>;
  lastRunAt: Date | null;
}> {
  const name = normalizeText(body.name, 80);
  const description = normalizeText(body.description, 220);
  const trigger = typeof body.trigger === "string" ? body.trigger.trim().toUpperCase() : null;
  const action = typeof body.action === "string" ? body.action.trim().toUpperCase() : null;
  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : null;
  const targetProjectId = normalizeText(body.targetProjectId, 64);
  const lastRunAt = body.lastRunAt ? new Date(String(body.lastRunAt)) : null;

  if (!name) return { error: "Automation adi zorunlu." };
  if (!WORKSPACE_AUTOMATION_TRIGGER_OPTIONS.some((item) => item.value === trigger)) {
    return { error: "Gecersiz automation tetikleyicisi." };
  }
  if (!WORKSPACE_AUTOMATION_ACTION_OPTIONS.some((item) => item.value === action)) {
    return { error: "Gecersiz automation aksiyonu." };
  }
  if (!WORKSPACE_AUTOMATION_STATUS_OPTIONS.some((item) => item.value === status)) {
    return { error: "Gecersiz automation durumu." };
  }
  if (lastRunAt && Number.isNaN(lastRunAt.getTime())) {
    return { error: "Last run tarihi gecersiz." };
  }

  const normalizedTrigger = trigger as WorkspaceAutomationTrigger;
  const normalizedAction = action as WorkspaceAutomationAction;
  const config: Record<string, unknown> = {};

  if (normalizedTrigger === "TASK_OVERDUE") {
    const thresholdHours = normalizeInteger(body.thresholdHours);
    if (thresholdHours === undefined || thresholdHours === null || thresholdHours < 1 || thresholdHours > 168) {
      return { error: "Overdue threshold 1 ile 168 saat arasinda olmali." };
    }
    config.thresholdHours = thresholdHours;
  }

  if (normalizedTrigger === "RISK_CREATED" || normalizedTrigger === "MILESTONE_AT_RISK") {
    const severity = typeof body.severity === "string" ? body.severity.trim().toUpperCase() : null;
    if (severity && !["HIGH", "CRITICAL", "ANY"].includes(severity)) {
      return { error: "Severity filtresi gecersiz." };
    }
    config.severity = severity ?? "ANY";
  }

  if (normalizedTrigger === "WEEKLY_DIGEST_READY") {
    const digestDay = normalizeInteger(body.digestDay);
    if (digestDay === undefined || digestDay === null || digestDay < 1 || digestDay > 7) {
      return { error: "Digest day 1 ile 7 arasinda olmali." };
    }
    config.digestDay = digestDay;
  }

  if (normalizedAction === "SLACK_MESSAGE") {
    const channel = normalizeText(body.channel, 80);
    const messageTemplate = normalizeText(body.messageTemplate, 240);
    if (!channel) return { error: "Slack channel zorunlu." };
    if (!messageTemplate) return { error: "Message template zorunlu." };
    config.channel = channel;
    config.messageTemplate = messageTemplate;
  }

  if (normalizedAction === "WEBHOOK") {
    const endpoint = normalizeAbsoluteUrl(body.endpoint);
    if (endpoint === undefined) return { error: "Webhook endpoint gecersiz." };
    if (!endpoint) return { error: "Webhook endpoint zorunlu." };
    config.endpoint = endpoint;
  }

  if (normalizedAction === "CREATE_TASK") {
    const taskTitle = normalizeText(body.taskTitle, 120);
    const sectionName = normalizeText(body.sectionName, 80);
    const assigneeMode = typeof body.assigneeMode === "string" ? body.assigneeMode.trim().toUpperCase() : null;
    if (!taskTitle) return { error: "Task title zorunlu." };
    if (assigneeMode && !["PROJECT_OWNER", "WORKSPACE_OWNER", "UNASSIGNED"].includes(assigneeMode)) {
      return { error: "Assignee mode gecersiz." };
    }
    config.taskTitle = taskTitle;
    config.sectionName = sectionName ?? "Planlandi";
    config.assigneeMode = assigneeMode ?? "PROJECT_OWNER";
  }

  return {
    data: {
      name,
      description,
      trigger: normalizedTrigger,
      action: normalizedAction,
      status: status as WorkspaceAutomationStatus,
      targetProjectId,
      config,
      lastRunAt,
    },
  };
}

export function summarizeWorkspaceAutomations(
  automations: Array<{
    status: WorkspaceAutomationStatus;
    targetProjectId: string | null;
    action: WorkspaceAutomationAction;
  }>
) {
  return {
    active: automations.filter((item) => item.status === "ACTIVE").length,
    draft: automations.filter((item) => item.status === "DRAFT").length,
    paused: automations.filter((item) => item.status === "PAUSED").length,
    projectScoped: automations.filter((item) => Boolean(item.targetProjectId)).length,
    outbound: automations.filter((item) => item.action === "SLACK_MESSAGE" || item.action === "WEBHOOK").length,
  };
}
