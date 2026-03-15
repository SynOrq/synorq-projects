import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, BarChart3, CalendarRange, CheckCircle2, Clock3, Gauge, Share2, TrendingUp, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { filterAccessibleProjects } from "@/lib/project-access";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { buildExecutiveReport } from "@/lib/reports";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "ON_HOLD") return "Beklemede";
  if (status === "COMPLETED") return "Tamamlandi";
  return "Arsiv";
}

function clientHealthLabel(value: string) {
  if (value === "AT_RISK") return "At risk";
  if (value === "WATCH") return "Watch";
  if (value === "STABLE") return "Stable";
  return "Internal";
}

export default async function ReportsPage() {
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
  const currentMembership = workspace.members.find((member) => member.user.id === userId);
  if (!currentMembership) redirect("/auth/login");

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
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
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
        projectId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });
  const accessibleProjectIds = new Set(accessibleProjectsRaw.map((project) => project.id));
  const filteredActivity = activity.filter((item) => !item.projectId || accessibleProjectIds.has(item.projectId));

  const projects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[]);
  const teamCapacity = analyzeTeamCapacity(
    workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      isOwner: member.user.id === workspace.ownerId,
    })),
    accessibleProjectsRaw.flatMap((project) =>
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
  const report = buildExecutiveReport(projects, teamCapacity.snapshots, filteredActivity);

  const summaryCards = [
    {
      label: "Riskte proje",
      value: report.summary.riskProjects,
      note: `${report.summary.criticalRisks} kritik risk kaydi`,
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-700",
    },
    {
      label: "Bu hafta teslim",
      value: report.summary.deliveriesThisWeek,
      note: `${report.summary.dueThisWeekTasks} aktif gorev teslimi`,
      icon: CalendarRange,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "7 gun throughput",
      value: report.summary.completedLast7Days,
      note: `${report.summary.activityLast7Days} activity eventi`,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Kapasite kullanim",
      value: `${report.summary.utilization}%`,
      note: `${report.summary.projectedHours}/${report.summary.totalCapacityHours} saat`,
      icon: Users,
      tone: "bg-cyan-50 text-cyan-700",
    },
  ];

  return (
    <div className="min-h-full">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <BarChart3 size={13} />
              Weekly Executive Summary
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Delivery, risk ve kapasite ozetini yonetici seviyesinde okuyun.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {workspace.name} icin portfoy sagligi, kritik teslimler, ekip kapasitesi ve client risk yogunlugu tek rapor yüzeyinde toplanir.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/reports/share">
                  <Share2 size={13} />
                  Share view
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects?health=risk">
                  Riskte projeler
                  <ArrowRight size={13} />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Olusturulma</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{formatDateTime(report.generatedAt)}</div>
              <div className="mt-1 text-xs text-slate-500">rapor zaman damgasi</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace owner</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{workspace.owner.name ?? workspace.owner.email}</div>
              <div className="mt-1 text-xs text-slate-500">{workspace.members.length} ekip uyesi</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`inline-flex rounded-xl p-2 ${card.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="mt-4 text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">{card.label}</div>
                <div className="mt-1 text-xs text-slate-500">{card.note}</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Gauge size={18} className="text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Portfolio health report</h2>
            </div>
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniCard label="Ortalama health" value={String(report.summary.averageHealth)} note="tum aktif projeler" />
                <MiniCard label="Milestone progress" value={`%${report.summary.averageMilestoneCompletion}`} note="ortalama tamamlanma" />
                <MiniCard label="Overdue tasks" value={String(report.summary.overdueTasks)} note="portfoy genelinde" />
              </div>

              <div className="mt-6 space-y-3">
                {report.riskProjects.slice(0, 4).map((project) => (
                  <div key={project.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                          <Badge variant="danger">{project.health.label}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2.5 py-1">{project.client?.name ?? "Internal"}</span>
                          <span className="rounded-full bg-white px-2.5 py-1">{project.criticalRisks} kritik risk</span>
                          <span className="rounded-full bg-white px-2.5 py-1">{project.openMilestones} acik milestone</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}</div>
                        <div className="mt-1">son hareket {formatRelative(project.lastActivityAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {report.riskProjects.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    Kritik portfolio riski gorunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-600" />
              <h2 className="text-base font-semibold text-slate-900">Executive spotlights</h2>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <SpotlightCard
                  label="En riskli proje"
                  title={report.projectSpotlights.highestRisk?.name ?? "Veri yok"}
                  detail={
                    report.projectSpotlights.highestRisk
                      ? `${report.projectSpotlights.highestRisk.criticalRisks} kritik risk • ${report.projectSpotlights.highestRisk.overdueTasks} overdue`
                      : "Riskli proje bulunmuyor."
                  }
                />
                <SpotlightCard
                  label="En yakin teslim"
                  title={report.projectSpotlights.nearestDeadline?.name ?? "Veri yok"}
                  detail={
                    report.projectSpotlights.nearestDeadline?.dueDateResolved
                      ? formatDate(report.projectSpotlights.nearestDeadline.dueDateResolved)
                      : "Takvimde yaklasan teslim yok."
                  }
                />
                <SpotlightCard
                  label="En iyi throughput"
                  title={report.projectSpotlights.bestThroughput?.name ?? "Veri yok"}
                  detail={
                    report.projectSpotlights.bestThroughput
                      ? `%${report.projectSpotlights.bestThroughput.completionRate} completion`
                      : "Karsilastirma icin veri yok."
                  }
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Object.entries(report.clientHealth).map(([key, count]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client health</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{count}</div>
                    <div className="mt-1 text-sm text-slate-500">{clientHealthLabel(key)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Users size={18} className="text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">Team workload report</h2>
            </div>
            <div className="p-5 space-y-3">
              {[...report.overloadedMembers, ...report.watchMembers].slice(0, 6).map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {member.role} • {member.projectedHours}/{member.weeklyCapacityHours}h
                      </div>
                    </div>
                    <Badge variant={member.loadState === "overloaded" ? "danger" : "warning"}>
                      %{member.utilization}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-slate-500">
                    <div><div>Aktif</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.activeTasks}</div></div>
                    <div><div>Overdue</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.overdueTasks}</div></div>
                    <div><div>Blocked</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.blockedTasks}</div></div>
                    <div><div>Throughput</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.completedLast7Days}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Clock3 size={18} className="text-amber-600" />
              <h2 className="text-base font-semibold text-slate-900">Delivery performance</h2>
            </div>
            <div className="p-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(report.statusDistribution).map(([status, count]) => (
                <div key={status} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{count}</div>
                  <div className="mt-1 text-sm text-slate-500">{statusLabel(status)}</div>
                </div>
              ))}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Open risks</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{report.summary.openRisks}</div>
                <div className="mt-1 text-sm text-slate-500">risk register toplamı</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Watched projects</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{report.summary.watchedProjects}</div>
                <div className="mt-1 text-sm text-slate-500">steady / monitor seviyesi</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{note}</div>
    </div>
  );
}

function SpotlightCard({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{detail}</div>
    </div>
  );
}
