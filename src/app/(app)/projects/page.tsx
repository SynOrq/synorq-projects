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
  Plus,
  Search,
  TableProperties,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { filterAccessibleProjects } from "@/lib/project-access";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import {
  buildOwnerDistribution,
  buildPortfolioRiskTrend,
  buildPortfolioWorkloadSummary,
} from "@/lib/projects-portfolio";
import { createSavedProjectsView, normalizeSavedProjectsView, resolveProjectFilters } from "@/lib/projects-saved-view";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { formatDate, formatRelative } from "@/lib/utils";
import { findWorkspaceState } from "@/lib/workspace-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProjectsSavedViewControls from "@/components/projects/ProjectsSavedViewControls";

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
  const userId = session.user.id;

  const filters = await searchParams;
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

  const workspaceState = await findWorkspaceState({
    workspaceId: workspace.id,
    userId: session.user.id,
    includeProjectView: true,
  });

  const savedViewResult = normalizeSavedProjectsView(workspaceState?.savedProjectsView ?? null);
  const savedView = savedViewResult.data ?? null;

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
          estimatedH: true,
          loggedH: true,
          labels: true,
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
  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });

  const resolvedFilters = resolveProjectFilters(filters ?? {}, savedView);
  const query = resolvedFilters.q.toLowerCase();
  const selectedStatus = resolvedFilters.status;
  const selectedHealth = resolvedFilters.health;
  const selectedView = resolvedFilters.view;
  const currentView = createSavedProjectsView({
    q: resolvedFilters.q,
    status: selectedStatus,
    health: selectedHealth,
    view: selectedView,
  });
  const analyzedProjects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[]);

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
    ...(savedView
      ? [
          {
            label: `${savedView.label} (Saved)`,
            href: buildQuery({
              q: savedView.q ?? undefined,
              status: savedView.status === "ALL" ? undefined : savedView.status,
              health: savedView.health === "all" ? undefined : savedView.health,
              view: savedView.view,
            }),
            active:
              selectedStatus === savedView.status &&
              selectedHealth === savedView.health &&
              selectedView === savedView.view &&
              query === (savedView.q ?? "").toLowerCase(),
          },
        ]
      : []),
    {
      label: "Tum projeler",
      href: buildQuery({ q: resolvedFilters.q || undefined, view: selectedView }),
      active: selectedStatus === "ALL" && selectedHealth === "all",
    },
    {
      label: "Riskte olanlar",
      href: buildQuery({ q: resolvedFilters.q || undefined, health: "risk", view: selectedView }),
      active: selectedHealth === "risk",
    },
    {
      label: "Bu hafta teslim",
      href: buildQuery({ q: resolvedFilters.q || undefined, status: "ACTIVE", view: selectedView }),
      active: selectedStatus === "ACTIVE" && selectedHealth === "all",
    },
    {
      label: "Beklemede",
      href: buildQuery({ q: resolvedFilters.q || undefined, status: "ON_HOLD", view: selectedView }),
      active: selectedStatus === "ON_HOLD",
    },
  ];

  const mostDelayedProject = [...filteredProjects].sort((a, b) => b.overdueTasks - a.overdueTasks)[0];
  const nearestDeadlineProject = [...filteredProjects]
    .filter((project) => project.dueDateResolved)
    .sort((a, b) => (a.dueInDays ?? 999) - (b.dueInDays ?? 999))[0];
  const fastestProject = [...filteredProjects].sort((a, b) => b.completionRate - a.completionRate)[0];
  const ownerDistribution = buildOwnerDistribution(filteredProjects);
  const riskTrend = buildPortfolioRiskTrend(filteredProjects);
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
  const workloadSummary = buildPortfolioWorkloadSummary(teamCapacity.snapshots);

  return (
    <div className="min-h-full">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <ListFilter size={13} />
              Portfolio Visibility
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Portfoyu teslim riski, sahiplik ve ritim uzerinden tarayin.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Synorq Projects, servis ekipleri icin proje listesi degil; delivery gorunurlugu, proje sagligi ve
              operasyonel sahiplik panelidir.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <TrendingUp size={13} className="text-indigo-600" />
                Portfoy
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{totalProjects}</div>
              <div className="mt-1 text-xs text-slate-500">{activeProjects} aktif proje</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <AlertTriangle size={13} className="text-red-500" />
                Risk
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{riskProjects}</div>
              <div className="mt-1 text-xs text-slate-500">kritik health sinyali</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <CalendarRange size={13} className="text-cyan-600" />
                Takvim
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{dueThisWeekProjects}</div>
              <div className="mt-1 text-xs text-slate-500">bu hafta kapanacak proje</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FolderKanban size={16} className="text-indigo-600" />
            Toplam proje
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900">{totalProjects}</div>
          <div className="mt-1 text-xs text-slate-500">{activeProjects} aktif, {pausedProjects} beklemede</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <AlertTriangle size={16} className="text-red-500" />
            Geciken gorev
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900">{overdueTasksTotal}</div>
          <div className="mt-1 text-xs text-slate-500">teslim tarihi gecmis acik is</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Ortalama ilerleme
          </div>
          <div className="mt-4 text-2xl font-bold text-slate-900">%{averageCompletion}</div>
          <div className="mt-1 text-xs text-slate-500">tum projelerde tamamlanma orani</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <UsersRound size={16} className="text-cyan-600" />
            Workspace owner
          </div>
          <div className="mt-4 text-base font-semibold text-slate-900">{workspace.owner.name ?? workspace.owner.email}</div>
          <div className="mt-1 text-xs text-slate-500">{workspace.members.length} ekip uyesi bagli</div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="grid gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Arama
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={resolvedFilters.q}
                  placeholder="Proje adi veya aciklama ara"
                  className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Durum
              </label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Saglik
              </label>
              <select
                name="health"
                defaultValue={selectedHealth}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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

          <div className="flex items-center rounded-lg bg-slate-100 p-1">
            <Link
              href={`/projects${buildQuery({
                q: resolvedFilters.q || undefined,
                status: selectedStatus === "ALL" ? undefined : selectedStatus,
                health: selectedHealth === "all" ? undefined : selectedHealth,
                view: "cards",
              })}`}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                selectedView === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutGrid size={15} />
              Cards
            </Link>
            <Link
              href={`/projects${buildQuery({
                q: resolvedFilters.q || undefined,
                status: selectedStatus === "ALL" ? undefined : selectedStatus,
                health: selectedHealth === "all" ? undefined : selectedHealth,
                view: "table",
              })}`}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                selectedView === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
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

        <ProjectsSavedViewControls currentView={currentView} savedView={savedView} />
      </div>

      {analyzedProjects.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
          <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-4">
            <FolderKanban size={28} className="text-indigo-600" />
          </div>
          <h3 className="mb-2 font-bold text-slate-900">Henuz proje yok</h3>
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
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
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
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="mb-5 h-1.5 w-full rounded-full" style={{ background: project.color }} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-900">{project.name}</h3>
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

                <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-5">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Health</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{project.health.score}</div>
                    <div className="text-xs text-slate-500">
                      {project.healthFactors.find((item) => item.key !== "baseline")?.label ?? "derived skor"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Aktif is</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{project.openTasks}</div>
                    <div className="text-xs text-slate-500">{project.totalTasks} toplam gorev</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Risk</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{project.openRisks}</div>
                    <div className="text-xs text-slate-500">{project.criticalRisks} kritik</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Sahiplik</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{project.activeAssignees}</div>
                    <div className="text-xs text-slate-500">{project.unassignedTasks} atanmamis</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Milestone</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">%{project.milestoneCompletionRate}</div>
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
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-400">Due date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-400">Son hareket</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatRelative(project.lastActivityAt)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                      <td className="px-5 py-3.5">
                        <Link href={`/projects/${project.id}`} className="block">
                          <div className="flex items-start gap-3">
                            <span className="mt-1 h-3 w-3 rounded-full" style={{ background: project.color }} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{project.name}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {project.description ?? "Delivery visibility icin proje detayi acin."}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-slate-700">{project.client?.name ?? "Internal"}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-slate-900">{project.health.score}</div>
                        <div className="mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {project.health.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {project.healthFactors.find((item) => item.key !== "baseline")?.label ?? "derived"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {project.dueDateResolved ? formatDate(project.dueDateResolved) : "Plansiz"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {project.openTasks} acik / %{project.completionRate}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {project.openRisks} acik • {project.criticalRisks} kritik
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        %{project.milestoneCompletionRate} • {project.nextMilestone?.title ?? "Tanimsiz"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {project.owner?.name ?? project.owner?.email ?? workspace.owner.name ?? workspace.owner.email}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">{formatRelative(project.lastActivityAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProjects.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Portfoy ozeti</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtrelenen proje setinin karar destek acisindan en onemli sinyalleri.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredProjects.length} proje analiz edildi
            </div>
          </div>

          <div className="p-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl bg-slate-50 p-5">
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
              <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-red-500">En kritik</div>
                <div className="mt-3 text-base font-semibold text-red-900">{mostDelayedProject?.name ?? "Risk gorunmuyor"}</div>
                <div className="mt-2 text-sm text-red-700">{mostDelayedProject?.overdueTasks ?? 0} geciken gorev</div>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">En yakin teslim</div>
                <div className="mt-3 text-base font-semibold text-sky-900">{nearestDeadlineProject?.name ?? "Takvim bos"}</div>
                <div className="mt-2 text-sm text-sky-700">
                  {nearestDeadlineProject?.dueDateResolved ? formatDate(nearestDeadlineProject.dueDateResolved) : "Plansiz"}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">En iyi hiz</div>
                <div className="mt-3 text-base font-semibold text-emerald-900">{fastestProject?.name ?? "Veri yok"}</div>
                <div className="mt-2 text-sm text-emerald-700">%{fastestProject?.completionRate ?? 0} tamamlanma</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {filteredProjects.length > 0 && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Risk trend</h2>
                <p className="mt-1 text-sm text-slate-500">Portfoyde risk baskisinin hangi katmanda toplandigini okuyun.</p>
              </div>
              <Badge variant="warning">{riskProjects} risk bandinda</Badge>
            </div>

            <div className="mt-6 space-y-4">
              {riskTrend.map((item) => (
                <div key={item.key}>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Owner distribution</h2>
                <p className="mt-1 text-sm text-slate-500">Sahiplik dagilimi, risk yogunlugu ve ortalama completion ayni tabloda.</p>
              </div>
              <Badge variant="secondary">{ownerDistribution.length} owner segmenti</Badge>
            </div>

            <div className="mt-6 space-y-3">
              {ownerDistribution.map((owner) => (
                <div key={owner.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition hover:bg-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{owner.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{owner.projects} proje • %{owner.averageCompletion} ort. completion</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{owner.riskProjects} risk proje</div>
                      <div className="mt-1">{owner.overdueTasks} overdue task</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {filteredProjects.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Workload summary</h2>
              <p className="mt-1 text-sm text-slate-500">Team capacity sinyallerini portfolio baglaminda owner ve teslim baskisiyla okuyun.</p>
            </div>
            <Badge variant={workloadSummary.overloadedMembers > 0 ? "danger" : "success"}>
              %{workloadSummary.averageUtilization} ort. utilization
            </Badge>
          </div>

          <div className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Overloaded</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{workloadSummary.overloadedMembers}</div>
              <div className="mt-1 text-xs text-slate-500">uyede kapasite baskisi var</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Watch</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{workloadSummary.watchMembers}</div>
              <div className="mt-1 text-xs text-slate-500">uyede yakin takip gerekiyor</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projected</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{workloadSummary.projectedHours}h</div>
              <div className="mt-1 text-xs text-slate-500">{workloadSummary.capacityHours}h haftalik kapasite</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Top load</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{workloadSummary.topLoad[0]?.name ?? "Veri yok"}</div>
              <div className="mt-1 text-xs text-slate-500">{workloadSummary.topLoad[0]?.activeTasks ?? 0} aktif task</div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-4">
            {workloadSummary.topLoad.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition hover:bg-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{member.role} • {member.projectedHours}/{member.weeklyCapacityHours}h</div>
                  </div>
                  <Badge variant={member.loadState === "overloaded" ? "danger" : member.loadState === "watch" ? "warning" : "success"}>
                    %{member.utilization}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
