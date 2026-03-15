type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
type ProjectType = "WEBSITE" | "MOBILE_APP" | "RETAINER" | "INTERNAL" | "MAINTENANCE";
type ProjectVisibility = "WORKSPACE" | "MEMBERS" | "LEADERSHIP" | "PRIVATE";
type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
type RiskStatus = "OPEN" | "MITIGATING" | "WATCH" | "CLOSED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PortfolioTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  labels?: string[];
};

export type PortfolioProject = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  type: ProjectType;
  visibility: ProjectVisibility;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags: string[];
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  client: {
    id: string;
    name: string;
    health: "STABLE" | "WATCH" | "AT_RISK";
  } | null;
  tasks: PortfolioTask[];
  milestones?: Array<{
    id: string;
    title: string;
    status: MilestoneStatus;
    dueDate: Date | null;
    tasks?: Array<Pick<PortfolioTask, "id" | "status">>;
  }>;
  risks?: Array<{
    id: string;
    status: RiskStatus;
    impact: RiskLevel;
    likelihood: RiskLevel;
    dueDate: Date | null;
  }>;
};

export type PortfolioMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type HealthSignal = {
  key: "good" | "steady" | "risk";
  label: string;
  tone: string;
  score: number;
};

export type HealthFactor = {
  key: "baseline" | "overdue" | "ownership" | "deadline" | "completion" | "status";
  label: string;
  impact: number;
  note: string;
};

export type AnalyzedProject = PortfolioProject & {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  dueThisWeekTasks: number;
  unassignedTasks: number;
  completionRate: number;
  activeAssignees: number;
  health: HealthSignal;
  healthFactors: HealthFactor[];
  healthStrategy: "derived";
  dueDateResolved: Date | null;
  dueInDays: number | null;
  lastActivityAt: Date;
  openMilestones: number;
  completedMilestones: number;
  milestoneCompletionRate: number;
  nextMilestone: {
    id: string;
    title: string;
    status: MilestoneStatus;
    dueDate: Date | null;
  } | null;
  openRisks: number;
  criticalRisks: number;
};

export type TeamLoadSignal = PortfolioMember & {
  activeTasks: number;
  overdueTasks: number;
  dueThisWeekTasks: number;
  completedLast7Days: number;
  loadScore: number;
  loadState: "balanced" | "watch" | "overloaded";
};

