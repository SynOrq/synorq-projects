import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Filter,
  FolderKanban,
  LayoutGrid,
  ListFilter,
  PauseCircle,
  Plus,
  Search,
  TableProperties,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { formatDate, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "danger" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  ON_HOLD: { label: "Beklemede", variant: "warning" },
  COMPLETED: { label: "Tamamlandi", variant: "secondary" },
  ARCHIVED: { label: "Arsiv", variant: "secondary" },
};

type ProjectsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    health?: string;
    view?: string;
  }>;
};

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const filters = await searchParams;
  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { select: { userId: true } },
    },
  });

  if (!workspace) redirect("/auth/login");

  const projectsRaw = await db.project.findMany({
    where: { workspaceId: workspace.id },
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
  });

  const query = filters?.q?.trim().toLowerCase() ?? "";
  const selectedStatus = filters?.status?.toUpperCase() ?? "ALL";
  const selectedHealth = filters?.health?.toLowerCase() ?? "all";
  const selectedView = filters?.view === "table" ? "table" : "cards";
  const analyzedProjects = analyzeProjects(projectsRaw as PortfolioProject[]);

  const filteredProjects = analyzedProjects.filter((project) => {
    const matchesQuery =
      query.length === 0 ||
      project.name.toLowerCase().includes(query) ||
      (project.description ?? "").toLowerCase().includes(query);
    const matchesStatus = selectedStatus === "ALL" || project.status === selectedStatus;
    const matchesHealth = selectedHealth === "all" || project.health.key === selectedHealth;
    return matchesQuery && matchesStatus && matchesHealth;
  });

  const totalProjects = analyzedProjects.length;
  const activeProjects = analyzedProjects.filter((project) => project.status === "ACTIVE").length;
  const pausedProjects = analyzedProjects.filter((project) => project.status === "ON_HOLD").length;
  const riskProjects = analyzedProjects.filter((project) => project.health.key === "risk").length;
  const dueThisWeekProjects = analyzedProjects.filter(
    (project) => project.dueInDays !== null && project.dueInDays >= 0 && project.dueInDays <= 7
  ).length;
  const overdueTasksTotal = analyzedProjects.reduce((sum, project) => sum + project.overdueTasks, 0);
  const averageCompletion =
    totalProjects === 0
      ? 0
      : Math.round(analyzedProjects.reduce((sum, project) => sum + project.completionRate, 0) / totalProjects);

  const statusOptions = [
    { value: "ALL", label: "Tum durumlar" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "ON_HOLD", label: "Beklemede" },
    { value: "COMPLETED", label: "Tamamlandi" },
    { value: "ARCHIVED", label: "Arsiv" },
  ];

  const savedViews = [
    {
      label: "Tum projeler",
      href: buildQuery({ q: filters?.q, view: selectedView }),
      active: selectedStatus === "ALL" && selectedHealth === "all",
    },
    {
      label: "Riskte olanlar",
      href: buildQuery({ q: filters?.q, health: "risk", view: selectedView }),
      active: selectedHealth === "risk",
    },
    {
      label: "Bu hafta teslim",
      href: buildQuery({ q: filters?.q, status: "ACTIVE", view: selectedView }),
      active: selectedStatus === "ACTIVE" && selectedHealth === "all",
    },
    {
      label: "Beklemede",
      href: buildQuery({ q: filters?.q, status: "ON_HOLD", view: selectedView }),
      active: selectedStatus === "ON_HOLD",
    },
  ];

  const mostDelayedProject = [...filteredProjects].sort((a, b) => b.overdueTasks - a.overdueTasks)[0];
  const nearestDeadlineProject = [...filteredProjects]
    .filter((project) => project.dueDateResolved)
    .sort((a, b) => (a.dueInDays ?? 999) - (b.dueInDays ?? 999))[0];
  const fastestProject = [...filteredProjects].sort((a, b) => b.completionRate - a.completionRate)[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(37,99,235,0.08)_42%,rgba(6,182,212,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <ListFilter size={13} />
                Portfolio Visibility
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Portfoyu teslim riski, sahiplik ve ritim uzerinden tarayin.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Synorq Projects, servis ekipleri icin proje listesi degil; delivery gorunurlugu, proje sagligi ve
                operasyonel sahiplik panelidir.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus size={16} />
                    Yeni proje ac
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">
                    Dashboarda don
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <TrendingUp size={13} className="text-indigo-600" />
                  Portfoy
                </div>
                <div className="mt-3 text-2xl font-black text-slate-950">{totalProjects}</div>
                <div className="mt-1 text-xs text-slate-500">{activeProjects} aktif proje</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <AlertTriangle size={13} className="text-red-500" />
                  Risk
                </div>
                <div className="mt-3 text-2xl font-black text-slate-950">{riskProjects}</div>
                <div className="mt-1 text-xs text-slate-500">kritik health sinyali</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <CalendarRange size={13} className="text-cyan-600" />
                  Takvim
                </div>
                <div className="mt-3 text-2xl font-black text-slate-950">{dueThisWeekProjects}</div>
                <div className="mt-1 text-xs text-slate-500">bu hafta kapanacak proje</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FolderKanban size={16} className="text-indigo-600" />
            Toplam proje
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">{totalProjects}</div>
          <div className="mt-1 text-xs text-slate-500">{activeProjects} aktif, {pausedProjects} beklemede</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <AlertTriangle size={16} className="text-red-500" />
            Geciken gorev
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">{overdueTasksTotal}</div>
          <div className="mt-1 text-xs text-slate-500">teslim tarihi gecmis acik is</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Ortalama ilerleme
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">%{averageCompletion}</div>
          <div className="mt-1 text-xs text-slate-500">tum projelerde tamamlanma orani</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <UsersRound size={16} className="text-cyan-600" />
            Workspace owner
          </div>
          <div className="mt-4 text-lg font-black text-slate-950">{workspace.owner.name ?? workspace.owner.email}</div>
          <div className="mt-1 text-xs text-slate-500">{workspace.members.length} ekip uyesi bagli</div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="grid gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Arama
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={filters?.q ?? ""}
                  placeholder="Proje adi veya aciklama ara"
                  className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Durum
              </label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Saglik
              </label>
              <select
                name="health"
                defaultValue={selectedHealth}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Tum seviyeler</option>
                <option value="good">Saglikli</option>
                <option value="steady">Izleniyor</option>
                <option value="risk">Riskli</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input type="hidden" name="view" value={selectedView} />
              <Button type="submit" className="flex-1 lg:flex-none">
                <Filter size={15} />
                Uygula
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/projects${buildQuery({ view: selectedView })}`}>Sifirla</Link>
              </Button>
            </div>
          </form>

          <div className="flex items-center rounded-2xl bg-slate-100 p-1">
            <Link
              href={`/projects${buildQuery({
                q: filters?.q,
                status: selectedStatus === "ALL" ? undefined : selectedStatus,
                health: selectedHealth === "all" ? undefined : selectedHealth,
                view: "cards",
              })}`}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                selectedView === "cards" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutGrid size={15} />
              Cards
            </Link>
            <Link
              href={`/projects${buildQuery({
                q: filters?.q,
                status: selectedStatus === "ALL" ? undefined : selectedStatus,
                health: selectedHealth === "all" ? undefined : selectedHealth,
                view: "table",
              })}`}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                selectedView === "table" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <TableProperties size={15} />
              Table
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <Link
              key={view.label}
              href={`/projects${view.href}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                view.active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {view.label}
            </Link>
          ))}
        </div>
      </div>

      {analyzedProjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="mb-4 inline-flex rounded-2xl bg-indigo-50 p-4">
            <FolderKanban size={28} className="text-indigo-600" />
          </div>
          <h3 className="mb-2 font-bold text-slate-950">Henuz proje yok</h3>
          <p className="mb-6 text-sm text-slate-500">Ilk projenizi olusturarak portfoyu aktif hale getirin.</p>
          <Button asChild>
            <Link href="/projects/new">
              <Plus size={16} />
              Proje olustur
            </Link>
          </Button>
        </div>
      )}

      {analyzedProjects.length > 0 && filteredProjects.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Secili filtrelerle eslesen proje bulunamadi.
        </div>
      )}

      {filteredProjects.length > 0 && selectedView === "cards" && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProjects.map((project) => {
            const st = statusLabel[project.status] ?? statusLabel.ACTIVE;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="mb-5 h-1.5 w-full rounded-full" style={{ background: project.color }} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xl font-black text-slate-950">{project.name}</h3>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {project.description ?? "Delivery control detaylari bu proje akisi icinde izleniyor."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{project.client?.name ?? "Internal"}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {project.owner?.name ?? project.owner?.email ?? workspace.owner.name ?? workspace.owner.email}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{project.type.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${project.health.tone}`}>
                    {project.health.label}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Health</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.health.score}</div>
                    <div className="text-xs text-slate-500">skor</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Aktif is</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.openTasks}</div>
                    <div className="text-xs text-slate-500">{project.totalTasks} toplam gorev</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Risk</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.openRisks}</div>
                    <div className="text-xs text-slate-500">{project.criticalRisks} kritik</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Sahiplik</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{project.activeAssignees}</div>
                    <div className="text-xs text-slate-500">{project.unassignedTasks} atanmamis</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Milestone</div>
                    <div className="mt-1 text-lg font-black text-slate-950">%{project.milestoneCompletionRate}</div>
                    <div className="text-xs text-slate-500">{project.openMilestones} acik milestone</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Tamamlanma</span>
                    <span>%{project.completionRate}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                      style={{ width: `${project.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-400">Due date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-400">Son hareket</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatRelative(project.lastActivityAt)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-400">Owner</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.owner?.name ?? project.owner?.email ?? workspace.owner.name ?? workspace.owner.email}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {project.nextMilestone?.title ?? "Milestone tanimsiz"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {project.nextMilestone?.dueDate ? formatDate(project.nextMilestone.dueDate) : "Plansiz"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filteredProjects.length > 0 && selectedView === "table" && (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-5 py-4">Proje</th>
                  <th className="px-5 py-4">Client</th>
                  <th className="px-5 py-4">Health</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4">Due date</th>
                  <th className="px-5 py-4">Aktif is</th>
                  <th className="px-5 py-4">Risk</th>
                  <th className="px-5 py-4">Milestone</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Son hareket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const st = statusLabel[project.status] ?? statusLabel.ACTIVE;
                  return (
                    <tr key={project.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link href={`/projects/${project.id}`} className="block">
                          <div className="flex items-start gap-3">
                            <span className="mt-1 h-3 w-3 rounded-full" style={{ background: project.color }} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-950">{project.name}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {project.description ?? "Delivery visibility icin proje detayi acin."}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-700">{project.client?.name ?? "Internal"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-black text-slate-950">{project.health.score}</div>
                        <div className="mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {project.health.label}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {project.openTasks} acik / %{project.completionRate}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {project.openRisks} acik • {project.criticalRisks} kritik
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        %{project.milestoneCompletionRate} • {project.nextMilestone?.title ?? "Tanimsiz"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {project.owner?.name ?? project.owner?.email ?? workspace.owner.name ?? workspace.owner.email}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{formatRelative(project.lastActivityAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProjects.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Portfoy ozeti</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtrelenen proje setinin karar destek acisindan en onemli sinyalleri.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredProjects.length} proje analiz edildi
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="space-y-4">
                {statusOptions.slice(1).map((option) => {
                  const count = filteredProjects.filter((project) => project.status === option.value).length;
                  const percentage = filteredProjects.length === 0 ? 0 : Math.round((count / filteredProjects.length) * 100);

                  return (
                    <div key={option.value}>
                      <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                        <span>{option.label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white">
                        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">En kritik</div>
                <div className="mt-3 text-base font-black text-red-900">{mostDelayedProject?.name ?? "Risk gorunmuyor"}</div>
                <div className="mt-2 text-sm text-red-700">{mostDelayedProject?.overdueTasks ?? 0} geciken gorev</div>
              </div>
              <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">En yakin teslim</div>
                <div className="mt-3 text-base font-black text-sky-900">{nearestDeadlineProject?.name ?? "Takvim bos"}</div>
                <div className="mt-2 text-sm text-sky-700">
                  {nearestDeadlineProject?.dueDateResolved ? formatDate(nearestDeadlineProject.dueDateResolved) : "Plansiz"}
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">En iyi hiz</div>
                <div className="mt-3 text-base font-black text-emerald-900">{fastestProject?.name ?? "Veri yok"}</div>
                <div className="mt-2 text-sm text-emerald-700">%{fastestProject?.completionRate ?? 0} tamamlanma</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
