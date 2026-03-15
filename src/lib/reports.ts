import type { AnalyzedProject } from "./portfolio.ts";
import type { CapacitySnapshot } from "./team-capacity.ts";
import {
  buildPortfolioHealthSummary,
  buildTeamWorkloadMetrics,
  buildWeeklyReportingMetrics,
} from "./analytics.ts";

type ActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
};

export type ExecutiveReport = ReturnType<typeof buildExecutiveReport>;

export function buildExecutiveReport(
  projects: AnalyzedProject[],
  team: CapacitySnapshot[],
  activity: ActivityItem[],
  now = new Date()
) {
  const portfolio = buildPortfolioHealthSummary(projects, now);
  const workload = buildTeamWorkloadMetrics(team);
  const weekly = buildWeeklyReportingMetrics(projects, activity, now);

  return {
    generatedAt: now,
    summary: {
      projectCount: projects.length,
      riskProjects: portfolio.riskProjects.length,
      watchedProjects: portfolio.watchedProjects.length,
      deliveriesThisWeek: portfolio.deliveriesThisWeek.length,
      completedLast7Days: weekly.completedLast7Days,
      openRisks: portfolio.openRisks,
      criticalRisks: portfolio.criticalRisks,
      overdueTasks: portfolio.overdueTasks,
      dueThisWeekTasks: portfolio.dueThisWeekTasks,
      averageHealth: portfolio.averageHealth,
      averageMilestoneCompletion: portfolio.averageMilestoneCompletion,
      totalCapacityHours: workload.totalCapacityHours,
      projectedHours: workload.projectedHours,
      utilization: workload.utilization,
      overloadedMembers: workload.overloadedMembers.length,
      watchMembers: workload.watchMembers.length,
      activityLast7Days: weekly.activityLast7Days,
    },
    statusDistribution: portfolio.statusDistribution,
    clientHealth: portfolio.clientHealth,
    deliveriesThisWeek: portfolio.deliveriesThisWeek,
    riskProjects: [...portfolio.riskProjects].sort(
      (left, right) =>
        left.health.score - right.health.score ||
        right.criticalRisks - left.criticalRisks ||
        right.overdueTasks - left.overdueTasks
    ),
    overloadedMembers: workload.overloadedMembers,
    watchMembers: workload.watchMembers,
    projectSpotlights: portfolio.projectSpotlights,
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