const riskLevelWeight: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getCompletionRate(total: number, completed: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function resolveProjectDueDate(project: PortfolioProject) {
  const openTaskDueDates = project.tasks
    .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED" && task.dueDate)
    .map((task) => new Date(task.dueDate as Date).getTime())
    .sort((a, b) => a - b);

  if (project.dueDate) return new Date(project.dueDate);
  if (openTaskDueDates.length > 0) return new Date(openTaskDueDates[0]);
  return null;
}

export function getProjectHealth(params: {
  overdueTasks: number;
  dueInDays: number | null;
  completionRate: number;
  unassignedTasks: number;
  status: ProjectStatus;
}) {
  return deriveProjectHealth(params).signal;
}

export function deriveProjectHealth(params: {
  overdueTasks: number;
  dueInDays: number | null;
  completionRate: number;
  unassignedTasks: number;
  status: ProjectStatus;
}): {
  signal: HealthSignal;
  factors: HealthFactor[];
  strategy: "derived";
} {
  const factors: HealthFactor[] = [
    {
      key: "baseline",
      label: "Baseline",
      impact: 92,
      note: "Tum aktif projeler 92 taban skor ile baslar.",
    },
  ];

  if (params.status === "ON_HOLD") {
    return {
      signal: {
        key: "steady",
        label: "Beklemede",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        score: 62,
      } satisfies HealthSignal,
      factors: [
        ...factors,
        {
          key: "status",
          label: "Status override",
          impact: -30,
          note: "Beklemede durumundaki projeler izleme bandina cekilir.",
        },
      ],
      strategy: "derived" as const,
    };
  }

  let score = 92;
  if (params.overdueTasks > 0) {
    const impact = Math.min(46, params.overdueTasks * 12);
    score -= impact;
    factors.push({
      key: "overdue",
      label: "Overdue pressure",
      impact: -impact,
      note: `${params.overdueTasks} overdue task veya kritik risk health skorunu asagi cekiyor.`,
    });
  }
  if (params.unassignedTasks > 0) {
    const impact = Math.min(16, params.unassignedTasks * 4);
    score -= impact;
    factors.push({
      key: "ownership",
      label: "Ownership gap",
      impact: -impact,
      note: `${params.unassignedTasks} sahipsiz is teslim ritmini zayiflatiyor.`,
    });
  }
  if (params.dueInDays !== null && params.dueInDays <= 7) {
    score -= 8;
    factors.push({
      key: "deadline",
      label: "Deadline pressure",
      impact: -8,
      note: "Teslim tarihi 7 gun veya daha yakin oldugu icin baski artiyor.",
    });
  }
  if (params.completionRate < 35) {
    score -= 12;
    factors.push({
      key: "completion",
      label: "Low completion",
      impact: -12,
      note: `Tamamlanma orani %${params.completionRate} seviyesinde kaldigi icin skor dusuyor.`,
    });
  }
  if (params.status === "COMPLETED") {
    return {
      signal: {
        key: "good",
        label: "Tamamlandi",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        score: 100,
      } satisfies HealthSignal,
      factors: [
        ...factors,
        {
          key: "status",
          label: "Completion override",
          impact: 8,
          note: "Tamamlanan projeler dogrudan 100 health skoruna cekilir.",
        },
      ],
      strategy: "derived" as const,
    };
  }

  if (score <= 55) {
    return {
      signal: {
        key: "risk",
        label: "Riskli",
        tone: "border-red-200 bg-red-50 text-red-700",
        score: Math.max(18, score),
      } satisfies HealthSignal,
      factors,
      strategy: "derived" as const,
    };
  }

  if (score <= 78) {
    return {
      signal: {
        key: "steady",
        label: "İzleniyor",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        score,
      } satisfies HealthSignal,
      factors,
      strategy: "derived" as const,
    };
  }

  return {
    signal: {
      key: "good",
      label: "Sağlıklı",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      score,
    } satisfies HealthSignal,
    factors,
    strategy: "derived" as const,
  };
}

export function analyzeProjects(projects: PortfolioProject[], now = new Date()) {
  const today = startOfDay(now);
  const weekBoundary = new Date(today);
  weekBoundary.setDate(weekBoundary.getDate() + 7);

  return projects.map((project) => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
    const openTasks = project.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
    const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < today).length;
    const dueThisWeekTasks = openTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate <= weekBoundary;
    }).length;
    const unassignedTasks = openTasks.filter((task) => !task.assigneeId).length;
    const activeAssignees = new Set(openTasks.map((task) => task.assigneeId).filter(Boolean)).size;
    const completionRate = getCompletionRate(totalTasks, completedTasks);
    const milestones = project.milestones ?? [];
    const openMilestones = milestones.filter((milestone) => milestone.status !== "COMPLETED").length;
    const completedMilestones = milestones.filter((milestone) => milestone.status === "COMPLETED").length;
    const milestoneCompletionRate = getCompletionRate(milestones.length, completedMilestones);
    const nextMilestone = [...milestones]
      .sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
      .find((milestone) => milestone.status !== "COMPLETED") ?? null;
    const risks = project.risks ?? [];
    const openRisks = risks.filter((risk) => risk.status !== "CLOSED").length;
    const criticalRisks = risks.filter(
      (risk) =>
        risk.status !== "CLOSED" &&
        (risk.impact === "CRITICAL" ||
          risk.likelihood === "CRITICAL" ||
          riskLevelWeight[risk.impact] + riskLevelWeight[risk.likelihood] >= 6)
    ).length;
    const dueDateResolved = resolveProjectDueDate(project);
    const dueInDays =
      dueDateResolved === null
        ? null
        : Math.ceil((startOfDay(dueDateResolved).getTime() - today.getTime()) / 86400000);
    const lastActivityAt = project.tasks.reduce((latest, task) => {
      const updatedAt = new Date(task.updatedAt);
      return updatedAt > latest ? updatedAt : latest;
    }, new Date(project.updatedAt));

    const healthResult = deriveProjectHealth({
      overdueTasks: overdueTasks + criticalRisks,
      dueInDays,
      completionRate,
      unassignedTasks: unassignedTasks + openRisks,
      status: project.status,
    });

    return {
      ...project,
      totalTasks,
      completedTasks,
      openTasks: openTasks.length,
      overdueTasks,
      dueThisWeekTasks,
      unassignedTasks,
      completionRate,
      activeAssignees,
      health: healthResult.signal,
      healthFactors: healthResult.factors,
      healthStrategy: healthResult.strategy,
      dueDateResolved,
      dueInDays,
      lastActivityAt,
      openMilestones,
      completedMilestones,
      milestoneCompletionRate,
      nextMilestone,
      openRisks,
      criticalRisks,
    } satisfies AnalyzedProject;
  });
}

export function analyzeTeamLoad(
  members: PortfolioMember[],
  tasks: PortfolioTask[],
  now = new Date()
) {
  const today = startOfDay(now);
  const weekBoundary = new Date(today);
  weekBoundary.setDate(weekBoundary.getDate() + 7);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  return members
    .map((member) => {
      const memberTasks = tasks.filter((task) => task.assigneeId === member.id);
      const activeTasks = memberTasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
      const overdueTasks = activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) < today).length;
      const dueThisWeekTasks = activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= weekBoundary;
      }).length;
      const completedLast7Days = memberTasks.filter(
        (task) => task.completedAt && new Date(task.completedAt) >= lastWeek
      ).length;
      const loadScore = activeTasks.length * 10 + overdueTasks * 14 + dueThisWeekTasks * 7;
      const loadState = loadScore >= 54 ? "overloaded" : loadScore >= 30 ? "watch" : "balanced";

      return {
        ...member,
        activeTasks: activeTasks.length,
        overdueTasks,
        dueThisWeekTasks,
        completedLast7Days,
        loadScore,
        loadState,
      } satisfies TeamLoadSignal;
    })
    .sort((left, right) => right.loadScore - left.loadScore || right.activeTasks - left.activeTasks);
}

export function getWorkloadImbalanceScore(teamLoad: TeamLoadSignal[]) {
  if (teamLoad.length <= 1) return 0;

  const values = teamLoad.map((item) => item.activeTasks);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === 0) return 0;

  return Math.min(100, Math.round(((max - min) / max) * 100));
}
