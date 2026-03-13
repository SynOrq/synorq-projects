import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FolderKanban,
  Gauge,
  Plus,
  UsersRound,
} from "lucide-react";

function getCompletionRate(total: number, done: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { projects: true, members: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const [projects, myTasks, openAssignedTasks, recentActivity] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            assigneeId: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
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
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        status: { notIn: ["DONE", "CANCELLED"] },
        assigneeId: { not: null },
      },
      select: {
        assigneeId: true,
      },
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
  ]);

  const today = new Date();
  const firstName = session.user?.name?.split(" ")[0] ?? "Kullanici";
  const totalTasks = projects.reduce((sum, project) => sum + project.tasks.length, 0);
  const completedTasks = projects.reduce(
    (sum, project) => sum + project.tasks.filter((task) => task.status === "DONE").length,
    0
  );
  const overdueTasks = projects.reduce(
    (sum, project) =>
      sum +
      project.tasks.filter((task) => task.dueDate && new Date(task.dueDate) < today && task.status !== "DONE").length,
    0
  );
  const averageCompletion = getCompletionRate(totalTasks, completedTasks);

  const projectSignals = projects
    .map((project) => {
      const done = project.tasks.filter((task) => task.status === "DONE").length;
      const open = project.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED").length;
      const overdue = project.tasks.filter(
        (task) => task.dueDate && new Date(task.dueDate) < today && task.status !== "DONE"
      ).length;
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        total: project.tasks.length,
        done,
        open,
        overdue,
        completion: getCompletionRate(project.tasks.length, done),
      };
    })
    .sort((a, b) => b.overdue - a.overdue || a.completion - b.completion)
    .slice(0, 4);

  const teamLoad = workspace.members
    .map((member) => {
      const activeCount = openAssignedTasks.filter((task) => task.assigneeId === member.userId).length;
      return {
        id: member.userId,
        name: member.user.name ?? member.user.email,
        email: member.user.email,
        role: member.role,
        activeCount,
      };
    })
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 5);

  const stats = [
    {
      title: "Aktif proje",
      value: workspace._count.projects,
      detail: "portfoy genel gorunumu",
      icon: FolderKanban,
      tone: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Teslim riski",
      value: overdueTasks,
      detail: "geciken acik gorev",
      icon: AlertTriangle,
      tone: "text-red-600 bg-red-50",
    },
    {
      title: "Ortalama ilerleme",
      value: `%${averageCompletion}`,
      detail: "tum projelerde genel tamamlanma",
      icon: Gauge,
      tone: "text-cyan-600 bg-cyan-50",
    },
    {
      title: "Ekip uyeleri",
      value: workspace._count.members,
      detail: "rol bazli workspace yapisi",
      icon: UsersRound,
      tone: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.06),rgba(6,182,212,0.05)_42%,transparent_70%)]" />
        <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Gauge size={13} />
              Synorq Control Surface
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Merhaba {firstName}, operasyon ritmini bugunden okuyun.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {workspace.name} icin proje yurutme, ekip sinyalleri ve teslim riskleri tek cockpit uzerinde gorunur.
              Bugun odaklanmaniz gereken alanlari asagidaki ozet panellerden takip edebilirsiniz.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/projects/new">
                  <Plus size={16} />
                  Yeni Proje
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/products/projects">
                  Modul Tanimini Gor
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Calisma alani</div>
              <div className="mt-3 text-2xl font-black text-slate-950">{workspace.name}</div>
              <div className="mt-1 text-xs text-slate-500">merkezi koordinasyon yuzu</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bana atanan</div>
              <div className="mt-3 text-2xl font-black text-slate-950">{myTasks.length}</div>
              <div className="mt-1 text-xs text-slate-500">acik odak gorevi</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Platform hissi</div>
              <div className="mt-3 text-2xl font-black text-slate-950">Projects</div>
              <div className="mt-1 text-xs text-slate-500">execution layer aktif</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-2xl p-2 ${stat.tone}`}>
                <Icon size={18} />
              </div>
              <div className="mt-4 text-3xl font-black text-slate-950">{stat.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{stat.title}</div>
              <div className="mt-1 text-xs text-slate-500">{stat.detail}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery Pulse</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Portfoy ve teslim sinyalleri</h2>
            </div>
            <Link href="/projects" className="text-sm font-semibold text-indigo-600 hover:underline">
              Tum projeler
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {projectSignals.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-slate-950">{project.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{project.status}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${project.overdue > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {project.overdue > 0 ? `${project.overdue} riskli` : "saglikli"}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Toplam</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Acik</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.open}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Tamam</div>
                    <div className="mt-1 text-lg font-black text-slate-950">%{project.completion}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">My Focus</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Bugunku odak gorevlerim</h2>
            </div>
            <Link href="/my-tasks" className="text-sm font-semibold text-indigo-600 hover:underline">
              Tum gorevler
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {myTasks.length === 0 && (
              <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Uzerinize atanmis aktif gorev bulunmuyor.
              </div>
            )}

            {myTasks.map((task) => (
              <Link key={task.id} href={`/projects/${task.project.id}`} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-950">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ background: task.project.color }} />
                      {task.project.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    <Clock3 size={12} />
                    {task.dueDate ? formatDate(task.dueDate) : "plansiz"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Team Load</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Ekip yuk sinyali</h2>

          <div className="mt-6 space-y-3">
            {teamLoad.map((member) => (
              <div key={member.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-950">{member.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{member.role} • {member.email}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {member.activeCount} aktif is
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Activity Stream</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Son operasyon hareketleri</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              workspace genel akisi
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-950">{item.user.name ?? item.user.email}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.action}
                      {item.project?.name ? ` • ${item.project.name}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{formatRelative(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
