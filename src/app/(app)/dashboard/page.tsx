import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LineChart,
  Plus,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { filterAccessibleProjects } from "@/lib/project-access";
import {
  buildClientRiskVisibility,
  buildQuickActions,
  buildRecentBlockers,
  buildUpcomingDeadlines,
  buildWeeklyCompletionTrend,
  countOverloadedMembers,
} from "@/lib/dashboard";
import {
  analyzeProjects,
  analyzeTeamLoad,
  getWorkloadImbalanceScore,
  type PortfolioProject,
} from "@/lib/portfolio";
import { formatDate, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_LABELS = {
  "workspace.updated": "Workspace ayarları güncellendi",
  "workspace.member.invited": "Yeni ekip üyesi eklendi",
  "workspace.member.role_updated": "Rol yetkisi güncellendi",
  "task.created": "Yeni görev oluşturuldu",
  "task.updated": "Görev güncellendi",
  "task.moved": "Görev kolon değiştirdi",
  "milestone.created": "Milestone eklendi",
  "risk.created": "Risk kaydı açıldı",
  "task.commented": "Yorum eklendi",
  "task.subtask.created": "Alt görev açıldı",
  "task.subtask.updated": "Alt görev güncellendi",
  "task.attachment.created": "Dosya eklendi",
  "task.attachment.deleted": "Dosya silindi",
} as const;

const PRIORITY_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

function inNextWeek(date: Date | null, now: Date) {
  if (!date) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const boundary = new Date(today);
  boundary.setDate(boundary.getDate() + 7);
  return date >= today && date <= boundary;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { projects: true, members: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");
  const currentMembership = workspace.members.find((m) => m.user.id === userId);
  if (!currentMembership) redirect("/auth/login");

  const [projectsRaw, recentActivity, myTasks] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
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
          select: { id: true, status: true, impact: true, likelihood: true, dueDate: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        assigneeId: userId,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
  ]);

  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });
  const accessibleProjectIds = new Set(accessibleProjectsRaw.map((p) => p.id));
  const visibleRecentActivity = recentActivity.filter(
    (item) => !item.project || accessibleProjectIds.has(item.project.id)
  );
  const visibleMyTasks = myTasks.filter((t) => accessibleProjectIds.has(t.project.id));

  const now = new Date();
  const firstName = session.user.name?.split(" ")[0] ?? "Kullanıcı";
  const projects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[], now);
  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({
      ...t,
      projectId: p.id,
      projectName: p.name,
      projectColor: p.color,
      projectDueDate: p.dueDateResolved,
      health: p.health,
    }))
  );

  const teamLoad = analyzeTeamLoad(
    workspace.members.map((m) => ({
      id: m.userId,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      role: m.role,
    })),
    allTasks,
    now
  );

  const riskProjects = projects
    .filter((p) => p.health.key === "risk" || p.overdueTasks > 0 || p.unassignedTasks > 0)
    .sort(
      (a, b) =>
        a.health.score - b.health.score ||
        b.overdueTasks - a.overdueTasks ||
        (a.dueInDays ?? 999) - (b.dueInDays ?? 999)
    );

  const criticalProjects = riskProjects.slice(0, 4);
  const deliveriesThisWeek = projects.filter((p) => inNextWeek(p.dueDateResolved, now));
  const openTasks = allTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const unassignedTasks = openTasks.filter((t) => !t.assigneeId);
  const completedLast7Days = allTasks.filter((t) => {
    if (!t.completedAt) return false;
    const boundary = new Date(now);
    boundary.setDate(boundary.getDate() - 7);
    return new Date(t.completedAt) >= boundary;
  }).length;

  const attentionTasks = [...openTasks]
    .sort((a, b) => {
      const aOverdue = a.dueDate ? new Date(a.dueDate) < now : false;
      const bOverdue = b.dueDate ? new Date(b.dueDate) < now : false;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (Boolean(a.assigneeId) !== Boolean(b.assigneeId)) return a.assigneeId ? 1 : -1;
      return PRIORITY_WEIGHT[b.priority ?? "MEDIUM"] - PRIORITY_WEIGHT[a.priority ?? "MEDIUM"];
    })
    .slice(0, 6);

  const metrics = [
    {
      label: "Riskte Proje",
      value: riskProjects.length,
      sub: "yakindan takip",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      trend: null,
    },
    {
      label: "Bu Hafta Teslim",
      value: deliveriesThisWeek.length,
      sub: "kapanması gereken",
      icon: CalendarRange,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      trend: null,
    },
    {
      label: "Geciken Görev",
      value: overdueTasks.length,
      sub: "aksiyon bekliyor",
      icon: Clock3,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100",
      trend: null,
    },
    {
      label: "Atanmamış İş",
      value: unassignedTasks.length,
      sub: "sahipsiz görev",
      icon: FolderKanban,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      trend: null,
    },
    {
      label: "Yük Dengesizliği",
      value: `${getWorkloadImbalanceScore(teamLoad)}%`,
      sub: "ekip kapasite farkı",
      icon: UsersRound,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      trend: null,
    },
    {
      label: "7 Gün Throughput",
      value: completedLast7Days,
      sub: "tamamlanan iş",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      trend: null,
    },
  ];

  const weeklyTrend = buildWeeklyCompletionTrend(allTasks, now);
  const upcomingDeadlines = buildUpcomingDeadlines(projects, allTasks, now);
  const recentBlockers = buildRecentBlockers(projects, allTasks);
  const clientRiskVisibility = buildClientRiskVisibility(projects);
  const quickActions = buildQuickActions({
    riskProjects: riskProjects.length,
    unassignedTasks: unassignedTasks.length,
    dueThisWeekProjects: deliveriesThisWeek.length,
    overloadedMembers: countOverloadedMembers(teamLoad),
  });
  const trendMax = Math.max(1, ...weeklyTrend.map((d) => d.count));

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Merhaba, {firstName} 👋</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Delivery Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {workspace.name} · {projects.length} aktif proje · {workspace._count.members} ekip üyesi
            </p>
          </div>
          <div className="flex items-center gap-2">
            {quickActions.slice(0, 2).map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                <Zap size={12} className="text-indigo-500" />
                {action.label}
              </Link>
            ))}
            <Button asChild>
              <Link href="/projects/new">
                <Plus size={14} />
                Yeni Proje
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className={`inline-flex rounded-lg p-2 ${metric.bg}`}>
                  <Icon size={15} className={metric.color} />
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{metric.value}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-700">{metric.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{metric.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Deadline Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Deadline Timeline</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Yaklaşan teslimler</h2>
              </div>
              <Link href="/reports/share" className="text-xs font-medium text-indigo-600 hover:underline">
                Executive view →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Önümüzdeki 7 gün için planlı teslim yok.
                </div>
              ) : (
                upcomingDeadlines.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span
                        className={`flex-shrink-0 h-2 w-2 rounded-full ${
                          item.tone === "risk" ? "bg-red-500" : item.tone === "steady" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-slate-600">{formatDate(item.dueDate)}</p>
                      <p className="text-[11px] text-slate-400">{formatRelative(item.dueDate)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion Trend</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Son 7 gün throughput</h2>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <LineChart size={12} />
                {completedLast7Days} tamamlanan
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-end gap-2 h-32">
                {weeklyTrend.map((point) => (
                  <div key={point.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center" style={{ height: "88px" }}>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                        style={{ height: `${Math.max(6, Math.round((point.count / trendMax) * 88))}px` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{point.label}</span>
                    <span className="text-xs font-bold text-slate-700">{point.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Critical Projects */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Critical Deliveries</p>
              <h2 className="mt-0.5 text-base font-semibold text-slate-900">Raydan çıkabilecek projeler</h2>
            </div>
            <Link href="/projects?health=risk" className="text-xs font-medium text-indigo-600 hover:underline">
              Riskte olanları gör →
            </Link>
          </div>

          {criticalProjects.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              Kritik proje sinyali yok. Portföy sağlıklı görünüyor.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {criticalProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-6 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: project.color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                        <Badge variant={project.health.key === "risk" ? "danger" : "warning"} dot>
                          {project.health.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {project.client?.name ?? "Internal"} · {project.criticalRisks} kritik risk · {project.unassignedTasks} atanmamış
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[11px] text-slate-400">Health</p>
                      <p className="text-lg font-bold text-slate-900">{project.health.score}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Due date</p>
                      <p className="text-sm font-medium text-slate-700">
                        {project.dueDateResolved ? formatDate(project.dueDateResolved) : "—"}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom grid: Action Queue + Team Capacity */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {/* Action Queue */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Action Queue</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Bugün karar bekleyen işler</h2>
              </div>
              <Link href="/my-tasks" className="text-xs font-medium text-indigo-600 hover:underline">
                Görevlerim →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {attentionTasks.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Tüm görevler atanmış ve zamanında.
                </div>
              ) : (
                attentionTasks.map((task) => {
                  const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < now);
                  const dueSoon = Boolean(task.dueDate && !isOverdue && inNextWeek(new Date(task.dueDate), now));
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">{task.projectName}</span>
                          {!task.assigneeId && (
                            <Badge variant="default">Atanmamış</Badge>
                          )}
                          {isOverdue && <Badge variant="danger">Gecikti</Badge>}
                          {!isOverdue && dueSoon && <Badge variant="warning">Bu hafta</Badge>}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                        {task.priority ?? "MEDIUM"}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            {/* My focus */}
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Benim Odağım
              </p>
              <div className="space-y-2">
                {visibleMyTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">Üzerinize atanmış aktif görev yok.</p>
                ) : (
                  visibleMyTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 border border-slate-200 text-sm transition hover:border-slate-300"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: task.project.color }} />
                        <span className="truncate font-medium text-slate-800">{task.title}</span>
                      </div>
                      <span className="flex-shrink-0 text-[11px] text-slate-400">
                        {task.dueDate ? formatDate(task.dueDate) : "—"}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Team Capacity */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Team Capacity</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Kapasite & darboğaz sinyali</h2>
              </div>
              <Link href="/members" className="text-xs font-medium text-indigo-600 hover:underline">
                Ekip →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {teamLoad.map((member) => {
                const barWidth = Math.min(100, Math.max(4, member.loadScore));
                return (
                  <div key={member.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {member.role} · {member.activeTasks} aktif görev
                        </p>
                      </div>
                      <Badge
                        variant={
                          member.loadState === "overloaded" ? "danger" :
                          member.loadState === "watch" ? "warning" : "success"
                        }
                        dot
                      >
                        {member.loadState === "overloaded" ? "Yüksek" :
                         member.loadState === "watch" ? "İzleniyor" : "Dengeli"}
                      </Badge>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          member.loadState === "overloaded" ? "bg-red-500" :
                          member.loadState === "watch" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {[
                        { l: "Geciken", v: member.overdueTasks },
                        { l: "Bu hafta", v: member.dueThisWeekTasks },
                        { l: "7g throughput", v: member.completedLast7Days },
                      ].map((stat) => (
                        <div key={stat.l} className="rounded-lg bg-slate-50 px-2.5 py-2">
                          <p className="text-[10px] text-slate-400">{stat.l}</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">{stat.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity + Blockers + Client Risk */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Activity Stream */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Activity</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Son hareketler</h2>
              </div>
              <Link href="/audit" className="text-xs font-medium text-indigo-600 hover:underline">
                Tümü →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleRecentActivity.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Henüz hareket kaydı yok.</div>
              ) : (
                visibleRecentActivity.map((item) => (
                  <div key={item.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-800">
                      {ACTIVITY_LABELS[item.action as keyof typeof ACTIVITY_LABELS] ?? item.action}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.user.name ?? item.user.email}
                      {item.project ? ` · ${item.project.name}` : ""}
                      {" · "}
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Blockers */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Blockers</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Akışı bozan engeller</h2>
              </div>
              <Link href="/risks" className="text-xs font-medium text-indigo-600 hover:underline">
                Riskler →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentBlockers.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Aktif blocker sinyali görünmüyor.
                </div>
              ) : (
                recentBlockers.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                    </div>
                    <Badge variant={item.severity === "critical" ? "danger" : "warning"}>
                      {item.severity === "critical" ? "Critical" : "Watch"}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Client Risk */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client Risk</p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900">Client risk görünürlüğü</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {clientRiskVisibility.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Client bağlı risk sinyali bulunmuyor.
                </div>
              ) : (
                clientRiskVisibility.map((client) => (
                  <div key={client.name} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                      <Badge
                        variant={
                          client.health === "AT_RISK" ? "danger" :
                          client.health === "WATCH" ? "warning" : "success"
                        }
                        dot
                      >
                        {client.health === "AT_RISK" ? "At Risk" :
                         client.health === "WATCH" ? "Watch" : "Stable"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Projeler", v: client.projects },
                        { l: "Riskte", v: client.riskProjects },
                        { l: "Open risk", v: client.openRisks },
                        { l: "Overdue", v: client.overdueTasks },
                      ].map((stat) => (
                        <div key={stat.l} className="rounded-lg bg-slate-50 px-2.5 py-2">
                          <p className="text-[10px] text-slate-400">{stat.l}</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">{stat.v}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Son hareket {formatRelative(client.lastActivityAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
