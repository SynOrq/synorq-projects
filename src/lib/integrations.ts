export type WorkspaceIntegrationProvider = "SLACK" | "GOOGLE_CALENDAR" | "WEBHOOK" | "API_KEY";
export type WorkspaceIntegrationStatus = "DISCONNECTED" | "CONNECTED" | "ERROR";

type MutationResult<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export const WORKSPACE_INTEGRATION_PROVIDERS: Array<{
  value: WorkspaceIntegrationProvider;
  label: string;
  note: string;
}> = [
  { value: "SLACK", label: "Slack", note: "Action required routing ve digest kanal baglantisi." },
  { value: "GOOGLE_CALENDAR", label: "Google Calendar", note: "Milestone ve due-date sync window." },
  { value: "WEBHOOK", label: "Webhook", note: "Outbound event delivery surface." },
  { value: "API_KEY", label: "API Key", note: "Workspace-level automation access." },
];

export const WORKSPACE_INTEGRATION_STATUS_OPTIONS: Array<{ value: WorkspaceIntegrationStatus; label: string }> = [
  { value: "DISCONNECTED", label: "Disconnected" },
  { value: "CONNECTED", label: "Connected" },
  { value: "ERROR", label: "Error" },
];

const webhookEvents = [
  "project.updated",
  "task.assignee_changed",
  "risk.created",
  "milestone.updated",
  "workspace.billing_updated",
] as const;

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function normalizeAbsoluteUrl(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return normalized;
  } catch {
    return undefined;
  }
  return undefined;
}

export function normalizeWorkspaceIntegrationPayload(
  provider: WorkspaceIntegrationProvider,
  body: Record<string, unknown>
): MutationResult<{
  status: WorkspaceIntegrationStatus;
  label: string | null;
  config: Record<string, unknown>;
  lastSyncedAt: Date | null;
}> {
  const rawStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : null;
  const allowedStatuses = new Set(WORKSPACE_INTEGRATION_STATUS_OPTIONS.map((item) => item.value));
  const label = normalizeText(body.label);
  const lastSyncedAt = body.lastSyncedAt ? new Date(String(body.lastSyncedAt)) : null;

  if (!rawStatus || !allowedStatuses.has(rawStatus as WorkspaceIntegrationStatus)) {
    return { error: "Gecersiz integration durumu." };
  }

  if (lastSyncedAt && Number.isNaN(lastSyncedAt.getTime())) {
    return { error: "Last sync tarihi gecersiz." };
  }

  if (provider === "SLACK") {
    const channel = normalizeText(body.channel);
    if (!channel) return { error: "Slack channel zorunlu." };

    return {
      data: {
        status: rawStatus as WorkspaceIntegrationStatus,
        label,
        config: {
          channel,
        },
        lastSyncedAt,
      },
    };
  }

  if (provider === "GOOGLE_CALENDAR") {
    const calendarId = normalizeText(body.calendarId);
    const syncWindowDays = normalizeInteger(body.syncWindowDays);

    if (!calendarId) return { error: "Calendar ID zorunlu." };
    if (syncWindowDays === undefined || syncWindowDays === null || syncWindowDays < 7 || syncWindowDays > 90) {
      return { error: "Sync window 7 ile 90 gun arasinda olmali." };
    }

    return {
      data: {
        status: rawStatus as WorkspaceIntegrationStatus,
        label,
        config: {
          calendarId,
          syncWindowDays,
        },
        lastSyncedAt,
      },
    };
  }

  if (provider === "WEBHOOK") {
    const endpoint = normalizeAbsoluteUrl(body.endpoint);
    const secretPreview = normalizeText(body.secretPreview);
    const events = Array.isArray(body.events)
      ? body.events.filter((item): item is (typeof webhookEvents)[number] => typeof item === "string" && webhookEvents.includes(item as never))
      : [];

    if (endpoint === undefined) return { error: "Webhook endpoint gecersiz." };
    if (!endpoint) return { error: "Webhook endpoint zorunlu." };
    if (events.length === 0) return { error: "En az bir webhook eventi secin." };

    return {
      data: {
        status: rawStatus as WorkspaceIntegrationStatus,
        label,
        config: {
          endpoint,
          secretPreview,
          events,
        },
        lastSyncedAt,
      },
    };
  }

  const keyName = normalizeText(body.keyName);
  const secretPreview = normalizeText(body.secretPreview);
  if (!keyName) return { error: "API key adi zorunlu." };
  if (!secretPreview || secretPreview.length < 6) return { error: "API key preview zorunlu." };

  return {
    data: {
      status: rawStatus as WorkspaceIntegrationStatus,
      label,
      config: {
        keyName,
        secretPreview,
      },
      lastSyncedAt,
    },
  };
}

export function summarizeWorkspaceIntegrations(
  integrations: Array<{
    provider: WorkspaceIntegrationProvider;
    status: WorkspaceIntegrationStatus;
    config: Record<string, unknown> | null;
  }>
) {
  const isConfigured = (config: Record<string, unknown> | null) => {
    if (!config) return false;
    return Object.keys(config).length > 0;
  };

  return {
    connected: integrations.filter((item) => item.status === "CONNECTED").length,
    errors: integrations.filter((item) => item.status === "ERROR").length,
    configured: integrations.filter((item) => isConfigured(item.config)).length,
  };
}

export { webhookEvents as WORKSPACE_WEBHOOK_EVENTS };
