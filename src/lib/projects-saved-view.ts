type MutationResult<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export type SavedProjectsView = {
  label: string;
  q: string | null;
  status: "ALL" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  health: "all" | "good" | "steady" | "risk";
  view: "cards" | "table";
};

const validStatuses = new Set<SavedProjectsView["status"]>(["ALL", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
const validHealth = new Set<SavedProjectsView["health"]>(["all", "good", "steady", "risk"]);

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createSavedProjectsView(input: {
  q?: string | null;
  status?: string | null;
  health?: string | null;
  view?: string | null;
  label?: string | null;
}): SavedProjectsView {
  const status = validStatuses.has((input.status ?? "ALL") as SavedProjectsView["status"])
    ? (input.status as SavedProjectsView["status"])
    : "ALL";
  const health = validHealth.has((input.health ?? "all") as SavedProjectsView["health"])
    ? (input.health as SavedProjectsView["health"])
    : "all";
  const view = input.view === "table" ? "table" : "cards";
  const q = normalizeText(input.q);
  const label =
    normalizeText(input.label) ??
    (health === "risk"
      ? "Riskte olanlar"
      : status === "ON_HOLD"
        ? "Beklemede"
        : status === "ACTIVE"
          ? "Aktif teslimler"
          : q
            ? `Arama: ${q}`
            : view === "table"
              ? "Table portfolio"
              : "Tum projeler");

  return {
    label,
    q,
    status,
    health,
    view,
  };
}

export function normalizeSavedProjectsView(value: unknown): MutationResult<SavedProjectsView | null> {
  if (value === null) {
    return { data: null };
  }

  if (!value || typeof value !== "object") {
    return { error: "Kaydedilen proje gorunumu gecersiz." };
  }

  const record = value as Record<string, unknown>;
  const status = typeof record.status === "string" ? record.status.toUpperCase() : "ALL";
  const health = typeof record.health === "string" ? record.health.toLowerCase() : "all";
  const view = record.view === "table" ? "table" : "cards";

  if (!validStatuses.has(status as SavedProjectsView["status"])) {
    return { error: "Kaydedilen proje durumu gecersiz." };
  }

  if (!validHealth.has(health as SavedProjectsView["health"])) {
    return { error: "Kaydedilen proje sagligi gecersiz." };
  }

  return {
    data: createSavedProjectsView({
      q: typeof record.q === "string" ? record.q : null,
      status,
      health,
      view,
      label: typeof record.label === "string" ? record.label : null,
    }),
  };
}

export function resolveProjectFilters(
  params: {
    q?: string;
    status?: string;
    health?: string;
    view?: string;
  },
  savedView?: SavedProjectsView | null
) {
  const statusParam = typeof params.status === "string" ? params.status.toUpperCase() : null;
  const healthParam = typeof params.health === "string" ? params.health.toLowerCase() : null;

  return {
    q: normalizeText(params.q) ?? savedView?.q ?? "",
    status: validStatuses.has(statusParam as SavedProjectsView["status"])
      ? (statusParam as SavedProjectsView["status"])
      : savedView?.status ?? "ALL",
    health: validHealth.has(healthParam as SavedProjectsView["health"])
      ? (healthParam as SavedProjectsView["health"])
      : savedView?.health ?? "all",
    view: params.view === "table" || params.view === "cards" ? params.view : savedView?.view ?? "cards",
  };
}
