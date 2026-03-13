import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  FolderKanban,
  PauseCircle,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";

const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "danger" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  ON_HOLD: { label: "Beklemede", variant: "warning" },
  COMPLETED: { label: "Tamamlandı", variant: "secondary" },
  ARCHIVED: { label: "Arşiv", variant: "secondary" },
};

type ProjectsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    health?: string;
  }>;
};

function getProjectHealth(overdueTasks: number, completionRate: number) {
  if (overdueTasks > 0) {
    return { key: "risk", label: "Riskli", tone: "bg-red-50 text-red-700 border-red-200" };
  }

  if (completionRate >= 75) {
    return { key: "good", label: "Sağlıklı", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }

  return { key: "steady", label: "İzleniyor", tone: "bg-amber-50 text-amber-700 border-amber-200" };
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const filters = await searchParams;
  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
  });

  if (!workspace) redirect("/auth/login");

  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: { select: { tasks: true, sections: true } },
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const query = filters?.q?.trim().toLowerCase() ?? "";
  const selectedStatus = filters?.status?.toUpperCase() ?? "ALL";
  const selectedHealth = filters?.health?.toLowerCase() ?? "all";
  const today = new Date();

  const analyzedProjects = projects.map((project) => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
    const overdueTasks = project.tasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < today && task.status !== "DONE"
    ).length;
    const openTasks = totalTasks - completedTasks;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const health = getProjectHealth(overdueTasks, completionRate);

    return {
      ...project,
      completedTasks,
      overdueTasks,
      openTasks,
      completionRate,
      health,
    };
  });

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
  const overdueTasksTotal = analyzedProjects.reduce((sum, project) => sum + project.overdueTasks, 0);
  const averageCompletion =
    totalProjects === 0
      ? 0
      : Math.round(analyzedProjects.reduce((sum, project) => sum + project.completionRate, 0) / totalProjects);

  const statusOptions = [
    { value: "ALL", label: "Tüm durumlar" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "ON_HOLD", label: "Beklemede" },
    { value: "COMPLETED", label: "Tamamlandı" },
    { value: "ARCHIVED", label: "Arşiv" },
  ];

  const mostDelayedProject = [...filteredProjects].sort((a, b) => b.overdueTasks - a.overdueTasks)[0];
  const fastestProject = [...filteredProjects].sort((a, b) => b.completionRate - a.completionRate)[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <TrendingUp size={13} />
            Project Radar
          </div>
          <h1 className="mt-3 text-3xl font-black text-gray-900">Projeler</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredProjects.length} sonuç • workspace portföyünüzü filtreleyin ve teslim risklerini görün.
          </p>
        </div>

        <Button asChild>
          <Link href="/projects/new">
            <Plus size={16} />
            Yeni Proje
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <FolderKanban size={16} className="text-indigo-600" />
            Toplam Proje
          </div>
          <div className="mt-4 text-3xl font-black text-gray-900">{totalProjects}</div>
          <div className="mt-1 text-xs text-gray-400">{activeProjects} aktif, {pausedProjects} beklemede</div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <AlertTriangle size={16} className="text-red-500" />
            Geciken Görev
          </div>
          <div className="mt-4 text-3xl font-black text-gray-900">{overdueTasksTotal}</div>
          <div className="mt-1 text-xs text-gray-400">Teslim tarihi geçmiş açık iş sayısı</div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Ortalama İlerleme
          </div>
          <div className="mt-4 text-3xl font-black text-gray-900">%{averageCompletion}</div>
          <div className="mt-1 text-xs text-gray-400">Tüm projelerde ortalama tamamlanma oranı</div>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <PauseCircle size={16} className="text-amber-600" />
            Bekleyen Proje
          </div>
          <div className="mt-4 text-3xl font-black text-gray-900">{pausedProjects}</div>
          <div className="mt-1 text-xs text-gray-400">Yeniden planlama isteyen proje sayısı</div>
        </div>
      </div>

      <form className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Arama
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2.5">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={filters?.q ?? ""}
                placeholder="Proje adı veya açıklama ara"
                className="w-full border-none bg-transparent text-sm text-gray-700 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Durum
            </label>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="h-11 w-full rounded-2xl border border-gray-200 px-3 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Sağlık
            </label>
            <select
              name="health"
              defaultValue={selectedHealth}
              className="h-11 w-full rounded-2xl border border-gray-200 px-3 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tüm seviyeler</option>
              <option value="good">Sağlıklı</option>
              <option value="steady">İzleniyor</option>
              <option value="risk">Riskli</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 lg:flex-none">
              <Filter size={15} />
              Uygula
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/projects">Sıfırla</Link>
            </Button>
          </div>
        </div>
      </form>

      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
          <div className="mb-4 inline-flex rounded-2xl bg-indigo-50 p-4">
            <FolderKanban size={28} className="text-indigo-600" />
          </div>
          <h3 className="mb-2 font-bold text-gray-900">Henüz proje yok</h3>
          <p className="mb-6 text-sm text-gray-500">İlk projenizi oluşturarak başlayın.</p>
          <Button asChild>
            <Link href="/projects/new">
              <Plus size={16} />
              Proje Oluştur
            </Link>
          </Button>
        </div>
      )}

      {projects.length > 0 && filteredProjects.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Seçili filtrelerle eşleşen proje bulunamadı.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredProjects.map((project) => {
          const st = statusLabel[project.status] ?? statusLabel.ACTIVE;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-[28px] border border-gray-100 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
            >
              <div className="mb-5 h-1.5 w-full rounded-full" style={{ background: project.color }} />

              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-black text-gray-900">{project.name}</h3>
                  {project.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{project.description}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${project.health.tone}`}>
                    {project.health.label}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-gray-400">Görev</div>
                  <div className="mt-1 text-lg font-black text-gray-900">{project._count.tasks}</div>
                  <div className="text-xs text-gray-500">{project.openTasks} açık iş</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-gray-400">İlerleme</div>
                  <div className="mt-1 text-lg font-black text-gray-900">%{project.completionRate}</div>
                  <div className="text-xs text-gray-500">{project.completedTasks} tamamlandı</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-gray-400">Gecikme</div>
                  <div className="mt-1 text-lg font-black text-gray-900">{project.overdueTasks}</div>
                  <div className="text-xs text-gray-500">riskli görev</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                  <span>Tamamlanma çubuğu</span>
                  <span>%{project.completionRate}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    style={{ width: `${project.completionRate}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400">
                <span>Oluşturulma: {formatDate(project.createdAt)}</span>
                <span className="flex items-center gap-1 font-semibold text-indigo-600 transition-colors group-hover:text-indigo-500">
                  Detayı aç <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredProjects.length > 0 && (
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Portföy Özeti</h2>
              <p className="mt-1 text-sm text-gray-500">
                Filtrelenen proje setinin durum dağılımı ve öncelikli aksiyon özeti.
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
                      <div className="mb-2 flex items-center justify-between text-sm font-medium text-gray-600">
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
                <div className="mt-3 text-base font-black text-red-900">{mostDelayedProject?.name ?? "Gecikme yok"}</div>
                <div className="mt-2 text-sm text-red-700">{mostDelayedProject?.overdueTasks ?? 0} geciken görev</div>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">En iyi hız</div>
                <div className="mt-3 text-base font-black text-emerald-900">{fastestProject?.name ?? "Veri yok"}</div>
                <div className="mt-2 text-sm text-emerald-700">%{fastestProject?.completionRate ?? 0} tamamlanma</div>
              </div>
              <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">İnceleme notu</div>
                <div className="mt-3 text-base font-black text-sky-900">
                  {filteredProjects.filter((project) => project.health.key === "steady").length} proje yakından izleniyor
                </div>
                <div className="mt-2 text-sm text-sky-700">
                  Durum ve teslim tarihlerini güncellemek faydalı olacaktır.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
