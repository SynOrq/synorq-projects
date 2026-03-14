import type { AnalyzedProject, PortfolioTask, TeamLoadSignal } from "@/lib/portfolio";

type DashboardTask = PortfolioTask & {
  projectId: string;
  projectName: string;
  projectColor: string;
  projectDueDate: Date | null;
  health: {
    key: "good" | "steady" | "risk";
    label: string;
    score: number;
  };
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function buildWeeklyCompletionTrend(tasks: Array<Pick<DashboardTask, "completedAt">>, now = new Date()) {
  const today = startOfDay(now);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const count = tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= day && new Date(task.completedAt) < nextDay).length;

    return {
      key: day.toISOString(),
      label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(day),
      count,
    };
  });
}

export function buildUpcomingDeadlines(
  projects: AnalyzedProject[],
  tasks: DashboardTask[],
  now = new Date()
) {
  const today = startOfDay(now);
  const boundary = new Date(today);
  boundary.setDate(boundary.getDate() + 7);

  const projectItems = projects
    .filter((project) => project.dueDateResolved && project.dueDateResolved >= today && project.dueDateResolved <= boundary)
    .map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      type: "project" as const,
      dueDate: project.dueDateResolved as Date,
      detail: `${project.client?.name ?? "Internal"} • ${project.openTasks} acik task`,
      href: `/projects/${project.id}`,
      tone: project.health.key,
    }));

  const taskItems = tasks
    .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED" && task.dueDate && task.dueDate >= today && task.dueDate <= boundary)
    .sort((left, right) => new Date(left.dueDate as Date).getTime() - new Date(right.dueDate as Date).getTime())
    .slice(0, 4)
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      type: "task" as const,
      dueDate: task.dueDate as Date,
      detail: `${task.projectName} • ${task.priority ?? "MEDIUM"} priority`,
      href: `/projects/${task.projectId}`,
      tone: task.health.key,
    }));

  return [...projectItems, ...taskItems]
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
    .slice(0, 6);
}

export function buildRecentBlockers(projects: AnalyzedProject[], tasks: DashboardTask[]) {
  const blockedTasks = tasks
    .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED" && (task.labels ?? []).includes("Blocked"))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 4)
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: `${task.projectName} • ${(task.labels ?? []).join(", ")}`,
      href: `/projects/${task.projectId}`,
      severity: "critical" as const,
    }));

  const projectRisks = projects
    .filter((project) => project.criticalRisks > 0 || project.overdueTasks > 0)
    .sort((left, right) => right.criticalRisks - left.criticalRisks || right.overdueTasks - left.overdueTasks)
    .slice(0, 3)
    .map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      detail: `${project.criticalRisks} kritik risk • ${project.overdueTasks} overdue task`,
      href: `/projects/${project.id}`,
      severity: project.criticalRisks > 0 ? "critical" as const : "warning" as const,
    }));

  return [...blockedTasks, ...projectRisks].slice(0, 5);
}

export function buildClientRiskVisibility(projects: AnalyzedProject[]) {
  const grouped = new Map<
    string,
    {
      name: string;
      health: "STABLE" | "WATCH" | "AT_RISK";
      projects: number;
      riskProjects: number;
      openRisks: number;
      overdueTasks: number;
      lastActivityAt: Date;
    }
  >();

  for (const project of projects) {
    if (!project.client) continue;
    const current = grouped.get(project.client.id);
    if (!current) {
      grouped.set(project.client.id, {
        name: project.client.name,
        health: project.client.health,
        projects: 1,
        riskProjects: project.health.key === "risk" ? 1 : 0,
        openRisks: project.openRisks,
        overdueTasks: project.overdueTasks,
        lastActivityAt: project.lastActivityAt,
      });
      continue;
    }

    current.projects += 1;
    current.riskProjects += project.health.key === "risk" ? 1 : 0;
    current.openRisks += project.openRisks;
    current.overdueTasks += project.overdueTasks;
    if (project.lastActivityAt > current.lastActivityAt) current.lastActivityAt = project.lastActivityAt;
  }

  return [...grouped.values()]
    .sort((left, right) => right.riskProjects - left.riskProjects || right.openRisks - left.openRisks || right.overdueTasks - left.overdueTasks)
    .slice(0, 4);
}

export function buildQuickActions(params: {
  riskProjects: number;
  unassignedTasks: number;
  dueThisWeekProjects: number;
  overloadedMembers: number;
}) {
  return [
    {
      label: "Riskte projeler",
      detail: `${params.riskProjects} proje yakindan izleniyor`,
      href: "/projects?health=risk&view=table",
    },
    {
      label: "Atanmamis gorevler",
      detail: `${params.unassignedTasks} is sahip bekliyor`,
      href: "/projects?health=risk",
    },
    {
      label: "Bu hafta teslim",
      detail: `${params.dueThisWeekProjects} proje kapanis bandinda`,
      href: "/reports/share",
    },
    {
      label: "Team capacity",
      detail: `${params.overloadedMembers} uye kapasite baskisinda`,
      href: "/members",
    },
  ];
}

export function countOverloadedMembers(teamLoad: TeamLoadSignal[]) {
  return teamLoad.filter((member) => member.loadState === "overloaded").length;
}
