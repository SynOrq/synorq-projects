"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, BellRing, CheckCheck, Clock3, Layers3, MoonStar, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applyNotificationConsoleState,
  buildNotificationConsoleState,
  type NotificationConsoleState,
} from "@/lib/notifications";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  meta: string;
  unread: boolean;
  kind: "risk" | "action" | "activity";
  severity: "info" | "warning" | "critical";
  category?: string;
  scope: {
    mine: boolean;
    risk: boolean;
    project: boolean;
    mention: boolean;
  };
};

type DigestSummary = {
  activeProjectSignals: number;
  riskSignals: number;
  mentionSignals: number;
  summary: string[];
  weeklyDigestEnabled: boolean;
};

interface NotificationsConsoleProps {
  workspaceName: string;
  riskAlertsEnabled: boolean;
  activityAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  items: NotificationItem[];
  digest: DigestSummary;
  initialConsoleState: NotificationConsoleState;
}

const tabs = [
  { id: "action", label: "Action Required" },
  { id: "activity", label: "Activity" },
  { id: "digest", label: "Digest" },
] as const;

const filters = [
  { id: "all", label: "Tum sinyaller" },
  { id: "mine", label: "Sadece bana ait" },
  { id: "risk", label: "Sadece risk" },
  { id: "project", label: "Proje guncellemeleri" },
  { id: "mention", label: "Mention / sahiplik" },
] as const;

