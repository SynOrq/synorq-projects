import type { AnalyzedProject, PortfolioTask, TeamLoadSignal } from "@/lib/portfolio";

type DashboardTask = PortfolioTask & {
  projectId: string;
  projectName: string;
  projectColor: string;
  projectDueDate: Date | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
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

export function buildWeeklyCompletionTrend(
  tasks: Array<Pick<DashboardTask, "completedAt" | "createdAt">>,
  now = new Date()
) {
  const today = startOfDay(now);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const completedCount = tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= day && new Date(task.completedAt) < nextDay).length;
    const createdCount = tasks.filter((task) => task.createdAt && new Date(task.createdAt) >= day && new Date(task.createdAt) < nextDay).length;

    return {
      key: day.toISOString(),
      label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(day),
      completedCount,
      createdCount,
      netFlow: completedCount - createdCount,
    };
  });
}

function getRelativeDueLabel(date: Date, now: Date) {
  const today = startOfDay(now).getTime();
  const due = startOfDay(date).getTime();
  const diff = Math.round((due - today) / 86400000);

  if (diff < 0) return `${Math.abs(diff)} gun gecikti`;
  if (diff === 0) return "bugun";
  if (diff === 1) return "1 gun kaldi";
  if (diff <= 7) return `${diff} gun kaldi`;
  return "bu hafta";
}

function getDeadlineStatus(params: {
  dueDate: Date;
  now: Date;
  blocked?: boolean;
  healthKey?: "good" | "steady" | "risk";
}) {
  const today = startOfDay(params.now);
  const due = startOfDay(params.dueDate);

  if (params.blocked) {
    return {
      label: "Blocked",
      tone: "critical" as const,
    };
  }
  if (due < today) {
    return {
      label: "Overdue",
      tone: "critical" as const,
    };
  }
  if (due.getTime() === today.getTime()) {
    return {
      label: "Due today",
      tone: "warning" as const,
    };
  }
  if (params.healthKey === "risk") {
    return {
      label: "At risk",
      tone: "warning" as const,
    };
  }
  return {
    label: "On track",
    tone: "stable" as const,
  };
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
    .map((project) => {
      const status = getDeadlineStatus({
        dueDate: project.dueDateResolved as Date,
        now,
        healthKey: project.health.key,
      });

      return {
        id: `project-${project.id}`,
        title: project.name,
        type: "project" as const,
        dueDate: project.dueDateResolved as Date,
        detail: `${project.client?.name ?? "Internal"} • ${project.openTasks} acik task • ${project.criticalRisks} kritik risk`,
        href: `/projects/${project.id}`,
        tone: project.health.key,
        statusLabel: status.label,
        statusTone: status.tone,
        ownerName: project.owner?.name ?? project.owner?.email ?? "Owner yok",
        lastUpdateLabel: project.lastActivityAt,
        relativeDueLabel: getRelativeDueLabel(project.dueDateResolved as Date, now),
      };
    });

  const taskItems = tasks
    .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED" && task.dueDate && task.dueDate >= today && task.dueDate <= boundary)
    .sort((left, right) => new Date(left.dueDate as Date).getTime() - new Date(right.dueDate as Date).getTime())
    .slice(0, 4)
    .map((task) => {
      const status = getDeadlineStatus({
        dueDate: task.dueDate as Date,
        now,
        blocked: (task.labels ?? []).includes("Blocked"),
        healthKey: task.health.key,
      });

      return {
        id: `task-${task.id}`,
        title: task.title,
        type: "task" as const,
        dueDate: task.dueDate as Date,
        detail: `${task.projectName} • ${task.priority ?? "MEDIUM"} priority`,
        href: `/projects/${task.projectId}`,
        tone: task.health.key,
        statusLabel: status.label,
        statusTone: status.tone,
        ownerName: task.assignee?.name ?? task.assignee?.email ?? "Atanmamis",
        lastUpdateLabel: task.updatedAt,
        relativeDueLabel: getRelativeDueLabel(task.dueDate as Date, now),
      };
    });

  return [...projectItems, ...taskItems]
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
    .slice(0, 6);
}

export function buildRecentBlockers(projects: AnalyzedProject[], tasks: DashboardTask[], now = new Date()) {
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
      ownerName: task.assignee?.name ?? task.assignee?.email ?? "Atanmamis",
      ageDays: Math.max(0, Math.round((now.getTime() - task.updatedAt.getTime()) / 86400000)),
      nextStep: "Owner checkpoint ac ve blocker nedenini netlestir.",
      releaseImpact: Boolean(task.projectDueDate),
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
      ownerName: project.owner?.name ?? project.owner?.email ?? "Owner yok",
      ageDays: Math.max(0, Math.round((now.getTime() - project.lastActivityAt.getTime()) / 86400000)),
      nextStep: project.criticalRisks > 0 ? "Risk detayi ve mitigation sahipligini ac." : "Delivery planini yeniden sirala.",
      releaseImpact: project.dueInDays !== null && project.dueInDays <= 7,
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
      riskScore: number;
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
        riskScore: (project.health.key === "risk" ? 3 : 1) + project.openRisks * 2 + project.overdueTasks * 2,
        lastActivityAt: project.lastActivityAt,
      });
      continue;
    }

    current.projects += 1;
    current.riskProjects += project.health.key === "risk" ? 1 : 0;
    current.openRisks += project.openRisks;
    current.overdueTasks += project.overdueTasks;
    current.riskScore += (project.health.key === "risk" ? 3 : 1) + project.openRisks * 2 + project.overdueTasks * 2;
    if (project.lastActivityAt > current.lastActivityAt) current.lastActivityAt = project.lastActivityAt;
  }

  return [...grouped.values()]
    .sort((left, right) => right.riskScore - left.riskScore || right.openRisks - left.openRisks || right.overdueTasks - left.overdueTasks)
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
