import type { AnalyzedProject } from "@/lib/portfolio";
import type { CapacitySnapshot } from "@/lib/team-capacity";

type ActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
};

export type ExecutiveReport = ReturnType<typeof buildExecutiveReport>;

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

export function buildShareableReportSummary(report: ExecutiveReport) {
  const healthTone =
    report.summary.riskProjects > 0
      ? "attention"
      : report.summary.watchedProjects > 0 || report.summary.watchMembers > 0
        ? "watch"
        : "stable";

  const headline =
    healthTone === "attention"
      ? "Delivery ritmi yakin takibe ihtiyac duyuyor."
      : healthTone === "watch"
        ? "Portfoy genel olarak stabil, ancak takip gereken sinyaller var."
        : "Portfoy ritmi stabil ve teslim gorunurlugu kontrol altinda.";

  const highlights = [
    `${report.summary.riskProjects} riskte proje, ${report.summary.criticalRisks} kritik risk kaydi.`,
    `${report.summary.deliveriesThisWeek} proje bu hafta teslim bandinda, ${report.summary.dueThisWeekTasks} gorev kapanis bekliyor.`,
    `7 gunde ${report.summary.completedLast7Days} gorev tamamlandi, ekip kapasite kullanimı %${report.summary.utilization}.`,
  ];

  const priorities = [
    report.projectSpotlights.highestRisk
      ? {
          label: "En kritik proje",
          title: report.projectSpotlights.highestRisk.name,
          detail: `${report.projectSpotlights.highestRisk.criticalRisks} kritik risk • ${report.projectSpotlights.highestRisk.overdueTasks} overdue task`,
        }
      : null,
    report.projectSpotlights.nearestDeadline
      ? {
          label: "En yakin teslim",
          title: report.projectSpotlights.nearestDeadline.name,
          detail: report.projectSpotlights.nearestDeadline.dueDateResolved
            ? `${report.projectSpotlights.nearestDeadline.dueDateResolved.toISOString().slice(0, 10)} teslim tarihi`
            : "Teslim tarihi planlanmadi",
        }
      : null,
    report.overloadedMembers[0]
      ? {
          label: "Kapasite baskisi",
          title: report.overloadedMembers[0].name,
          detail: `%${report.overloadedMembers[0].utilization} utilization • ${report.overloadedMembers[0].activeTasks} aktif task`,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; title: string; detail: string }>;

  const riskDigest = report.riskProjects.slice(0, 3).map((project) => ({
    id: project.id,
    title: project.name,
    detail: `${project.client?.name ?? "Internal"} • ${project.criticalRisks} kritik risk • ${project.openMilestones} acik milestone`,
  }));

  const workloadDigest = [...report.overloadedMembers, ...report.watchMembers].slice(0, 3).map((member) => ({
    id: member.id,
    title: member.name,
    detail: `%${member.utilization} utilization • ${member.activeTasks} aktif task • ${member.overdueTasks} overdue`,
  }));

  return {
    headline,
    healthTone,
    highlights,
    priorities,
    riskDigest,
    workloadDigest,
  };
}
