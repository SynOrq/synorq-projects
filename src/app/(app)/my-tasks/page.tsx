import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";
import { CheckSquare, ArrowRight } from "lucide-react";

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

  const activeTasks = tasks.filter((t: any) => t.status !== "DONE" && t.status !== "CANCELLED");
  const completedTasks = tasks.filter((t: any) => t.status === "DONE");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <CheckSquare className="text-blue-600" />
          Görevlerim
        </h1>
        <p className="text-gray-500 text-sm mt-1">Bana atanan tüm görevler</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Aktif Görevler ({activeTasks.length})</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {activeTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Harika! Aktif göreviniz yok.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeTasks.map((task: any) => {
                  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.bg}`}
                        style={{
                          background: task.priority === "URGENT" ? "#ef4444" : task.priority === "HIGH" ? "#f97316" : task.priority === "MEDIUM" ? "#3b82f6" : "#94a3b8"
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{task.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.project.color }} />
                          {task.project.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Tamamlananlar ({completedTasks.length})</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {completedTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Henüz tamamlanan görev yok.</div>
            ) : (
              <div className="divide-y divide-gray-100 opacity-75">
                {completedTasks.map((task: any) => {
                  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group grayscale hover:grayscale-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-600 line-through truncate">{task.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{task.project.name}</div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
