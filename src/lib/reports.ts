import type { AnalyzedProject } from "@/lib/portfolio";
import type { CapacitySnapshot } from "@/lib/team-capacity";

type ActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function buildExecutiveReport(
  projects: AnalyzedProject[],
  team: CapacitySnapshot[],
  activity: ActivityItem[],
  now = new Date()
) {
  const today = startOfDay(now);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const completedLast7Days = projects.reduce(
    (sum, project) =>
      sum +
      project.tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= lastWeek).length,
    0
  );

  const deliveriesThisWeek = projects.filter(
    (project) => project.dueInDays !== null && project.dueInDays >= 0 && project.dueInDays <= 7
  );
  const riskProjects = projects.filter((project) => project.health.key === "risk");
  const watchedProjects = projects.filter((project) => project.health.key === "steady");
  const openRisks = projects.reduce((sum, project) => sum + project.openRisks, 0);
  const criticalRisks = projects.reduce((sum, project) => sum + project.criticalRisks, 0);
  const overdueTasks = projects.reduce((sum, project) => sum + project.overdueTasks, 0);
  const dueThisWeekTasks = projects.reduce((sum, project) => sum + project.dueThisWeekTasks, 0);
  const averageHealth =
    projects.length === 0 ? 0 : Math.round(projects.reduce((sum, project) => sum + project.health.score, 0) / projects.length);
  const averageMilestoneCompletion =
    projects.length === 0
      ? 0
      : Math.round(projects.reduce((sum, project) => sum + project.milestoneCompletionRate, 0) / projects.length);
  const totalCapacityHours = team.reduce((sum, member) => sum + member.weeklyCapacityHours, 0);
  const projectedHours = team.reduce((sum, member) => sum + member.projectedHours, 0);
  const utilization = totalCapacityHours === 0 ? 0 : Math.round((projectedHours / totalCapacityHours) * 100);
  const overloadedMembers = team.filter((member) => member.loadState === "overloaded");
  const watchMembers = team.filter((member) => member.loadState === "watch");
  const activityLast7Days = activity.filter((item) => item.createdAt >= lastWeek).length;

  const clientHealth = projects.reduce(
    (acc, project) => {
      const key = project.client?.health ?? "INTERNAL";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusDistribution = projects.reduce(
    (acc, project) => {
      acc[project.status] = (acc[project.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const projectSpotlights = {
    highestRisk:
      [...projects].sort(
        (left, right) =>
          left.health.score - right.health.score ||
          right.criticalRisks - left.criticalRisks ||
          right.overdueTasks - left.overdueTasks
      )[0] ?? null,
    nearestDeadline:
      [...projects]
        .filter((project) => project.dueDateResolved)
        .sort((left, right) => (left.dueInDays ?? 999) - (right.dueInDays ?? 999))[0] ?? null,
    bestThroughput:
      [...projects].sort(
        (left, right) =>
          right.completionRate - left.completionRate ||
          right.completedTasks - left.completedTasks
      )[0] ?? null,
  };

  return {
    generatedAt: now,
    summary: {
      projectCount: projects.length,
      riskProjects: riskProjects.length,
      watchedProjects: watchedProjects.length,
      deliveriesThisWeek: deliveriesThisWeek.length,
      completedLast7Days,
      openRisks,
      criticalRisks,
      overdueTasks,
      dueThisWeekTasks,
      averageHealth,
      averageMilestoneCompletion,
      totalCapacityHours,
      projectedHours,
      utilization,
      overloadedMembers: overloadedMembers.length,
      watchMembers: watchMembers.length,
      activityLast7Days,
    },
    statusDistribution,
    clientHealth,
    deliveriesThisWeek,
    riskProjects: [...riskProjects].sort(
      (left, right) =>
        left.health.score - right.health.score ||
        right.criticalRisks - left.criticalRisks ||
        right.overdueTasks - left.overdueTasks
    ),
    overloadedMembers,
    watchMembers,
    projectSpotlights,
  };
}
