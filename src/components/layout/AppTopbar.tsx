"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bell,
  FolderKanban,
  Plus,
  Search,
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
  commandPeople: Array<{ id: string; name: string; email: string; role: "ADMIN" | "MEMBER" | "VIEWER"; isOwner?: boolean }>;
  checklist: ChecklistItem[];
  onboardingHref: string;
  nextChecklistHref: string;
  nextChecklistLabel: string;
  showChecklist: boolean;
}

export default function AppTopbar({
  overdueCount,
  unreadAlertCount,
  alerts,
  commandProjects,
  commandTasks,
  commandPeople,
  checklist,
  onboardingHref,
  nextChecklistHref,
  nextChecklistLabel,
  showChecklist,
}: AppTopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [, setError] = useState<string | null>(null);
  const completedChecklist = checklist.filter((item) => item.done).length;

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
        if (!res.ok) throw new Error(data.error ?? "State güncellenemedi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "State güncellenemedi.");
      }
    });
  }

  const hasRisks = overdueCount > 0;

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-6">
        {/* Search / Command */}
        <div className="flex-1 max-w-xs">
          <CommandCenter
            projects={commandProjects}
            focusTasks={commandTasks}
            people={commandPeople}
            alerts={alerts}
          />
        </div>

        <div className="flex-1" />

        {/* Onboarding pill */}
        {showChecklist && completedChecklist < checklist.length && (
          <Link
            href={nextChecklistHref}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
              {checklist.length - completedChecklist}
            </span>
            {nextChecklistLabel}
          </Link>
        )}

        {/* Risk indicator */}
        {hasRisks && (
          <Link
            href="/risks"
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            <TriangleAlert size={12} />
            {overdueCount} gecikmiş
          </Link>
        )}

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <Bell size={16} />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
            </span>
          )}
        </Link>

        {/* New project */}
        <Button asChild size="sm">
          <Link href="/projects/new">
            <Plus size={14} />
            Yeni Proje
          </Link>
        </Button>
      </div>

      {/* Onboarding dismissed state - show/hide toggle */}
      {!showChecklist && (
        <div className="border-t border-slate-100 px-6 py-1.5 flex items-center justify-between bg-slate-50/80">
          <span className="text-xs text-slate-400">
            Setup tamamlandı: {completedChecklist}/{checklist.length} adım
          </span>
          <button
            onClick={() => updateWorkspaceState({ restoreOnboarding: true })}
            disabled={isPending}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Göster
          </button>
        </div>
      )}
    </div>
  );
}
