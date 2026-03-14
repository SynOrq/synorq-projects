"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCheck, Clock3, Layers3, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}: NotificationsConsoleProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("action");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unreadCount = items.filter((item) => item.unread).length;
  const archivedCount = items.filter((item) => !item.unread).length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
  }, [filter, items, tab]);

  function markAllAsRead() {
    startTransition(async () => {
      setError(null);

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markNotificationsRead: true }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Bildirimler guncellenemedi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bildirimler guncellenemedi.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <BellRing size={13} />
            Notifications Center
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Action queue, activity ve weekly digest</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {workspaceName} icin karar bekleyen riskler, ekip hareketleri ve haftalik ozet ayni merkezde toplanir.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Yeni sinyal</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{unreadCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Arsivlenebilir</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{archivedCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
            Risk: {riskAlertsEnabled ? "Acik" : "Kapali"} • Activity: {activityAlertsEnabled ? "Acik" : "Kapali"} • Digest: {weeklyDigestEnabled ? "Acik" : "Kapali"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
            <Button type="button" variant="outline" loading={isPending} onClick={markAllAsRead}>
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
      </div>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {tab === "digest" ? (
        <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Layers3 size={18} className="text-indigo-600" />
              Haftalik ozet
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Proje sinyali</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{digest.activeProjectSignals}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Risk</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{digest.riskSignals}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Mention</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{digest.mentionSignals}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Digest notes</div>
            <div className="mt-4 space-y-3">
              {digest.summary.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {item}
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                Weekly digest tercihi {digest.weeklyDigestEnabled ? "aktif" : "pasif"} durumda. Ayrintili e-posta/export akisi sonraki fazda eklenecek.
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-slate-950">
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

          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Secili tab ve filtre icin kayit bulunamadi.
              </div>
            )}

            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-[24px] border px-4 py-4 transition hover:bg-white ${
                  item.unread ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      {item.unread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                      <Badge
                        variant={
                          item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "secondary"
                        }
                      >
                        {item.severity === "critical" ? "Critical" : item.severity === "warning" ? "Warning" : "Info"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.scope.mine && <span className="rounded-full bg-white px-2.5 py-1">Bana ait</span>}
                      {item.scope.risk && <span className="rounded-full bg-white px-2.5 py-1">Risk</span>}
                      {item.scope.project && <span className="rounded-full bg-white px-2.5 py-1">Project update</span>}
                      {item.scope.mention && <span className="rounded-full bg-white px-2.5 py-1">Mention</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {item.kind === "risk" || item.severity === "critical" ? (
                      <TriangleAlert size={14} className="text-red-500" />
                    ) : (
                      <Clock3 size={14} className="text-slate-400" />
                    )}
                    {item.meta}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
