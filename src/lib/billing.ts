type WorkspacePlan = "TEAM" | "GROWTH" | "SCALE" | "ENTERPRISE";
type WorkspaceBillingStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";

type MutationResult<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export const WORKSPACE_PLAN_OPTIONS: Array<{ value: WorkspacePlan; label: string }> = [
  { value: "TEAM", label: "Team" },
  { value: "GROWTH", label: "Growth" },
  { value: "SCALE", label: "Scale" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

export const WORKSPACE_BILLING_STATUS_OPTIONS: Array<{ value: WorkspaceBillingStatus; label: string }> = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CANCELED", label: "Canceled" },
];

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

function normalizeDate(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return undefined;
  return normalized.toLowerCase();
}

export function normalizeWorkspaceBillingPayload(body: Record<string, unknown>): MutationResult<{
  plan: WorkspacePlan;
  status: WorkspaceBillingStatus;
  billingEmail: string | null;
  seatCap: number | null;
  allowOverage: boolean;
  usageAlertThresholdPct: number;
  renewalDate: Date | null;
}> {
  const allowedPlans = new Set(WORKSPACE_PLAN_OPTIONS.map((item) => item.value));
  const allowedStatuses = new Set(WORKSPACE_BILLING_STATUS_OPTIONS.map((item) => item.value));

  const rawPlan = typeof body.plan === "string" ? body.plan.trim().toUpperCase() : null;
  const rawStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : null;
  const billingEmail = normalizeEmail(body.billingEmail);
  const seatCap = normalizeInteger(body.seatCap);
  const usageAlertThresholdPct = normalizeInteger(body.usageAlertThresholdPct);
  const renewalDate = normalizeDate(body.renewalDate);

  if (!rawPlan || !allowedPlans.has(rawPlan as WorkspacePlan)) {
    return { error: "Gecersiz workspace plani." };
  }

  if (!rawStatus || !allowedStatuses.has(rawStatus as WorkspaceBillingStatus)) {
    return { error: "Gecersiz billing durumu." };
  }

  if (billingEmail === undefined) {
    return { error: "Billing email gecersiz." };
  }

  if (seatCap === undefined || (seatCap !== null && seatCap < 1)) {
    return { error: "Seat cap pozitif bir tam sayi olmali." };
  }

  if (
    usageAlertThresholdPct === undefined ||
    usageAlertThresholdPct === null ||
    usageAlertThresholdPct < 50 ||
    usageAlertThresholdPct > 100
  ) {
    return { error: "Usage alert threshold 50 ile 100 arasinda olmali." };
  }

  if (renewalDate === undefined) {
    return { error: "Renewal tarihi gecersiz." };
  }

  return {
    data: {
      plan: rawPlan as WorkspacePlan,
      status: rawStatus as WorkspaceBillingStatus,
      billingEmail,
      seatCap,
      allowOverage: body.allowOverage === true,
      usageAlertThresholdPct,
      renewalDate,
    },
  };
}

export function buildWorkspaceBillingSummary(input: {
  plan: WorkspacePlan;
  status: WorkspaceBillingStatus;
  seatCap: number | null;
  allowOverage: boolean;
  usageAlertThresholdPct: number;
  activeMembers: number;
  viewerMembers: number;
  adminMembers: number;
  projectCount: number;
  publishedPortalCount: number;
  exportCountLast30Days: number;
  weeklyDigestEnabled: boolean;
}) {
  const elevatedSeats = input.adminMembers;
  const coreSeats = Math.max(0, input.activeMembers - input.viewerMembers);
  const seatUsagePct = input.seatCap ? Math.round((input.activeMembers / input.seatCap) * 100) : 0;
  const overageSeats = input.seatCap ? Math.max(0, input.activeMembers - input.seatCap) : 0;
  const alertState =
    input.status === "PAST_DUE" || (!input.allowOverage && overageSeats > 0)
      ? "critical"
      : input.seatCap && seatUsagePct >= input.usageAlertThresholdPct
        ? "warning"
        : "healthy";

  return {
    metrics: {
      activeMembers: input.activeMembers,
      coreSeats,
      viewerMembers: input.viewerMembers,
      elevatedSeats,
      projectCount: input.projectCount,
      publishedPortalCount: input.publishedPortalCount,
      exportCountLast30Days: input.exportCountLast30Days,
      seatUsagePct,
      overageSeats,
    },
    flags: {
      alertState,
      usageThresholdReached: input.seatCap ? seatUsagePct >= input.usageAlertThresholdPct : false,
      overageBlocked: Boolean(input.seatCap && overageSeats > 0 && !input.allowOverage),
      weeklyDigestEnabled: input.weeklyDigestEnabled,
    },
    guidance:
      alertState === "critical"
        ? "Seat kullanimi veya billing durumu hemen aksiyon gerektiriyor."
        : alertState === "warning"
          ? "Seat kullanimi alert threshold seviyesine yaklasti."
          : "Plan ve seat kullanimi kontrollu gorunuyor.",
  };
}
