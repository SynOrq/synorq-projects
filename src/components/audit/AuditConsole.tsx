"use client";

import { useMemo, useState } from "react";
import { Activity, FolderKanban, ShieldCheck, Users } from "lucide-react";

type AuditItem = {
  id: string;
  action: string;
  title: string;
  detail: string;
  meta: string;
  category: "workspace" | "team" | "project" | "task" | "file";
  severity: "info" | "warning" | "critical";
  projectName: string | null;
  actorName: string;
};

type AuditSummary = {
  label: string;
  value: number;
  icon: "activity" | "workspace" | "team" | "task";
};

interface AuditConsoleProps {
  workspaceName: string;
  items: AuditItem[];
  summary: AuditSummary[];
}

const scopes = [
  { id: "all", label: "Tum hareketler" },
  { id: "workspace", label: "Workspace" },
  { id: "team", label: "Ekip" },
  { id: "project", label: "Project" },
  { id: "task", label: "Task" },
  { id: "file", label: "Dosya" },
] as const;

const severities = [
  { id: "all", label: "Tum seviyeler" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
] as const;

const iconMap = {
  activity: Activity,
  workspace: ShieldCheck,
  team: Users,
  task: FolderKanban,
};

export default function AuditConsole({ workspaceName, items, summary }: AuditConsoleProps) {
  const [scope, setScope] = useState<(typeof scopes)[number]["id"]>("all");
  const [severity, setSeverity] = useState<(typeof severities)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const scopeMatch = scope === "all" ? true : item.category === scope;
      const severityMatch = severity === "all" ? true : item.severity === severity;
      if (!scopeMatch || !severityMatch) return false;
      if (!normalizedQuery) return true;

      return [item.title, item.detail, item.meta, item.projectName, item.actorName, item.action]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [items, normalizedQuery, scope, severity]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          <ShieldCheck size={13} />
          Governance Layer
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Audit timeline ve denetlenebilir is akisi</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {workspaceName} icindeki project, task, team ve workspace hareketleri tek bir timeline ve filtre yuzeyinden okunur.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon size={18} />
              </div>
              <div className="mt-4 text-3xl font-black text-slate-950">{item.value}</div>
              <div className="mt-1 text-sm text-slate-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {scopes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScope(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  scope === item.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {severities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSeverity(item.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    severity === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Aksiyon, actor veya proje ara"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:max-w-xs"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredItems.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Secili filtre icin gosterilecek audit kaydi yok.
            </div>
          )}

          {filteredItems.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{item.title}</div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : item.severity === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{item.actorName}</span>
                    {item.projectName && <span className="rounded-full bg-white px-2.5 py-1">{item.projectName}</span>}
                    <span className="rounded-full bg-white px-2.5 py-1">{item.category}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.action}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{item.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
