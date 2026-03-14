import Link from "next/link";
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, FolderKanban, History, ShieldAlert, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";
import KanbanBoard from "@/components/projects/KanbanBoard";
import type { TaskCardData } from "@/lib/task-detail";

type Member = {
  id: string;
  name: string | null;
  image: string | null;
  email: string;
};

type SectionWithTasks = {
  id: string;
  name: string;
  projectId: string;
  color: string | null;
  order: number;
  createdAt: Date;
  tasks: TaskCardData[];
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  severity: "info" | "warning" | "critical";
  actorName: string;
};

type RiskItem = {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "critical";
  recommendation: string;
  status: string;
  ownerName: string;
  dueDate: Date | null;
  taskTitle: string | null;
  impact: string;
  likelihood: string;
};

type MilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
  dueDate: Date | null;
  ownerName: string;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
};

type TeamLoadItem = {
  id: string;
  name: string;
  role: string;
  activeTasks: number;
  overdueTasks: number;
  dueThisWeekTasks: number;
  loadState: "balanced" | "watch" | "overloaded";
};

type Props = {
  currentTab: "overview" | "board" | "list" | "timeline" | "activity" | "risks";
  project: {
    id: string;
    name: string;
    startDate: Date | null;
    dueDate: Date | null;
  };
  sections: SectionWithTasks[];
  members: Member[];
  tasks: TaskCardData[];
  health: {
    score: number;
    label: string;
    key: "good" | "steady" | "risk";
  };
  metrics: {
    openTasks: number;
    completedTasks: number;
    overdueTasks: number;
    dueThisWeekTasks: number;
    unassignedTasks: number;
    completionRate: number;
  };
  milestones: MilestoneItem[];
  teamLoad: TeamLoadItem[];
  activity: ActivityItem[];
  risks: RiskItem[];
};

function severityBadge(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "secondary" as const;
}

function milestoneBadge(status: MilestoneItem["status"]) {
  if (status === "AT_RISK") return "danger" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "COMPLETED") return "success" as const;
  return "secondary" as const;
}

