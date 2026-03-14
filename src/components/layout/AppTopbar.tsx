"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, BellRing, CheckCheck, FolderKanban, Rocket, Search, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "risk" | "activity";
  unread?: boolean;
};

type ChecklistItem = {
  label: string;
  done: boolean;
};

interface AppTopbarProps {
  workspaceName: string;
  activeProjectCount: number;
  overdueCount: number;
  unreadAlertCount: number;
  alerts: AlertItem[];
  checklist: ChecklistItem[];
  showChecklist: boolean;
}

export default function AppTopbar({
  workspaceName,
  activeProjectCount,
  overdueCount,
  unreadAlertCount,
  alerts,
  checklist,
  showChecklist,
}: AppTopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const completedChecklist = checklist.filter((item) => item.done).length;
  const onboardingProgress = Math.round((completedChecklist / checklist.length) * 100);

  function updateWorkspaceState(payload: { dismissOnboarding?: boolean; restoreOnboarding?: boolean }) {
    startTransition(async () => {
      setError(null);

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "State guncellenemedi.");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "State guncellenemedi.");
      }
    });
  }

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <Sparkles size={13} />
                  Synorq SaaS Shell
                </div>
                <div className="mt-3 text-xl font-black tracking-tight text-slate-950">
                  {workspaceName} icin merkezi kontrol katmani aktif
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {activeProjectCount} aktif proje, {overdueCount} teslim riski, onboarding durumu %{onboardingProgress}
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/products/projects">
                    Modul Turu
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/projects/new">
                    <Rocket size={14} />
                    Yeni Proje
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <div className="text-sm text-slate-500">
                Hizli erisim: <Link href="/projects" className="font-semibold text-slate-700 hover:text-slate-950">Projeler</Link>,{" "}
                <Link href="/members" className="font-semibold text-slate-700 hover:text-slate-950">Ekip</Link>,{" "}
                <Link href="/settings" className="font-semibold text-slate-700 hover:text-slate-950">Ayarlar</Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            {showChecklist ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CheckCheck size={15} className="text-emerald-600" />
                    Onboarding checklist
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={isPending}
                    onClick={() => updateWorkspaceState({ dismissOnboarding: true })}
                  >
                    Gizle
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.done ? "Tamam" : "Sirada"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CheckCheck size={15} className="text-emerald-600" />
                      Onboarding gizlendi
                    </div>
                    <div className="mt-2 text-sm text-slate-500">Ilerleme durumu %{onboardingProgress} olarak korunuyor.</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={isPending}
                    onClick={() => updateWorkspaceState({ restoreOnboarding: true })}
                  >
                    Goster
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <BellRing size={15} className="text-indigo-600" />
                  Alerts ve activity
                </div>
                <Link href="/notifications" className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:text-slate-950">
                  {unreadAlertCount} yeni
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {alerts.length === 0 && (
                  <div className="rounded-2xl bg-white px-3 py-6 text-center text-sm text-slate-500">
                    Su anda gosterilecek kritik bir sinyal yok.
                  </div>
                )}
                {alerts.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`block rounded-2xl border px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 ${item.unread ? "border-indigo-100 bg-indigo-50/60" : "border-transparent bg-white"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${item.tone === "risk" ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}>
                        {item.tone === "risk" ? <TriangleAlert size={15} /> : <FolderKanban size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {item.title}
                          {item.unread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                        </div>
                        <div className="mt-1 text-xs leading-6 text-slate-500">{item.detail}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        {error && <div className="px-6 pb-4 text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
