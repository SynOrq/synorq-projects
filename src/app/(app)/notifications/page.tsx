import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BellRing, FolderKanban, TriangleAlert } from "lucide-react";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  });

  if (!workspace) redirect("/auth/login");

  const now = new Date();
  const [overdueTasks, activity] = await Promise.all([
    db.task.findMany({
      where: {
        project: { workspaceId: workspace.id },
        dueDate: { not: null },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 12,
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const overdueItems = overdueTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          <BellRing size={13} />
          Notifications Center
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Alerts, activity ve operasyon sinyalleri</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {workspace.name} icin teslim riski ve ekip hareketleri ayni sayfada toplanir. Bu merkez, dashboard ozetinin tam akisa acilan halidir.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <TriangleAlert size={18} className="text-red-500" />
            Teslim Riski
          </div>
          <p className="mt-2 text-sm text-slate-600">Geciken veya kritik tarihe yakin acik isleri once burada gorun.</p>

          <div className="mt-6 space-y-3">
            {overdueItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Su anda geciken acik gorev yok.
              </div>
            )}

            {overdueItems.map((task) => (
              <Link key={task.id} href={`/projects/${task.project.id}`} className="block rounded-[24px] border border-red-100 bg-red-50 px-4 py-4 transition hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-950">{task.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {task.project.name}
                      {task.assignee ? ` • ${task.assignee.name ?? task.assignee.email}` : ""}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                    {formatRelative(task.dueDate as Date)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <FolderKanban size={18} className="text-indigo-600" />
            Activity Stream
          </div>
          <p className="mt-2 text-sm text-slate-600">Son ekip hareketleri ve proje akisi tek bir sirali feed icinde gorunur.</p>

          <div className="mt-6 space-y-3">
            {activity.map((item) => (
              <Link
                key={item.id}
                href={item.project?.id ? `/projects/${item.project.id}` : "/dashboard"}
                className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-950">{item.project?.name ?? "Workspace aktivitesi"}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.user.name ?? item.user.email} • {item.action}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500" title={formatDateTime(item.createdAt)}>
                    {formatRelative(item.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
