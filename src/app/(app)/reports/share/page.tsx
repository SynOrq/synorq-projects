import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarRange, CheckCircle2, Gauge, Share2, TriangleAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { buildExecutiveReport, buildShareableReportSummary } from "@/lib/reports";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ShareableReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const [projectsRaw, activity] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, health: true } },
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
            estimatedH: true,
            loggedH: true,
            labels: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        action: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const projects = analyzeProjects(projectsRaw as PortfolioProject[]);
  const teamCapacity = analyzeTeamCapacity(
    workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      isOwner: member.user.id === workspace.ownerId,
    })),
    projectsRaw.flatMap((project) =>
      project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assigneeId: task.assigneeId,
        estimatedH: task.estimatedH,
        loggedH: task.loggedH,
        labels: task.labels,
        project: {
          id: project.id,
          name: project.name,
          color: project.color,
        },
      }))
    )
  );

  const report = buildExecutiveReport(projects, teamCapacity.snapshots, activity);
  const summary = buildShareableReportSummary(report);
  const toneClass =
    summary.healthTone === "attention"
      ? "border-red-200 bg-red-50 text-red-700"
      : summary.healthTone === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Share2 size={12} />
                Shareable Summary
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Executive summary, paylasima hazir formatta.</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {workspace.name} icin yonetici ozeti, kopyalanabilir kisa anlatim ve screenshot odakli bloklar halinde sunulur.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/reports">
                  <ArrowLeft size={13} />
                  Full reports
                </Link>
              </Button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Generated</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(report.generatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
              <TriangleAlert size={12} />
              {summary.healthTone === "attention" ? "Attention" : summary.healthTone === "watch" ? "Watch" : "Stable"}
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SummaryMetric
              icon={<TriangleAlert size={16} className="text-red-600" />}
              label="Riskte proje"
              value={String(report.summary.riskProjects)}
              note={`${report.summary.criticalRisks} kritik kayit`}
            />
            <SummaryMetric
              icon={<CalendarRange size={16} className="text-amber-600" />}
              label="Bu hafta teslim"
              value={String(report.summary.deliveriesThisWeek)}
              note={`${report.summary.dueThisWeekTasks} task teslimi`}
            />
            <SummaryMetric
              icon={<CheckCircle2 size={16} className="text-emerald-600" />}
              label="7 gun throughput"
              value={String(report.summary.completedLast7Days)}
              note={`${report.summary.activityLast7Days} activity eventi`}
            />
            <SummaryMetric
              icon={<Gauge size={16} className="text-cyan-600" />}
              label="Kapasite kullanim"
              value={`%${report.summary.utilization}`}
              note={`${report.summary.projectedHours}/${report.summary.totalCapacityHours}h`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Leadership priorities</div>
          <div className="mt-4 space-y-3">
            {summary.priorities.map((item) => (
              <div key={`${item.label}-${item.title}`} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-sm font-black text-slate-950">{item.title}</div>
                <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Users size={18} className="text-indigo-600" />
            Share-ready notes
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Portfolio note</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Ortalama proje saglik skoru <span className="font-semibold text-slate-900">{report.summary.averageHealth}</span>, milestone completion ortalamasi ise{" "}
                <span className="font-semibold text-slate-900">%{report.summary.averageMilestoneCompletion}</span>.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Client note</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Client dagiliminda <span className="font-semibold text-slate-900">{report.clientHealth.AT_RISK ?? 0}</span> hesap at risk,{" "}
                <span className="font-semibold text-slate-900">{report.clientHealth.WATCH ?? 0}</span> hesap watch bandinda.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Delivery note</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Bu hafta teslim bandindaki projelerde toplam <span className="font-semibold text-slate-900">{report.summary.overdueTasks}</span> overdue gorev bulunuyor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DigestPanel
          title="Risk digest"
          emptyLabel="Paylasilacak kritik risk sinyali yok."
          items={summary.riskDigest}
          actionLabel="Risk register"
          actionHref="/projects?health=risk"
        />
        <DigestPanel
          title="Workload digest"
          emptyLabel="Kapasite baskisi gorunmuyor."
          items={summary.workloadDigest}
          actionLabel="Team capacity"
          actionHref="/members"
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Top delivery watchlist</div>
            <div className="mt-2 text-lg font-black text-slate-950">Paylasim icin secilmis proje sinyalleri</div>
          </div>
          <Badge variant="secondary">{workspace.owner.name ?? workspace.owner.email}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {report.riskProjects.slice(0, 4).map((project) => (
            <div key={project.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{project.name}</div>
                    <Badge variant={project.health.key === "risk" ? "danger" : "warning"}>{project.health.label}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{project.client?.name ?? "Internal"}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{project.openRisks} open risk</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{project.openMilestones} open milestone</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}</div>
                  <div className="mt-1">%{project.completionRate} completion</div>
                </div>
              </div>
            </div>
          ))}
          {report.riskProjects.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Risk watchlist bos.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({
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

function DigestPanel({
  title,
  emptyLabel,
  items,
  actionLabel,
  actionHref,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: string; title: string; detail: string }>;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-black text-slate-950">{title}</div>
        <Button asChild variant="outline" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-black text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
