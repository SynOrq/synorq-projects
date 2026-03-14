"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCheck,
  FolderKanban,
  Rocket,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandCenter from "@/components/layout/CommandCenter";

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
  commandProjects: Array<{ id: string; name: string; color: string }>;
  commandTasks: Array<{ id: string; title: string; href: string; projectName: string; dueLabel?: string | null }>;
  checklist: ChecklistItem[];
  onboardingHref: string;
  nextChecklistHref: string;
  nextChecklistLabel: string;
  showChecklist: boolean;
}

export default function AppTopbar({
  workspaceName,
  activeProjectCount,
  overdueCount,
  unreadAlertCount,
  alerts,
  commandProjects,
  commandTasks,
  checklist,
  onboardingHref,
  nextChecklistHref,
  nextChecklistLabel,
  showChecklist,
}: AppTopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const completedChecklist = checklist.filter((item) => item.done).length;
  const onboardingProgress = Math.round((completedChecklist / checklist.length) * 100);
  const previewAlerts = alerts.slice(0, 2);

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
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Sparkles size={12} />
                Synorq SaaS Shell
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="truncate font-black text-slate-950">{workspaceName}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{activeProjectCount} aktif proje</span>
                <span className="text-slate-300">/</span>
                <span className={overdueCount > 0 ? "font-semibold text-red-600" : "text-slate-600"}>
                  {overdueCount} teslim riski
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <CommandCenter projects={commandProjects} focusTasks={commandTasks} alerts={alerts} />

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/products/projects">
                    Modul
                    <ArrowRight size={13} />
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/projects/new">
                    <Rocket size={13} />
                    Yeni Proje
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <CheckCheck size={14} className="text-emerald-600" />
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Onboarding %{onboardingProgress}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span>{completedChecklist}/{checklist.length} adim tamam</span>
              </div>
              <Button asChild type="button" size="sm" variant="outline" className="h-7 px-2 text-xs">
                <Link href={showChecklist ? onboardingHref : nextChecklistHref}>
                  {showChecklist ? "Setup hub" : nextChecklistLabel}
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto h-7 px-2 text-xs"
                loading={isPending}
                onClick={() =>
                  updateWorkspaceState(showChecklist ? { dismissOnboarding: true } : { restoreOnboarding: true })
                }
              >
                {showChecklist ? "Gizle" : "Goster"}
              </Button>
            </div>

            <Link
              href="/notifications"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
            >
              <BellRing size={14} className="text-indigo-600" />
              <span className="font-semibold text-slate-900">{unreadAlertCount}</span>
              <span>yeni alert</span>
            </Link>

            <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
              {previewAlerts.length === 0 ? (
                <div className="px-2 text-xs text-slate-500">Su anda gosterilecek kritik sinyal yok.</div>
              ) : (
                previewAlerts.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition ${
                      item.unread ? "bg-white text-slate-700" : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${
                        item.tone === "risk" ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                      }`}
                    >
                      {item.tone === "risk" ? <TriangleAlert size={12} /> : <FolderKanban size={12} />}
                    </span>
                    <span className="truncate font-medium">{item.title}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}