export default function NotificationsConsole({
  workspaceName,
  riskAlertsEnabled,
  activityAlertsEnabled,
  weeklyDigestEnabled,
  items,
  digest,
  initialConsoleState,
}: NotificationsConsoleProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("action");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [consoleState, setConsoleState] = useState<NotificationConsoleState>(initialConsoleState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [localRiskAlertsEnabled, setLocalRiskAlertsEnabled] = useState(riskAlertsEnabled);
  const [localActivityAlertsEnabled, setLocalActivityAlertsEnabled] = useState(activityAlertsEnabled);
  const [localWeeklyDigestEnabled, setLocalWeeklyDigestEnabled] = useState(weeklyDigestEnabled);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConsolePending, startConsoleTransition] = useTransition();
  const [isMarkPending, startMarkTransition] = useTransition();
  const [isRulesPending, startRulesTransition] = useTransition();

  const liveItems = useMemo(() => applyNotificationConsoleState(items, consoleState), [consoleState, items]);
  const archivedSet = useMemo(() => new Set(consoleState.archivedIds), [consoleState.archivedIds]);
  const snoozedSet = useMemo(() => {
    const now = new Date();
    return new Set(
      Object.entries(consoleState.snoozedUntil)
        .filter(([, value]) => {
          const until = new Date(value);
          return !Number.isNaN(until.getTime()) && until > now;
        })
        .map(([id]) => id)
    );
  }, [consoleState.snoozedUntil]);

  const unreadCount = liveItems.filter((item) => item.unread).length;
  const archivedCount = archivedSet.size;
  const snoozedCount = snoozedSet.size;

  const filteredItems = useMemo(() => {
    const scopedItems = items.filter((item) => {
      const matchesTab =
        tab === "action"
          ? item.kind === "risk" || item.kind === "action"
          : tab === "activity"
            ? item.kind === "activity"
            : false;

      if (tab !== "digest" && !matchesTab) return false;
      if (tab === "digest") return false;

      if (filter === "all") return true;
      if (filter === "mine") return item.scope.mine;
      if (filter === "risk") return item.scope.risk;
      if (filter === "project") return item.scope.project;
      if (filter === "mention") return item.scope.mention;
      return true;
    });

    if (showArchived || showSnoozed) {
      return scopedItems.filter((item) => {
        if (showArchived && showSnoozed) {
          return archivedSet.has(item.id) || snoozedSet.has(item.id);
        }
        if (showArchived) return archivedSet.has(item.id);
        if (showSnoozed) return snoozedSet.has(item.id);
        return true;
      });
    }

    return applyNotificationConsoleState(scopedItems, consoleState);
  }, [archivedSet, consoleState, filter, items, showArchived, showSnoozed, snoozedSet, tab]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasArchivedSelection = selectedIds.some((id) => archivedSet.has(id));
  const hasLiveSelection = selectedIds.some((id) => !archivedSet.has(id));
  const hasSnoozedSelection = selectedIds.some((id) => snoozedSet.has(id));

  function clearMessages() {
    setError(null);
    setFeedback(null);
  }

  async function persistConsoleState(nextState: NotificationConsoleState, successMessage: string) {
    const res = await fetch("/api/workspace/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationConsoleState: nextState }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Bildirim konsolu guncellenemedi.");

    setConsoleState(nextState);
    setSelectedIds([]);
    setFeedback(successMessage);
  }

  function updateConsoleState(nextState: NotificationConsoleState, successMessage: string) {
    startConsoleTransition(async () => {
      clearMessages();

      try {
        await persistConsoleState(nextState, successMessage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bildirim konsolu guncellenemedi.");
      }
    });
  }

  function markAllAsRead() {
    startMarkTransition(async () => {
      clearMessages();

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markNotificationsRead: true }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Bildirimler guncellenemedi.");
        setFeedback("Tum gorunur bildirimler okundu olarak isaretlendi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bildirimler guncellenemedi.");
      }
    });
  }

  function saveRules() {
    startRulesTransition(async () => {
      clearMessages();

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riskAlertsEnabled: localRiskAlertsEnabled,
            activityAlertsEnabled: localActivityAlertsEnabled,
            weeklyDigestEnabled: localWeeklyDigestEnabled,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Bildirim kurallari guncellenemedi.");

        setLocalRiskAlertsEnabled(data.state.riskAlertsEnabled ?? true);
        setLocalActivityAlertsEnabled(data.state.activityAlertsEnabled ?? true);
        setLocalWeeklyDigestEnabled(data.state.weeklyDigestEnabled ?? false);
        setFeedback("Bildirim kurallari kaydedildi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bildirim kurallari guncellenemedi.");
      }
    });
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      if (filteredItems.length === 0) return current;
      const allVisibleSelected = filteredItems.every((item) => current.includes(item.id));
      if (allVisibleSelected) {
        return current.filter((id) => !filteredItems.some((item) => item.id === id));
      }

      return [...new Set([...current, ...filteredItems.map((item) => item.id)])];
    });
  }

  function archiveIds(ids: string[]) {
    if (ids.length === 0) return;

    const nextState = buildNotificationConsoleState({
      current: consoleState,
      archiveIds: ids,
      clearSnoozeIds: ids,
    });

    updateConsoleState(nextState, `${ids.length} bildirim arsive tasindi.`);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  function unarchiveIds(ids: string[]) {
    if (ids.length === 0) return;

    const nextState = buildNotificationConsoleState({
      current: consoleState,
      unarchiveIds: ids,
    });

    updateConsoleState(nextState, `${ids.length} bildirim arsivden cikarildi.`);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  function snoozeIds(ids: string[], days: number) {
    if (ids.length === 0) return;

    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const nextState = buildNotificationConsoleState({
      current: consoleState,
      unarchiveIds: ids,
      snooze: {
        ids,
        until,
      },
    });

    updateConsoleState(nextState, `${ids.length} bildirim ${days} gun ertelendi.`);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  function clearSnooze(ids: string[]) {
    if (ids.length === 0) return;

    const nextState = buildNotificationConsoleState({
      current: consoleState,
      clearSnoozeIds: ids,
    });

    updateConsoleState(nextState, `${ids.length} bildirim tekrar aktif edildi.`);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <BellRing size={13} />
              Notifications Center
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Action queue, activity ve weekly digest</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {workspaceName} icin karar bekleyen riskler, ekip hareketleri ve haftalik ozet ayni merkezde toplanir.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Yeni sinyal</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Arsivlenebilir</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{archivedCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ertelenen</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{snoozedCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
              Risk: {localRiskAlertsEnabled ? "Acik" : "Kapali"} • Activity: {localActivityAlertsEnabled ? "Acik" : "Kapali"} • Digest: {localWeeklyDigestEnabled ? "Acik" : "Kapali"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" loading={isMarkPending} onClick={markAllAsRead}>
              <CheckCheck size={15} />
              Tumunu okundu yap
            </Button>
          </div>
        </div>

        {tab !== "digest" && (
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  filter === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab !== "digest" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => {
                setShowArchived((current) => !current);
                setShowSnoozed(false);
                setSelectedIds([]);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                showArchived ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Arsiv
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSnoozed((current) => !current);
                setShowArchived(false);
                setSelectedIds([]);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                showSnoozed ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Snoozed
            </button>
            <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {showArchived ? "Arsiv kayitlari" : showSnoozed ? "Ertelenen kayitlar" : "Canli queue"}
            </div>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {feedback && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

      {tab === "digest" ? (
        <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Layers3 size={18} className="text-indigo-600" />
              Haftalik ozet
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Proje sinyali</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{digest.activeProjectSignals}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Risk</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{digest.riskSignals}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Mention</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{digest.mentionSignals}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-slate-900">Digest notes</div>
              <Button asChild variant="outline" size="sm">
                <Link href="/reports/digest">
                  Executive view
                </Link>
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {digest.summary.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {item}
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                Weekly digest tercihi {digest.weeklyDigestEnabled ? "aktif" : "pasif"} durumda. Ayrintili e-posta/export akisi sonraki fazda eklenecek.
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">Notification rules</div>
                <p className="mt-1 text-sm text-slate-600">Action, activity ve digest akisini delivery posture ile uyumlu tutun.</p>
              </div>
              <Button type="button" variant="outline" loading={isRulesPending} onClick={saveRules}>
                Kurallari kaydet
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  id: "risk",
                  label: "Risk signals",
                  description: "Geciken task, kritik risk ve teslim dususu Action Required sekmesine duser.",
                  checked: localRiskAlertsEnabled,
                  onChange: setLocalRiskAlertsEnabled,
                },
                {
                  id: "activity",
                  label: "Activity stream",
                  description: "Yorum, sahiplik degisimi ve proje hareketleri Activity akisinda tutulur.",
                  checked: localActivityAlertsEnabled,
                  onChange: setLocalActivityAlertsEnabled,
                },
                {
                  id: "digest",
                  label: "Weekly digest",
                  description: "Haftalik ozet ve rapor snapshot akisini aktif tutar.",
                  checked: localWeeklyDigestEnabled,
                  onChange: setLocalWeeklyDigestEnabled,
                },
              ].map((rule) => (
                <label key={rule.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={rule.checked}
                    onChange={(event) => rule.onChange(event.target.checked)}
                    disabled={isRulesPending}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{rule.label}</div>
                    <div className="mt-1 text-xs leading-6 text-slate-500">{rule.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {tab === "action" ? "Action Required" : "Activity"}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {tab === "action"
                    ? "Teslim riski, sahiplik degisimi ve aksiyon bekleyen olaylar."
                    : "Ekip hareketleri ve proje akisindaki son guncellemeler."}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredItems.length} kayit
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && filteredItems.every((item) => selectedSet.has(item.id))}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Tum gorunur kayitlari sec
              </label>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedIds.length} secili
              </div>
              <Button type="button" size="sm" variant="outline" disabled={!hasLiveSelection || isConsolePending} onClick={() => archiveIds(selectedIds.filter((id) => !archivedSet.has(id)))}>
                <Archive size={14} />
                Arsivle
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!hasArchivedSelection || isConsolePending} onClick={() => unarchiveIds(selectedIds.filter((id) => archivedSet.has(id)))}>
                <ArchiveRestore size={14} />
                Arsivden cikar
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={selectedIds.length === 0 || isConsolePending} onClick={() => snoozeIds(selectedIds, 1)}>
                <MoonStar size={14} />
                1 gun ertele
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={selectedIds.length === 0 || isConsolePending} onClick={() => snoozeIds(selectedIds, 7)}>
                <Clock3 size={14} />
                1 hafta ertele
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={!hasSnoozedSelection || isConsolePending} onClick={() => clearSnooze(selectedIds.filter((id) => snoozedSet.has(id)))}>
                Snooze kaldir
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Secili tab ve filtre icin kayit bulunamadi.
              </div>
            )}

            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border px-4 py-4 transition hover:bg-white ${
                  item.unread ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={item.href} className="text-sm font-semibold text-slate-900 hover:text-indigo-700">
                          {item.title}
                        </Link>
                        {item.unread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                        <Badge
                          variant={
                            item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "secondary"
                          }
                        >
                          {item.severity === "critical" ? "Critical" : item.severity === "warning" ? "Warning" : "Info"}
                        </Badge>
                        {archivedSet.has(item.id) && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">Arsiv</span>}
                        {snoozedSet.has(item.id) && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">Snoozed</span>}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.scope.mine && <span className="rounded-full bg-white px-2.5 py-1">Bana ait</span>}
                        {item.scope.risk && <span className="rounded-full bg-white px-2.5 py-1">Risk</span>}
                        {item.scope.project && <span className="rounded-full bg-white px-2.5 py-1">Project update</span>}
                        {item.scope.mention && <span className="rounded-full bg-white px-2.5 py-1">Mention</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.kind === "risk" || item.severity === "critical" ? (
                        <TriangleAlert size={14} className="text-red-500" />
                      ) : (
                        <Clock3 size={14} className="text-slate-400" />
                      )}
                      <span className="text-xs text-slate-500">{item.meta}</span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!archivedSet.has(item.id) ? (
                        <Button type="button" size="sm" variant="ghost" disabled={isConsolePending} onClick={() => archiveIds([item.id])}>
                          <Archive size={14} />
                          Arsivle
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="ghost" disabled={isConsolePending} onClick={() => unarchiveIds([item.id])}>
                          <ArchiveRestore size={14} />
                          Geri al
                        </Button>
                      )}
                      {!snoozedSet.has(item.id) ? (
                        <Button type="button" size="sm" variant="ghost" disabled={isConsolePending} onClick={() => snoozeIds([item.id], 3)}>
                          <MoonStar size={14} />
                          3 gun ertele
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="ghost" disabled={isConsolePending} onClick={() => clearSnooze([item.id])}>
                          Snooze kaldir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
