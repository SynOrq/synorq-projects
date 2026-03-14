import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  Plus,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
  "workspace.updated": "Workspace ayarlari guncellendi",
  "workspace.member.invited": "Yeni ekip uyesi eklendi",
  "workspace.member.role_updated": "Rol yetkisi guncellendi",
  "task.created": "Yeni gorev olusturuldu",
  "task.updated": "Gorev guncellendi",
  "task.moved": "Gorev kolon degistirdi",
  "milestone.created": "Milestone eklendi",
  "risk.created": "Risk kaydi acildi",
  "task.commented": "Yorum eklendi",
  "task.subtask.created": "Alt gorev acildi",
  "task.subtask.updated": "Alt gorev guncellendi",
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
          },
        },
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
      take: 10,
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

  const now = new Date();
  const firstName = session.user.name?.split(" ")[0] ?? "Kullanici";
  const projects = analyzeProjects(projectsRaw as PortfolioProject[], now);
  const allTasks = projects.flatMap((project) =>
    project.tasks.map((task) => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      projectDueDate: project.dueDateResolved,
      health: project.health,
    }))
  );
  const teamLoad = analyzeTeamLoad(
    workspace.members.map((member) => ({
      id: member.userId,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      role: member.role,
    })),
    allTasks,
    now
  );

  const riskProjects = projects
    .filter((project) => project.health.key === "risk" || project.overdueTasks > 0 || project.unassignedTasks > 0)
    .sort(
      (left, right) =>
        left.health.score - right.health.score ||
        right.overdueTasks - left.overdueTasks ||
        (left.dueInDays ?? 999) - (right.dueInDays ?? 999)
    );

  const criticalProjects = riskProjects.slice(0, 4);
  const deliveriesThisWeek = projects.filter((project) => inNextWeek(project.dueDateResolved, now));
  const openTasks = allTasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now);
  const unassignedTasks = openTasks.filter((task) => !task.assigneeId);
  const completedLast7Days = allTasks.filter((task) => {
    if (!task.completedAt) return false;
    const boundary = new Date(now);
    boundary.setDate(boundary.getDate() - 7);
    return new Date(task.completedAt) >= boundary;
  }).length;

  const attentionTasks = [...openTasks]
    .sort((left, right) => {
      const leftOverdue = left.dueDate ? new Date(left.dueDate) < now : false;
      const rightOverdue = right.dueDate ? new Date(right.dueDate) < now : false;
      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
      if (Boolean(left.assigneeId) !== Boolean(right.assigneeId)) return left.assigneeId ? 1 : -1;
      return PRIORITY_WEIGHT[right.priority ?? "MEDIUM"] - PRIORITY_WEIGHT[left.priority ?? "MEDIUM"];
    })
    .slice(0, 6);

  const metrics = [
    {
      title: "Riskte proje",
      value: riskProjects.length,
      detail: "yakindan takip edilmesi gereken teslimler",
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-700",
    },
    {
      title: "Bu hafta teslim",
      value: deliveriesThisWeek.length,
      detail: "takvimde kapanmasi gereken proje",
      icon: CalendarRange,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      title: "Geciken gorev",
      value: overdueTasks.length,
      detail: "aksiyon bekleyen acik is",
      icon: Clock3,
      tone: "bg-orange-50 text-orange-700",
    },
    {
      title: "Atanmamis is",
      value: unassignedTasks.length,
      detail: "sahipligi belirsiz gorev",
      icon: FolderKanban,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      title: "Yuk dengesizligi",
      value: `${getWorkloadImbalanceScore(teamLoad)}%`,
      detail: "ekip kapasite farki",
      icon: UsersRound,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      title: "7 gun throughput",
      value: completedLast7Days,
      detail: "son hafta tamamlanan is",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.02),rgba(37,99,235,0.08)_42%,rgba(13,148,136,0.08))] px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <Gauge size={13} />
                Delivery Control Surface
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                Merhaba {firstName}, operasyon ritmi bugun burada kiriliyor.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {workspace.name} icin riskli teslimler, aksiyon kuyruyu, ekip kapasitesi ve son hareketler tek
                karar yuzeyinde toplanir.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Calisma alani</div>
                <div className="mt-2 text-xl font-black text-slate-950">{workspace.name}</div>
                <div className="mt-1 text-xs text-slate-500">{workspace._count.members} ekip uyesi aktif</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Benim odagim</div>
                <div className="mt-2 text-xl font-black text-slate-950">{myTasks.length}</div>
                <div className="mt-1 text-xs text-slate-500">bana atanmis aktif gorev</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Portfoy</div>
                <div className="mt-2 text-xl font-black text-slate-950">{projects.length}</div>
                <div className="mt-1 text-xs text-slate-500">{workspace._count.projects} toplam proje kaydi</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/projects/new">
                <Plus size={16} />
                Yeni proje ac
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">
                Portfoyu ac
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-2xl p-2 ${metric.tone}`}>
                <Icon size={18} />
              </div>
              <div className="mt-4 text-3xl font-black text-slate-950">{metric.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{metric.title}</div>
              <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Critical Deliveries</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Raydan cikabilecek projeler</h2>
            </div>
            <Link href="/projects?health=risk" className="text-sm font-semibold text-indigo-600 hover:underline">
              Riskte olanlari ac
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {criticalProjects.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Kritik proje sinyali yok. Portfoy saglikli gorunuyor.
              </div>
            )}

            {criticalProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-[28px] border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-white"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />
                      <div className="truncate text-lg font-black text-slate-950">{project.name}</div>
                      <Badge variant={project.health.key === "risk" ? "danger" : "warning"}>{project.health.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {project.description ?? "Bu proje icin teslim akisi Synorq panelinden izleniyor."}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Health score</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{project.health.score}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Client</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{project.client?.name ?? "Internal"}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Due date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Owner</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.owner?.name ?? project.owner?.email ?? workspace.owner.name ?? workspace.owner.email}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Acil risk</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{project.criticalRisks} kritik risk</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Sahiplik</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{project.unassignedTasks} atanmamis gorev</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs text-slate-400">Milestone</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.nextMilestone?.title ?? "Tanimsiz"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {project.type.replace("_", " ")} • {project.priority} priority • son hareket {formatRelative(project.lastActivityAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Action Queue</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Bugun karar bekleyen isler</h2>
            </div>
            <Link href="/my-tasks" className="text-sm font-semibold text-indigo-600 hover:underline">
              Gorevlerim
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {attentionTasks.map((task) => {
              const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < now);
              const dueSoon = Boolean(task.dueDate && !isOverdue && inNextWeek(new Date(task.dueDate), now));

              return (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}`}
                  className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">{task.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">{task.projectName}</span>
                        {!task.assigneeId && <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">Atama bekliyor</span>}
                        {isOverdue && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Gecikti</span>}
                        {!isOverdue && dueSoon && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Bu hafta teslim</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Oncelik</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{task.priority ?? "MEDIUM"}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">My Focus</div>
            <div className="mt-4 space-y-3">
              {myTasks.length === 0 && (
                <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-500">
                  Uzerinize atanmis aktif gorev bulunmuyor.
                </div>
              )}

              {myTasks.map((task) => (
                <Link key={task.id} href={`/projects/${task.project.id}`} className="block rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-100">
                  <div className="truncate text-sm font-semibold text-slate-900">{task.title}</div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: task.project.color }} />
                      {task.project.name}
                    </span>
                    <span>{task.dueDate ? formatDate(task.dueDate) : "Plansiz"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Team Capacity</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Kapasite ve darbo gaz sinyali</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Owner: {workspace.owner.name ?? workspace.owner.email}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {teamLoad.map((member) => {
              const barWidth = Math.min(100, Math.max(12, member.loadScore));
              return (
                <div key={member.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-950">{member.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {member.role} • {member.activeTasks} aktif gorev
                      </div>
                    </div>
                    <Badge
                      variant={
                        member.loadState === "overloaded"
                          ? "danger"
                          : member.loadState === "watch"
                            ? "warning"
                            : "success"
                      }
                    >
                      {member.loadState === "overloaded"
                        ? "Yuksek yuk"
                        : member.loadState === "watch"
                          ? "Izleniyor"
                          : "Dengeli"}
                    </Badge>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-white">
                    <div
                      className={`h-2 rounded-full ${
                        member.loadState === "overloaded"
                          ? "bg-red-500"
                          : member.loadState === "watch"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div>
                      <div>Geciken</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{member.overdueTasks}</div>
                    </div>
                    <div>
                      <div>Bu hafta teslim</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{member.dueThisWeekTasks}</div>
                    </div>
                    <div>
                      <div>7 gun throughput</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{member.completedLast7Days}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Activity Stream</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Son hareket ve karar izi</h2>
            </div>
            <Link href="/audit" className="text-sm font-semibold text-indigo-600 hover:underline">
              Tum activity
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentActivity.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Henuz hareket kaydi yok.
              </div>
            )}

            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {ACTIVITY_LABELS[item.action as keyof typeof ACTIVITY_LABELS] ?? item.action}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {(item.user.name ?? item.user.email) + (item.project ? ` • ${item.project.name}` : "")}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatRelative(item.createdAt)}</div>
                    <div className="mt-1">{formatDate(item.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
