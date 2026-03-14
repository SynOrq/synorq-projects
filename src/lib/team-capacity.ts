type WorkspaceRole = "ADMIN" | "MEMBER" | "VIEWER";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type CapacityMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: WorkspaceRole;
  isOwner?: boolean;
};

export type CapacityTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  completedAt: Date | null;
  assigneeId: string | null;
  estimatedH: number | null;
  loggedH: number | null;
  labels: string[];
  project: {
    id: string;
    name: string;
    color: string;
  };
};

export type CapacitySnapshot = CapacityMember & {
  weeklyCapacityHours: number;
  projectedHours: number;
  loggedHours: number;
  availableHours: number;
  utilization: number;
  activeTasks: number;
  overdueTasks: number;
  dueThisWeekTasks: number;
  blockedTasks: number;
  completedLast7Days: number;
  loadState: "balanced" | "watch" | "overloaded";
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    priority: Priority;
    projectName: string;
    projectColor: string;
  }>;
};

export type CapacityHeatmap = {
  days: Array<{
    key: string;
    label: string;
    fullLabel: string;
    date: Date;
  }>;
  rows: Array<{
    memberId: string;
    values: number[];
  }>;
};

const roleCapacity: Record<WorkspaceRole, number> = {
  ADMIN: 30,
  MEMBER: 34,
  VIEWER: 10,
};

const priorityEstimate: Record<Priority, number> = {
  LOW: 3,
  MEDIUM: 5,
  HIGH: 8,
  URGENT: 12,
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function isActive(status: TaskStatus) {
  return status !== "DONE" && status !== "CANCELLED";
}

function estimateTaskHours(task: CapacityTask) {
  return task.estimatedH ?? priorityEstimate[task.priority];
}

export function analyzeTeamCapacity(
  members: CapacityMember[],
  tasks: CapacityTask[],
  now = new Date()
) {
  const today = startOfDay(now);
  const weekBoundary = new Date(today);
  weekBoundary.setDate(weekBoundary.getDate() + 6);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const snapshots = members.map((member) => {
    const assignedTasks = tasks.filter((task) => task.assigneeId === member.id);
    const activeTasks = assignedTasks.filter((task) => isActive(task.status));
    const overdueTasks = activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) < today).length;
    const dueThisWeekTasks = activeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = startOfDay(new Date(task.dueDate));
      return dueDate >= today && dueDate <= weekBoundary;
    }).length;
    const blockedTasks = activeTasks.filter((task) => task.labels.includes("Blocked")).length;
    const projectedHours = Math.round(activeTasks.reduce((sum, task) => sum + estimateTaskHours(task), 0));
    const loggedHours = Math.round(activeTasks.reduce((sum, task) => sum + (task.loggedH ?? 0), 0));
    const weeklyCapacityHours = roleCapacity[member.role];
    const utilization = weeklyCapacityHours === 0 ? 0 : Math.round((projectedHours / weeklyCapacityHours) * 100);
    const availableHours = Math.max(0, weeklyCapacityHours - projectedHours);
    const completedLast7Days = assignedTasks.filter(
      (task) => task.completedAt && new Date(task.completedAt) >= lastWeek
    ).length;
    const loadState =
      utilization >= 90 || overdueTasks > 0 || blockedTasks >= 2
        ? "overloaded"
        : utilization >= 65 || dueThisWeekTasks >= 3 || blockedTasks > 0
          ? "watch"
          : "balanced";

    const upcomingTasks = [...activeTasks]
      .sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
      .slice(0, 3)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        projectName: task.project.name,
        projectColor: task.project.color,
      }));

    return {
      ...member,
      weeklyCapacityHours,
      projectedHours,
      loggedHours,
      availableHours,
      utilization,
      activeTasks: activeTasks.length,
      overdueTasks,
      dueThisWeekTasks,
      blockedTasks,
      completedLast7Days,
      loadState,
      upcomingTasks,
    } satisfies CapacitySnapshot;
  });

  const heatmap = buildTeamHeatmap(members, tasks, now);

  return {
    snapshots: snapshots.sort(
      (left, right) =>
        right.utilization - left.utilization ||
        right.overdueTasks - left.overdueTasks ||
        right.activeTasks - left.activeTasks
    ),
    heatmap,
    summary: {
      totalMembers: members.length,
      overloadedMembers: snapshots.filter((member) => member.loadState === "overloaded").length,
      watchMembers: snapshots.filter((member) => member.loadState === "watch").length,
      dueThisWeekTasks: snapshots.reduce((sum, member) => sum + member.dueThisWeekTasks, 0),
      blockedTasks: snapshots.reduce((sum, member) => sum + member.blockedTasks, 0),
      weeklyCapacityHours: snapshots.reduce((sum, member) => sum + member.weeklyCapacityHours, 0),
      projectedHours: snapshots.reduce((sum, member) => sum + member.projectedHours, 0),
    },
  };
}

export function buildTeamHeatmap(
  members: CapacityMember[],
  tasks: CapacityTask[],
  now = new Date()
): CapacityHeatmap {
  const start = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return {
      key: day.toISOString(),
      label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(day),
      fullLabel: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(day),
      date: day,
    };
  });

  const rows = members.map((member) => ({
    memberId: member.id,
    values: days.map((day) =>
      tasks.filter((task) => {
        if (task.assigneeId !== member.id || !task.dueDate || !isActive(task.status)) return false;
        const dueDate = startOfDay(new Date(task.dueDate));
        return dueDate.getTime() === day.date.getTime();
      }).length
    ),
  }));

  return { days, rows };
}
