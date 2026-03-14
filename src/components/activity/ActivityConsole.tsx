"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, BellRing, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/utils";
import {
  filterWorkspaceActivity,
  type ActivitySegment,
  type WorkspaceActivityItem,
} from "@/lib/workspace-activity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  workspaceName: string;
  items: WorkspaceActivityItem[];
  summary: {
    total: number;
    mine: number;
    mentions: number;
    critical: number;
    delivery: number;
    team: number;
  };
};

const segments: Array<{ id: ActivitySegment; label: string }> = [
  { id: "all", label: "Tum akış" },
  { id: "mine", label: "Benim hareketlerim" },
  { id: "mentions", label: "Mention / beni ilgilendiren" },
  { id: "delivery", label: "Project / task" },
  { id: "team", label: "Team / workspace" },
  { id: "critical", label: "Critical" },
];

export default function ActivityConsole({ workspaceName, items, summary }: Props) {
  const [segment, setSegment] = useState<ActivitySegment>("all");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => filterWorkspaceActivity(items, segment, query), [items, query, segment]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(99,102,241,0.08)_42%,rgba(6,182,212,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <Activity size={13} />
                Workspace Activity
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Operasyon hareketini audit&apos;ten ayirip akış olarak okuyun.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {workspaceName} icindeki proje, task, team ve workspace hareketleri daha hafif bir activity timeline
                olarak burada toplanir. Governance export ihtiyaci icin audit yuzeyi ayrica korunur.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/audit">
                    Audit deep dive
                    <ArrowRight size={13} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Total events" value={summary.total} note="workspace timeline kaydi" icon={Activity} />
              <SummaryCard label="Critical" value={summary.critical} note="hemen kontrol edilmesi gereken" icon={AlertTriangle} />
              <SummaryCard label="Mentions" value={summary.mentions} note="beni dogrudan ilgilendiren" icon={BellRing} />
              <SummaryCard label="Delivery" value={summary.delivery} note="project, task ve file hareketi" icon={FolderKanban} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {segments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSegment(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  segment === item.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Aksiyon, actor, proje veya detay ara"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-500">
              {filteredItems.length} kayit gosteriliyor
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredItems.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Secili segment icin activity kaydi yok.
            </div>
          )}

          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{item.title}</div>
                    <Badge variant={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "secondary"}>
                      {item.severity}
                    </Badge>
                    {item.isMention && <Badge variant="success">mention</Badge>}
                    {item.isMine && <Badge variant="secondary">mine</Badge>}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{item.actorName}</span>
                    {item.projectName && <span className="rounded-full bg-white px-2.5 py-1">{item.projectName}</span>}
                    <span className="rounded-full bg-white px-2.5 py-1">{item.category}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.action}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{formatRelative(item.createdAt)}</div>
                  <div className="mt-1">{formatDateTime(item.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <InlineNote
          icon={Users}
          title="Team context"
          detail={`${summary.team} ekip/workspace hareketi activity timeline icinde filtrelenebilir.`}
        />
        <InlineNote
          icon={FolderKanban}
          title="Delivery context"
          detail={`${summary.delivery} kayit proje, task veya file hareketi olarak delivery akisina baglidir.`}
        />
        <InlineNote
          icon={ShieldCheck}
          title="Governance split"
          detail="CSV/JSON export ve diff preview ihtiyaci icin audit yuzeyi ayri tutulur."
        />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
      <div className="inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
        <Icon size={16} />
      </div>
      <div className="mt-3 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function InlineNote({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Activity;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
        <Icon size={18} />
      </div>
      <div className="mt-4 text-lg font-black text-slate-950">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );
}
