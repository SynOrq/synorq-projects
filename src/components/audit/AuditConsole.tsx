"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarRange, Download, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { buildAuditExportRows, filterAuditItems, serializeAuditRowsToCsv, type AuditFilterState } from "@/lib/audit";

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
  createdAt: string;
  changes: Array<{
    field: string;
    label: string;
    from: string | null;
    to: string | null;
  }>;
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

const ranges = [
  { id: "all", label: "Tum zamanlar" },
  { id: "24h", label: "Son 24 saat" },
  { id: "7d", label: "Son 7 gun" },
  { id: "30d", label: "Son 30 gun" },
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
  const [actor, setActor] = useState("all");
  const [range, setRange] = useState<(typeof ranges)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const actorOptions = useMemo(() => ["all", ...Array.from(new Set(items.map((item) => item.actorName)))], [items]);

  const filteredItems = useMemo(() => {
    return filterAuditItems(items, { scope, severity, actor, range, query } satisfies AuditFilterState);
  }, [actor, items, query, range, scope, severity]);

  async function downloadExport(format: "csv" | "json") {
    const rows = buildAuditExportRows(filteredItems);
    try {
      await fetch("/api/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          rowCount: rows.length,
          scope,
          severity,
          range,
        }),
      });
    } catch {
      // Export should still complete if telemetry logging fails.
    }
    const payload =
      format === "csv"
        ? serializeAuditRowsToCsv(rows)
        : JSON.stringify(rows, null, 2);
    const blob = new Blob([payload], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `synorq-audit-export.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

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
            <div className="flex flex-1 flex-col gap-4">
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

              <div className="flex flex-wrap gap-2">
                {ranges.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRange(item.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      range === item.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-lg">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Aksiyon, actor veya proje ara"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={actor}
                  onChange={(event) => setActor(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {actorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === "all" ? "Tum actorler" : item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadExport("csv")}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <Download size={14} />
                  CSV export
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport("json")}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <Download size={14} />
                  JSON export
                </button>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                  <CalendarRange size={14} />
                  {filteredItems.length} kayit
                </div>
              </div>
            </div>
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
                  {item.changes && item.changes.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Diff preview</div>
                      <div className="mt-2 space-y-2">
                        {item.changes.map((change) => (
                          <div key={`${item.id}-${change.field}`} className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">{change.label}</span>
                            <span className="mx-2 text-slate-300">•</span>
                            <span>{change.from ?? "-"}</span>
                            <span className="mx-2 text-slate-300">→</span>
                            <span>{change.to ?? "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