export default function ProjectDetailConsole({
  currentTab,
  project,
  sections,
  members,
  tasks,
  health,
  metrics,
  milestones,
  teamLoad,
  activity,
  risks,
}: Props) {
  const blockers = tasks.filter((task) => task.labels.includes("Blocked") || (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"));
  const recentDone = tasks.filter((task) => task.status === "DONE").slice(0, 4);

  if (currentTab === "board") {
    return (
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard project={{ id: project.id }} sections={sections} members={members} />
      </div>
    );
  }

  if (currentTab === "list") {
    return (
      <div className="p-6">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-5 py-4">Task</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Assignee</th>
                  <th className="px-5 py-4">Due date</th>
                  <th className="px-5 py-4">Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="text-sm font-black text-slate-950">{task.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {task.labels.slice(0, 3).map((label) => (
                          <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1">{label}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].color}`}>
                        {STATUS_CONFIG[task.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].color}`}>
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {task.assignee?.name ?? "Atanmamis"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {task.dueDate ? formatDate(task.dueDate) : "Plansiz"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {task._count.comments} yorum • {task._count.subTasks} alt gorev
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (currentTab === "timeline") {
    return (
      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <CalendarRange size={18} className="text-indigo-600" />
              Milestone timeline
            </div>
            <div className="mt-5 space-y-4">
              {milestones.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Bu proje icin milestone tanimi bulunmuyor.
                </div>
              )}
              {milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-950">{milestone.title}</div>
                        <Badge variant={milestoneBadge(milestone.status)}>{milestone.status}</Badge>
                      </div>
                      {milestone.description && (
                        <div className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {milestone.dueDate ? formatDate(milestone.dueDate) : "Plansiz"}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xs text-slate-400">Owner</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{milestone.ownerName}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xs text-slate-400">Linked tasks</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {milestone.completedTaskCount} / {milestone.taskCount}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <div className="text-xs text-slate-400">Progress</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">%{milestone.progress}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Milestone progress</span>
                      <span>%{milestone.progress}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${milestone.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Timeline context</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Project start</div>
                <div className="mt-2 text-lg font-black text-slate-950">{project.startDate ? formatDate(project.startDate) : "Plansiz"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Target due</div>
                <div className="mt-2 text-lg font-black text-slate-950">{project.dueDate ? formatDate(project.dueDate) : "Plansiz"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Open milestones</div>
                <div className="mt-2 text-lg font-black text-slate-950">{milestones.filter((item) => item.status !== "COMPLETED").length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Critical risks</div>
                <div className="mt-2 text-lg font-black text-slate-950">{risks.filter((item) => item.severity === "critical").length}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-black text-slate-950">Upcoming delivery items</div>
              <div className="mt-3 space-y-3">
                {tasks
                  .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
                  .slice(0, 5)
                  .map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-sm font-semibold text-slate-950">{task.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">{task.assignee?.name ?? "Atanmamis"}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{task.dueDate ? formatDate(task.dueDate) : "Plansiz"}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{STATUS_CONFIG[task.status].label}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (currentTab === "activity") {
    return (
      <div className="p-6">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <History size={18} className="text-indigo-600" />
            Project activity trace
          </div>
          <div className="mt-5 space-y-3">
            {activity.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Bu proje icin activity kaydi bulunmuyor.
              </div>
            )}
            {activity.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      <Badge variant={severityBadge(item.severity)}>{item.severity}</Badge>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
                    <div className="mt-3 text-xs text-slate-500">{item.actorName}</div>
                  </div>
                  <div className="text-xs text-slate-500">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentTab === "risks") {
    return (
      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <ShieldAlert size={18} className="text-red-500" />
              Risk register
            </div>
            <div className="mt-5 space-y-3">
              {risks.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Bu proje icin kritik risk sinyali algilanmadi.
                </div>
              )}
              {risks.map((risk) => (
                <div key={risk.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{risk.title}</div>
                    <Badge variant={risk.severity === "critical" ? "danger" : "warning"}>{risk.severity}</Badge>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{risk.detail}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{risk.status}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">Impact {risk.impact}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">Likelihood {risk.likelihood}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{risk.ownerName}</span>
                    {risk.taskTitle && <span className="rounded-full bg-white px-2.5 py-1">{risk.taskTitle}</span>}
                    {risk.dueDate && <span className="rounded-full bg-white px-2.5 py-1">{formatDate(risk.dueDate)}</span>}
                  </div>
                  <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">{risk.recommendation}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Risk indicators</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Overdue</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{metrics.overdueTasks}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Ownership gap</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{metrics.unassignedTasks}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Due this week</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{metrics.dueThisWeekTasks}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Blocked</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{blockers.length}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-2xl bg-indigo-50 p-2 text-indigo-700">
            <FolderKanban size={18} />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">{health.score}</div>
          <div className="mt-1 text-sm text-slate-500">Health score</div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-2xl bg-amber-50 p-2 text-amber-700">
            <CalendarRange size={18} />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">{metrics.dueThisWeekTasks}</div>
          <div className="mt-1 text-sm text-slate-500">Bu hafta teslim</div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-2xl bg-red-50 p-2 text-red-700">
            <AlertTriangle size={18} />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">{metrics.overdueTasks}</div>
          <div className="mt-1 text-sm text-slate-500">Geciken is</div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-2xl bg-emerald-50 p-2 text-emerald-700">
            <CheckCircle2 size={18} />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-950">%{metrics.completionRate}</div>
          <div className="mt-1 text-sm text-slate-500">Tamamlanma</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery Pulse</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Project overview</h2>
            </div>
            <Badge variant={health.key === "risk" ? "danger" : health.key === "steady" ? "warning" : "success"}>
              {health.label}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs text-slate-400">Timeline status</div>
              <div className="mt-2 text-lg font-black text-slate-950">
                {project.dueDate ? formatDate(project.dueDate) : "Plansiz"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {metrics.dueThisWeekTasks > 0 ? "Bu hafta teslim baskisi var." : "Takvim ritmi kontrollu gorunuyor."}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs text-slate-400">Work completion trend</div>
              <div className="mt-2 text-lg font-black text-slate-950">
                {metrics.completedTasks} / {tasks.length}
              </div>
              <div className="mt-1 text-sm text-slate-500">Tamamlanan is sayisi toplam backlog icinde.</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs text-slate-400">Ownership gap</div>
              <div className="mt-2 text-lg font-black text-slate-950">{metrics.unassignedTasks}</div>
              <div className="mt-1 text-sm text-slate-500">Atanmamis isler proje ritmini yavaslatir.</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs text-slate-400">Recent blockers</div>
              <div className="mt-2 text-lg font-black text-slate-950">{blockers.length}</div>
              <div className="mt-1 text-sm text-slate-500">Blocked etiketli veya gecikmis gorevler.</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Progress</span>
              <span>%{metrics.completionRate}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${metrics.completionRate}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Clock3 size={18} className="text-amber-600" />
            Upcoming and blockers
          </div>
          <div className="mt-5 space-y-3">
            {tasks
              .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
              .sort((left, right) => {
                const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                return leftTime - rightTime;
              })
              .slice(0, 5)
              .map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-black text-slate-950">{task.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{task.assignee?.name ?? "Atanmamis"}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{task.dueDate ? formatDate(task.dueDate) : "Plansiz"}</span>
                    {task.labels.includes("Blocked") && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Blocked</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <UsersRound size={18} className="text-indigo-600" />
            Team capacity
          </div>
          <div className="mt-5 space-y-3">
            {teamLoad.map((member) => (
              <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{member.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{member.role}</div>
                  </div>
                  <Badge variant={member.loadState === "overloaded" ? "danger" : member.loadState === "watch" ? "warning" : "success"}>
                    {member.loadState}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                  <div><div>Aktif</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.activeTasks}</div></div>
                  <div><div>Overdue</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.overdueTasks}</div></div>
                  <div><div>Bu hafta</div><div className="mt-1 text-sm font-semibold text-slate-900">{member.dueThisWeekTasks}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <History size={18} className="text-slate-700" />
              Recent activity
            </div>
            <Link href={`/projects/${project.id}?tab=activity`} className="text-sm font-semibold text-indigo-600 hover:underline">
              Tum activity
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {activity.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-black text-slate-950">{item.title}</div>
                  <Badge variant={severityBadge(item.severity)}>{item.severity}</Badge>
                </div>
                <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
                <div className="mt-2 text-xs text-slate-500">{item.meta}</div>
              </div>
            ))}
            {recentDone.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-black text-slate-950">Recently completed</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentDone.map((task) => (
                    <span key={task.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {task.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
