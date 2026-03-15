import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckSquare, Clock3, FolderKanban, Target, TriangleAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/types";
import { formatDate } from "@/lib/utils";

type MyTasksPageProps = {
  searchParams?: Promise<{
    segment?: string;
  }>;
};

const segmentOptions = [
  { id: "all", label: "Tum aktif isler" },
  { id: "today", label: "Bugun" },
  { id: "overdue", label: "Gecikenler" },
  { id: "review", label: "Review bekleyenler" },
  { id: "blocked", label: "Blocked" },
] as const;

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;
  const filters = await searchParams;
  const selectedSegment = segmentOptions.some((item) => item.id === filters?.segment)
    ? (filters?.segment as (typeof segmentOptions)[number]["id"])
    : "all";

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
  });

  if (!workspace) redirect("/auth/login");

  const tasks = await db.task.findMany({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: userId,
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      creator: { select: { id: true, name: true } },
      _count: { select: { comments: true, subTasks: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekBoundary = new Date(todayStart);
  weekBoundary.setDate(weekBoundary.getDate() + 7);
  const lastWeek = new Date(todayStart);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const activeTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const completedTasks = tasks.filter((task) => task.status === "DONE");
  const todayTasks = activeTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= todayStart && dueDate < todayEnd;
  });
  const overdueTasks = activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) < todayStart);
  const reviewTasks = activeTasks.filter((task) => task.status === "IN_REVIEW");
  const blockedTasks = activeTasks.filter((task) => task.labels.includes("Blocked"));
  const dueSoonTasks = activeTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= todayStart && dueDate <= weekBoundary;
  });
  const completedLast7Days = completedTasks.filter((task) => task.completedAt && new Date(task.completedAt) >= lastWeek);

  const activeList =
    selectedSegment === "today"
      ? todayTasks
      : selectedSegment === "overdue"
        ? overdueTasks
        : selectedSegment === "review"
          ? reviewTasks
          : selectedSegment === "blocked"
            ? blockedTasks
            : activeTasks;

  const focusTasks = [...activeTasks].sort((left, right) => {
    const leftOverdue = left.dueDate ? new Date(left.dueDate) < todayStart : false;
    const rightOverdue = right.dueDate ? new Date(right.dueDate) < todayStart : false;
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  }).slice(0, 4);

  const statusBreakdown = [
    { label: "Aktif gorev", value: activeTasks.length, tone: "from-indigo-500 to-blue-500", icon: Target },
    { label: "Bugun teslim", value: todayTasks.length, tone: "from-cyan-500 to-sky-500", icon: Clock3 },
    { label: "Teslim riski", value: overdueTasks.length, tone: "from-rose-500 to-orange-500", icon: TriangleAlert },
    { label: "7 gun throughput", value: completedLast7Days.length, tone: "from-emerald-500 to-teal-500", icon: CheckSquare },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
              <FolderKanban size={13} />
              Execution Inbox
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950">
              <CheckSquare className="text-indigo-600" />
              Gorevlerim
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Bugun yapilacaklar, gecikenler, review kuyrugu ve blocked isler ayni execution panelinde toplanir.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {segmentOptions.map((segment) => (
                <Link
                  key={segment.id}
                  href={segment.id === "all" ? "/my-tasks" : `/my-tasks?segment=${segment.id}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedSegment === segment.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {segment.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Bugunku odak</div>
            <div className="mt-3 space-y-2">
              {focusTasks.length === 0 && (
                <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-500">
                  Uzerinizde acik gorev yok. Yeni atamalar burada gorunecek.
                </div>
              )}
              {focusTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${task.project.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-100"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ background: task.project.color }} />
                      <span className="truncate">{task.project.name}</span>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusBreakdown.map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white`}>
              <Icon size={18} />
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            <div className="mt-1 text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Execution queue</h2>
              <p className="mt-1 text-sm text-slate-500">Today, overdue, review ve blocked segmentleri ayni akis icinde okunur.</p>
            </div>
            <div className="text-sm font-semibold text-slate-500">{activeList.length} kayit</div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {activeList.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">Secili segmentte gorev bulunmuyor.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeList.map((task) => {
                  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                  const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < todayStart);
                  const isToday = Boolean(task.dueDate && new Date(task.dueDate) >= todayStart && new Date(task.dueDate) < todayEnd);
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project.id}`}
                      className="group block px-5 py-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{
                            background:
                              task.priority === "URGENT"
                                ? "#ef4444"
                                : task.priority === "HIGH"
                                  ? "#f97316"
                                  : task.priority === "MEDIUM"
                                    ? "#3b82f6"
                                    : "#94a3b8",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-900">{task.title}</div>
                            {isOverdue && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">Gecikti</span>}
                            {!isOverdue && isToday && <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">Bugun</span>}
                            {task.status === "IN_REVIEW" && <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold text-purple-700">Review</span>}
                            {task.labels.includes("Blocked") && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Blocked</span>}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: task.project.color }} />
                              {task.project.name}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                            <span className={`rounded-full px-2.5 py-1 font-medium ${pc.bg} ${pc.color}`}>{pc.label}</span>
                            {task.dueDate && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{formatDate(task.dueDate)}</span>}
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                              {task._count.comments} yorum • {task._count.subTasks} alt gorev
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={16} className="mt-1 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Workload snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <div className="text-sm font-semibold text-red-700">Geciken gorevler</div>
                <div className="mt-1 text-sm text-red-600">{overdueTasks.length} is bugun aksiyon istiyor.</div>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                <div className="text-sm font-semibold text-cyan-800">Bu hafta teslim</div>
                <div className="mt-1 text-sm text-cyan-700">{dueSoonTasks.length} gorev yaklasan takvimde.</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-sm font-semibold text-amber-800">Blocked</div>
                <div className="mt-1 text-sm text-amber-700">{blockedTasks.length} gorev destek veya karar bekliyor.</div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
                <div className="text-sm font-semibold text-purple-800">Review queue</div>
                <div className="mt-1 text-sm text-purple-700">{reviewTasks.length} gorev inceleme bekliyor.</div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">Recently completed</h2>
              <p className="mt-1 text-sm text-slate-500">{completedLast7Days.length} gorev son 7 gunde kapandi.</p>
            </div>
            {completedLast7Days.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">Son 7 gunde tamamlanan gorev yok.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedLast7Days.map((task) => {
                  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project.id}`}
                      className="group flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-500 line-through">{task.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{task.project.name}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
