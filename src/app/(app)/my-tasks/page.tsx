import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";
import { CheckSquare, ArrowRight, Clock3, FolderKanban, Target, TriangleAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
  });

  if (!workspace) redirect("/auth/login");

  const tasks = await db.task.findMany({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: session.user.id,
    },
    include: { project: { select: { id: true, name: true, color: true } } },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  const activeTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const completedTasks = tasks.filter((task) => task.status === "DONE");
  const now = new Date();
  const dueSoonBoundary = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdueTasks = activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now);
  const dueSoonTasks = activeTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= now && dueDate <= dueSoonBoundary;
  });
  const focusTasks = activeTasks.slice(0, 4);
  const statusBreakdown = [
    { label: "Aktif görev", value: activeTasks.length, tone: "from-indigo-500 to-blue-500", icon: Target },
    { label: "Bu hafta teslim", value: dueSoonTasks.length, tone: "from-cyan-500 to-sky-500", icon: Clock3 },
    { label: "Teslim riski", value: overdueTasks.length, tone: "from-rose-500 to-orange-500", icon: TriangleAlert },
    { label: "Tamamlanan", value: completedTasks.length, tone: "from-emerald-500 to-teal-500", icon: CheckSquare },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
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
              Bana atanan isleri, teslim risklerini ve tamamlanan akisi tek calisma yuzeyinden izliyorum.
              Synorq Projects icindeki execution layer burada odak listeme donusuyor.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Odak listesi</div>
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Aktif gorev akisi</h2>
              <p className="mt-1 text-sm text-slate-500">Rol, teslim tarihi ve oncelik sinyaliyle calisan gorev listesi.</p>
            </div>
            <div className="text-sm font-semibold text-slate-500">{activeTasks.length} acik gorev</div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {activeTasks.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">Harika, su anda uzerinizde acik gorev yok.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeTasks.map((task) => {
                  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                  const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < now);
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
                            {isOverdue && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                Gecikti
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: task.project.color }} />
                              {task.project.name}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                            <span className={`rounded-full px-2.5 py-1 font-medium ${pc.bg} ${pc.color}`}>{pc.label}</span>
                            {task.dueDate && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                {formatDate(task.dueDate)}
                              </span>
                            )}
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
            <h2 className="text-lg font-black text-slate-950">Teslim sinyalleri</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <div className="text-sm font-semibold text-red-700">Geciken gorevler</div>
                <div className="mt-1 text-sm text-red-600">{overdueTasks.length} is aksiyona ihtiyac duyuyor.</div>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                <div className="text-sm font-semibold text-cyan-800">Bu hafta teslim</div>
                <div className="mt-1 text-sm text-cyan-700">{dueSoonTasks.length} gorev yaklasan takvimde.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">Tamamlanma ritmi</div>
                <div className="mt-1 text-sm text-slate-600">{completedTasks.length} gorev tamamlandi ve arsivlenmeye hazir.</div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">Tamamlananlar</h2>
              <p className="mt-1 text-sm text-slate-500">{completedTasks.length} gorev kapanis akisinda.</p>
            </div>
            {completedTasks.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">Henuz tamamlanan gorev yok.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedTasks.map((task) => {
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
