export type NotificationConsoleState = {
  archivedIds: string[];
  snoozedUntil: Record<string, string>;
};

export function normalizeNotificationConsoleState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { archivedIds: [], snoozedUntil: {} } satisfies NotificationConsoleState;
  }

  const record = value as Record<string, unknown>;
  const archivedIds = Array.isArray(record.archivedIds)
    ? record.archivedIds.filter((item): item is string => typeof item === "string")
    : [];

  const snoozedUntil =
    record.snoozedUntil && typeof record.snoozedUntil === "object" && !Array.isArray(record.snoozedUntil)
      ? Object.fromEntries(
          Object.entries(record.snoozedUntil).filter(
            (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
          )
        )
      : {};

  return {
    archivedIds,
    snoozedUntil,
  } satisfies NotificationConsoleState;
}

export function applyNotificationConsoleState<T extends { id: string }>(
  items: T[],
  state: NotificationConsoleState,
  now = new Date()
) {
  return items.filter((item) => {
    if (state.archivedIds.includes(item.id)) return false;
    const snoozed = state.snoozedUntil[item.id];
    if (!snoozed) return true;
    const until = new Date(snoozed);
    if (Number.isNaN(until.getTime())) return true;
    return until <= now;
  });
}

export function buildNotificationConsoleState(params: {
  current: NotificationConsoleState;
  archiveIds?: string[];
  unarchiveIds?: string[];
  snooze?: {
    ids: string[];
    until: string;
  } | null;
  clearSnoozeIds?: string[];
}) {
  const archivedIds = new Set(params.current.archivedIds);
  const snoozedUntil = { ...params.current.snoozedUntil };

  for (const id of params.archiveIds ?? []) archivedIds.add(id);
  for (const id of params.unarchiveIds ?? []) archivedIds.delete(id);

  if (params.snooze) {
    for (const id of params.snooze.ids) {
      snoozedUntil[id] = params.snooze.until;
    }
  }

  for (const id of params.clearSnoozeIds ?? []) {
    delete snoozedUntil[id];
  }

  return {
    archivedIds: [...archivedIds],
    snoozedUntil,
  } satisfies NotificationConsoleState;
}
