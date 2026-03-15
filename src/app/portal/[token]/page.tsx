import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarRange, CheckCircle2, CircleAlert, Clock3, ShieldCheck, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildClientPortalSummary } from "@/lib/client-portal";
import { db } from "@/lib/db";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { getActivityDetail, getActivityTitle } from "@/lib/activity";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";

type PortalPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ClientPortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  const portal = await db.clientPortal.findUnique({
    where: { shareToken: token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          health: true,
          industry: true,
          notes: true,
          contractEndDate: true,
          retainerCadence: true,
          retainerStatus: true,
          owner: { select: { name: true, email: true } },
          workspace: { select: { name: true, logoUrl: true } },
          projects: {
            where: { status: { not: "ARCHIVED" } },
            include: {
              owner: { select: { id: true, name: true, email: true } },
              client: { select: { id: true, name: true, health: true } },
              tasks: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  dueDate: true,
                  completedAt: true,
                  assigneeId: true,
                  createdAt: true,
                  updatedAt: true,
                  priority: true,
                  labels: true,
                },
              },
              milestones: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  dueDate: true,
                  tasks: { select: { id: true, status: true } },
                },
              },
              risks: {
                select: {
                  id: true,
                  status: true,
                  impact: true,
                  likelihood: true,
                  dueDate: true,
                },
              },
              activityLogs: {
                include: {
                  user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 4,
              },
            },
            orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          },
        },
      },
    },
  });

  if (!portal?.isPublished) notFound();

  const analyzedProjects = analyzeProjects(portal.client.projects as PortfolioProject[]);
  const activity = portal.client.projects
    .flatMap((project) =>
      project.activityLogs.map((item) => ({
        id: item.id,
        action: item.action,
        createdAt: item.createdAt,
        actorName: item.user.name ?? item.user.email,
        projectName: project.name,
        detail: getActivityDetail({
          action: item.action,
          metadata: item.metadata,
          actorName: item.user.name ?? item.user.email,
          projectName: project.name,
        }),
        title: getActivityTitle(item.action),
      }))
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 6);

  const summary = buildClientPortalSummary({
    client: {
      name: portal.client.name,
      health: portal.client.health,
    },
    projects: analyzedProjects,
    recentActivityCount: activity.length,
  });

  const toneClass =
    summary.tone === "attention"
      ? "border-red-200 bg-red-50 text-red-700"
      : summary.tone === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-200 px-6 py-5" style={{ borderTop: `6px solid ${portal.accentColor}` }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <Share2 size={12} />
                  Client Portal
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {portal.welcomeTitle ?? `${portal.client.name} delivery portal`}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  {portal.welcomeMessage ?? "Aktif teslimler, risk sinyalleri ve son hareketler bu read-only akista toplanir."}
                </p>
              </div>

              <div className="space-y-2 text-right">
                <Badge variant={summary.tone === "attention" ? "danger" : summary.tone === "watch" ? "warning" : "success"}>
                  {portal.client.health === "AT_RISK" ? "At risk" : portal.client.health === "WATCH" ? "Watch" : "Stable"}
                </Badge>
                <div className="text-sm font-semibold text-slate-900">{portal.client.workspace.name}</div>
                <div className="text-xs text-slate-500">Last published {portal.publishedAt ? formatDateTime(portal.publishedAt) : "draft"}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
                <ShieldCheck size={12} />
                {summary.tone === "attention" ? "Attention" : summary.tone === "watch" ? "Watch" : "Stable"}
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{summary.headline}</h2>
              <div className="mt-5 space-y-3">
                {summary.highlights.map((item) => (
                  <div key={item} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard icon={<CircleAlert size={16} className="text-red-600" />} label="Open risks" value={String(summary.metrics.openRisks)} note="Across active client projects" />
              <MetricCard icon={<Clock3 size={16} className="text-amber-600" />} label="Overdue tasks" value={String(summary.metrics.overdueTasks)} note="Requires delivery attention" />
              <MetricCard
                icon={<CalendarRange size={16} className="text-cyan-600" />}
                label="Next 14 days"
                value={String(summary.metrics.deliveriesNext14Days)}
                note="Projects with near-term delivery dates"
              />
              <MetricCard
                icon={<CheckCircle2 size={16} className="text-emerald-600" />}
                label="Completed"
                value={String(summary.metrics.completedLast14Days)}
                note="Tasks completed in the last 14 days"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Delivery watchlist</div>
                <div className="mt-2 text-xl font-black text-slate-950">Projects in scope</div>
              </div>
              <Badge variant="secondary">{summary.metrics.activeProjects} active</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {summary.watchlist.map((project) => (
                <div key={project.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-950">{project.name}</div>
                        <Badge variant={project.healthKey === "risk" ? "danger" : project.healthKey === "steady" ? "warning" : "success"}>
                          {project.healthLabel}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">{project.ownerName}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{project.openRisks} risk</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{project.overdueTasks} overdue</span>
                        {project.nextMilestoneTitle && <span className="rounded-full bg-white px-2.5 py-1">{project.nextMilestoneTitle}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-950">%{project.completionRate}</div>
                      <div className="mt-1 text-xs text-slate-500">{project.dueDate ? formatDate(project.dueDate) : "No due date"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-950">Client profile</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SnapshotCard label="Owner" value={portal.client.owner?.name ?? portal.client.owner?.email ?? "Atanmamis"} note="Primary account lead" />
                <SnapshotCard label="Industry" value={portal.client.industry ?? "Undefined"} note="Commercial context" />
                <SnapshotCard label="Retainer" value={portal.client.retainerCadence ?? "PROJECT"} note={portal.client.retainerStatus ?? "ACTIVE"} />
                <SnapshotCard
                  label="Contract"
                  value={portal.client.contractEndDate ? formatDate(portal.client.contractEndDate) : "Not set"}
                  note="Current contract end date"
                />
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                {portal.client.notes ?? "Client notu paylasilmadi."}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-950">Recent updates</div>
              <div className="mt-4 space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-sm font-black text-slate-950">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {item.projectName} • {item.actorName} • {formatRelative(item.createdAt)}
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Son hareket kaydi bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function SnapshotCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}
