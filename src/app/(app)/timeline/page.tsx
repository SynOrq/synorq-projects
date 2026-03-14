import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarRange, CheckCircle2, Clock3, FolderKanban, Gauge } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import { buildWorkspaceTimeline } from "@/lib/workspace-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function toneClasses(tone: "good" | "watch" | "risk") {
  if (tone === "risk") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function laneTitle(key: "overdue" | "thisWeek" | "later") {
  if (key === "overdue") return "Overdue";
  if (key === "thisWeek") return "This week";
  return "Later";
}

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      _count: { select: { projects: true } },
    },
  });

  if (!workspace) redirect("/auth/login");

  const [milestones, tasks] = await Promise.all([
    db.milestone.findMany({
      where: {
        project: {
          workspaceId: workspace.id,
          status: { not: "ARCHIVED" },
        },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        owner: { select: { name: true, email: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: {
        project: {
          workspaceId: workspace.id,
          status: { not: "ARCHIVED" },
        },
        dueDate: { not: null },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 80,
    }),
  ]);

  const timeline = buildWorkspaceTimeline(
    milestones.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      dueDate: item.dueDate,
      projectId: item.project.id,
      projectName: item.project.name,
      projectColor: item.project.color,
      ownerName: item.owner?.name ?? item.owner?.email ?? "Owner tanimsiz",
      taskCount: item.tasks.length,
      completedTaskCount: item.tasks.filter((task) => task.status === "DONE").length,
    })),
    tasks.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      dueDate: item.dueDate,
      priority: item.priority,
      labels: item.labels,
      projectId: item.project.id,
      projectName: item.project.name,
      projectColor: item.project.color,
      assigneeName: item.assignee?.name ?? item.assignee?.email ?? "Atanmamis",
    }))
  );

  const summaryCards = [
    { label: "Overdue items", value: timeline.summary.overdueCount, note: "aksiyon bekleyen teslim" },
    { label: "This week", value: timeline.summary.dueThisWeekCount, note: "7 gunluk kapanis penceresi" },
    { label: "Milestone progress", value: `%${timeline.summary.milestoneCompletionRate}`, note: `${timeline.summary.completedMilestones} milestone tamamlandi` },
    { label: "Scheduled tasks", value: timeline.summary.scheduledTasks, note: `${timeline.summary.scheduledMilestones} milestone planlandi` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(59,130,246,0.08)_42%,rgba(14,165,233,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <CalendarRange size={13} />
                Workspace Timeline
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Milestone ve task takvimini tek delivery ekseninde izleyin.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {workspace.name} icindeki proje kapanislari, milestone due date&apos;leri ve gorev teslimleri ayni timeline
                yuzeyinde okunur.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/projects">
                    Portfolioyu ac
                    <ArrowRight size={13} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reports">Reports</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</div>
                <div className="mt-2 text-xl font-black text-slate-950">{workspace.name}</div>
                <div className="mt-1 text-xs text-slate-500">{workspace._count.projects} aktif proje kaydi</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Peak day</div>
                <div className="mt-2 text-xl font-black text-slate-950">
                  {timeline.busiestDay ? formatDate(timeline.busiestDay.date) : "Plansiz"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {timeline.busiestDay ? `${timeline.busiestDay.count} teslim birikiyor` : "Takvim yogunlugu hesaplanamadi"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = index === 0 ? Clock3 : index === 1 ? CalendarRange : index === 2 ? CheckCircle2 : FolderKanban;
          return (
            <div key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon size={18} />
              </div>
              <div className="mt-4 text-3xl font-black text-slate-950">{card.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{card.label}</div>
              <div className="mt-1 text-xs text-slate-500">{card.note}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Gauge size={18} className="text-indigo-600" />
            Delivery lanes
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {(["overdue", "thisWeek", "later"] as const).map((key) => (
              <div key={key} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-slate-950">{laneTitle(key)}</div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                    {timeline.buckets[key].length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {timeline.buckets[key].length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                      Bu lane icin teslim kaydi yok.
                    </div>
                  )}
                  {timeline.buckets[key].map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.projectColor }} />
                        <div className="truncate text-sm font-black text-slate-950">{item.title}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.kind}</span>
                        <span className={`rounded-full border px-2.5 py-1 ${toneClasses(item.tone)}`}>{item.status}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.projectName}</span>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">{item.meta}</div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{item.ownerName}</span>
                        <span>{formatRelative(item.dueDate)}</span>
                      </div>
                      {item.progress !== null && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Progress</span>
                            <span>%{item.progress}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <CalendarRange size={18} className="text-cyan-600" />
              Milestone rail
            </div>
            <div className="mt-5 space-y-3">
              {timeline.featuredMilestones.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Due date&apos;li milestone kaydi bulunmuyor.
                </div>
              )}
              {timeline.featuredMilestones.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.projectColor }} />
                        <div className="text-sm font-black text-slate-950">{item.title}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{item.projectName} • {item.ownerName}</div>
                    </div>
                    <Badge variant={item.tone === "risk" ? "danger" : item.tone === "watch" ? "warning" : "success"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatDate(item.dueDate)}</span>
                      <span>%{item.progress ?? 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${item.progress ?? 0}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="text-sm font-semibold text-white">Timeline operating notes</div>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Overdue lane geciken milestone ve task teslimlerini tek queue&apos;da gosterir.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                This week lane gelecek 7 gun icindeki tum teslim baskisini ayni bandda toplar.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Milestone rail proje timeline&apos;indaki stratejik kapanislari global seviyede ozetler.
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
