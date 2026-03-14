type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

export type WorkspaceTimelineMilestone = {
  id: string;
  title: string;
  status: MilestoneStatus;
  dueDate: Date | null;
  projectId: string;
  projectName: string;
  projectColor: string;
  ownerName: string;
  taskCount: number;
  completedTaskCount: number;
};

export type WorkspaceTimelineTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  labels: string[];
  projectId: string;
  projectName: string;
  projectColor: string;
  assigneeName: string;
};

export type WorkspaceTimelineEntry = {
  id: string;
  kind: "milestone" | "task";
  title: string;
  status: string;
  dueDate: Date;
  href: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  ownerName: string;
  meta: string;
  tone: "good" | "watch" | "risk";
  progress: number | null;
  isOverdue: boolean;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function isTaskClosed(status: TaskStatus) {
  return status === "DONE" || status === "CANCELLED";
}

function milestoneTone(status: MilestoneStatus): WorkspaceTimelineEntry["tone"] {
  if (status === "AT_RISK") return "risk";
  if (status === "IN_PROGRESS") return "watch";
  return "good";
}

function taskTone(task: WorkspaceTimelineTask): WorkspaceTimelineEntry["tone"] {
  if (task.labels.includes("Blocked") || task.priority === "URGENT") return "risk";
  if (task.status === "IN_REVIEW" || task.priority === "HIGH") return "watch";
  return "good";
}

export function buildWorkspaceTimeline(
  milestones: WorkspaceTimelineMilestone[],
  tasks: WorkspaceTimelineTask[],
  now = new Date()
) {
  const today = startOfDay(now);
  const thisWeekBoundary = new Date(today);
  thisWeekBoundary.setDate(thisWeekBoundary.getDate() + 7);

  const milestoneEntries: WorkspaceTimelineEntry[] = milestones
    .filter((item) => item.dueDate)
    .map((item) => {
      const dueDate = new Date(item.dueDate as Date);
      const progress =
        item.taskCount === 0
          ? item.status === "COMPLETED"
            ? 100
            : 0
          : Math.round((item.completedTaskCount / item.taskCount) * 100);

      return {
        id: `milestone-${item.id}`,
        kind: "milestone",
        title: item.title,
        status: item.status,
        dueDate,
        href: `/projects/${item.projectId}?tab=timeline`,
        projectId: item.projectId,
        projectName: item.projectName,
        projectColor: item.projectColor,
        ownerName: item.ownerName,
        meta: `${item.completedTaskCount}/${item.taskCount} linked task`,
        tone: milestoneTone(item.status),
        progress,
        isOverdue: dueDate < today && item.status !== "COMPLETED",
      };
    });

  const taskEntries: WorkspaceTimelineEntry[] = tasks
    .filter((item) => item.dueDate && !isTaskClosed(item.status))
    .map((item) => {
      const dueDate = new Date(item.dueDate as Date);
      return {
        id: `task-${item.id}`,
        kind: "task",
        title: item.title,
        status: item.status,
        dueDate,
        href: `/projects/${item.projectId}`,
        projectId: item.projectId,
        projectName: item.projectName,
        projectColor: item.projectColor,
        ownerName: item.assigneeName,
        meta: `${item.priority} priority${item.labels.length > 0 ? ` • ${item.labels.join(", ")}` : ""}`,
        tone: taskTone(item),
        progress: null,
        isOverdue: dueDate < today,
      };
    });

  const entries = [...milestoneEntries, ...taskEntries].sort(
    (left, right) => left.dueDate.getTime() - right.dueDate.getTime()
  );

  const grouped = {
    overdue: entries.filter((item) => item.isOverdue),
    thisWeek: entries.filter((item) => item.dueDate >= today && item.dueDate <= thisWeekBoundary),
    later: entries.filter((item) => item.dueDate > thisWeekBoundary),
  };

  const busiestDays = new Map<string, number>();
  for (const entry of entries) {
    const key = startOfDay(entry.dueDate).toISOString();
    busiestDays.set(key, (busiestDays.get(key) ?? 0) + 1);
  }

  const busiestDay = [...busiestDays.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];

  return {
    summary: {
      overdueCount: grouped.overdue.length,
      dueThisWeekCount: grouped.thisWeek.length,
      completedMilestones: milestones.filter((item) => item.status === "COMPLETED").length,
      milestoneCompletionRate:
        milestones.length === 0
          ? 0
          : Math.round((milestones.filter((item) => item.status === "COMPLETED").length / milestones.length) * 100),
      scheduledTasks: taskEntries.length,
      scheduledMilestones: milestoneEntries.length,
    },
    buckets: grouped,
    featuredMilestones: milestoneEntries.slice(0, 6),
    busiestDay:
      busiestDay === undefined
        ? null
        : {
            date: new Date(busiestDay[0]),
            count: busiestDay[1],
          },
  };
}
