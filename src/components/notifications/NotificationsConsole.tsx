"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BellRing, CheckCheck, FolderKanban, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  meta: string;
  unread: boolean;
};

interface NotificationsConsoleProps {
  workspaceName: string;
  riskAlertsEnabled: boolean;
  activityAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  overdueItems: NotificationItem[];
  activityItems: NotificationItem[];
}

export default function NotificationsConsole({
  workspaceName,
  riskAlertsEnabled,
  activityAlertsEnabled,
  weeklyDigestEnabled,
  overdueItems,
  activityItems,
}: NotificationsConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unreadCount = [...overdueItems, ...activityItems].filter((item) => item.unread).length;

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
        if (!res.ok) {
          throw new Error(data.error ?? "Bildirimler guncellenemedi.");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bildirimler guncellenemedi.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <BellRing size={13} />
            Notifications Center
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Alerts, activity ve operasyon sinyalleri</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {workspaceName} icin teslim riski ve ekip hareketleri ayni merkezde toplanir. Unread sayaci her kullanici icin
            workspace bazinda kalici tutulur.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Yeni sinyal</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{unreadCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
            Risk: {riskAlertsEnabled ? "Acik" : "Kapali"} • Activity: {activityAlertsEnabled ? "Acik" : "Kapali"} • Haftalik ozet: {weeklyDigestEnabled ? "Hazir" : "Kapali"}
          </div>
          <Button type="button" variant="outline" loading={isPending} onClick={markAllAsRead}>
            <CheckCheck size={15} />
            Tumunu okundu yap
          </Button>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-black text-slate-950">
                <TriangleAlert size={18} className="text-red-500" />
                Teslim Riski
              </div>
              <p className="mt-2 text-sm text-slate-600">Geciken veya kritik tarihe yakin acik isleri once burada gorun.</p>
            </div>
            <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {overdueItems.filter((item) => item.unread).length} yeni
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {!riskAlertsEnabled && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Teslim riski alarmlari ayarlardan susturuldu.
              </div>
            )}
            {riskAlertsEnabled && overdueItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Su anda geciken acik gorev yok.
              </div>
            )}

            {riskAlertsEnabled && overdueItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-[24px] border px-4 py-4 transition hover:bg-white ${item.unread ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                      {item.title}
                      {item.unread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">{item.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-black text-slate-950">
                <FolderKanban size={18} className="text-indigo-600" />
                Activity Stream
              </div>
              <p className="mt-2 text-sm text-slate-600">Son ekip hareketleri ve proje akisi tek bir sirali feed icinde gorunur.</p>
            </div>
            <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {activityItems.filter((item) => item.unread).length} yeni
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {!activityAlertsEnabled && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Ekip activity akisi ayarlardan kapatildi.
              </div>
            )}

            {activityAlertsEnabled && activityItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-[24px] border px-4 py-4 transition hover:bg-white ${item.unread ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                      {item.title}
                      {item.unread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">{item.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
