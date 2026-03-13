import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatRelative } from "@/lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckSquare, Clock, TrendingUp, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: { _count: { select: { projects: true, members: true } } },
  });

  if (!workspace) redirect("/auth/login");

  const [projects, myTasks, recentTasks] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: { _count: { select: { tasks: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.task.count({
      where: {
        project: { workspaceId: workspace.id },
        assigneeId: session.user.id,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
    }),
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        assigneeId: session.user.id,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: { project: { select: { name: true, color: true } }, assignee: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const stats = [
    { icon: FolderKanban, label: "Aktif Proje",   value: workspace._count.projects, color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: CheckSquare,  label: "Görevlerim",     value: myTasks,                   color: "text-blue-600",   bg: "bg-blue-50" },
    { icon: Clock,        label: "Bu Hafta",        value: 0,                         color: "text-orange-600", bg: "bg-orange-50" },
    { icon: TrendingUp,   label: "Ekip Üyesi",     value: workspace._count.members,  color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const firstName = session.user?.name?.split(" ")[0] ?? "Kullanıcı";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Merhaba, {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">{workspace.name} • Dashboard</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus size={16} /> Yeni Proje
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`inline-flex p-2 rounded-xl ${stat.bg} mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <div className="text-2xl font-black text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Projeler</h2>
            <Link href="/projects" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              Tümü <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {projects.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">Henüz proje yok</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/projects/new"><Plus size={14} /> Proje Oluştur</Link>
                </Button>
              </div>
            )}
            {projects.map((p: typeof projects[number]) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                <span className="text-xs text-gray-400">{p._count.tasks} görev</span>
                <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* My tasks */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Görevlerim</h2>
            <Link href="/my-tasks" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              Tümü <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Atanmış görev yok</p>
            )}
            {recentTasks.map((task: typeof recentTasks[number]) => {
              const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
              const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
              return (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pc.bg} ${pc.color}`}
                    style={{ background: task.priority === "URGENT" ? "#ef4444" : task.priority === "HIGH" ? "#f97316" : task.priority === "MEDIUM" ? "#3b82f6" : "#94a3b8" }}
                  />
                  <span className="flex-1 text-sm text-gray-800 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}
                    >
                      {sc.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{task.project.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
