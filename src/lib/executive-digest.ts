import type { ExecutiveReport } from "./reports.ts";

export function buildExecutiveWeeklyDigest(report: ExecutiveReport) {
  const tone =
    report.summary.riskProjects > 0 || report.summary.overloadedMembers > 0
      ? "attention"
      : report.summary.watchedProjects > 0 || report.summary.watchMembers > 0
        ? "watch"
        : "stable";

  const headline =
    tone === "attention"
      ? "Haftalik yonetici ozeti: teslim ritmi yakin takip gerektiriyor."
      : tone === "watch"
        ? "Haftalik yonetici ozeti: portfoy stabil, fakat izlenmesi gereken sinyaller var."
        : "Haftalik yonetici ozeti: delivery posture stabil ve kontrollu.";

  const narrative = [
    `${report.summary.projectCount} aktif projenin ${report.summary.riskProjects} tanesi risk bandinda, ${report.summary.watchedProjects} tanesi watch bandinda.`,
    `Bu hafta ${report.summary.deliveriesThisWeek} proje teslim bandinda ve toplam ${report.summary.dueThisWeekTasks} gorev kapanis bekliyor.`,
    `Ekip kullanimi %${report.summary.utilization}; ${report.summary.overloadedMembers} uye overloaded, ${report.summary.watchMembers} uye watch seviyesinde.`,
  ];

  const leadershipBlocks = [
    report.projectSpotlights.highestRisk
      ? {
          id: "risk",
          label: "Critical risk",
          title: report.projectSpotlights.highestRisk.name,
          detail: `${report.projectSpotlights.highestRisk.criticalRisks} kritik risk • ${report.projectSpotlights.highestRisk.overdueTasks} overdue task`,
        }
      : null,
    report.projectSpotlights.nearestDeadline
      ? {
          id: "deadline",
          label: "Nearest deadline",
          title: report.projectSpotlights.nearestDeadline.name,
          detail: `${report.projectSpotlights.nearestDeadline.dueDateResolved?.toISOString().slice(0, 10) ?? "Plansiz"} teslim tarihi`,
        }
      : null,
    report.overloadedMembers[0]
      ? {
          id: "capacity",
          label: "Capacity watch",
          title: report.overloadedMembers[0].name,
          detail: `%${report.overloadedMembers[0].utilization} utilization • ${report.overloadedMembers[0].activeTasks} aktif task`,
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; title: string; detail: string }>;

  const clientSignals = Object.entries(report.clientHealth)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      id: key,
      label: key === "AT_RISK" ? "At risk" : key === "WATCH" ? "Watch" : key === "STABLE" ? "Stable" : "Internal",
      value: count,
    }));

  const deliveryFocus = report.riskProjects.slice(0, 4).map((project) => ({
    id: project.id,
    title: project.name,
    detail: `${project.client?.name ?? "Internal"} • ${project.openRisks} open risk • ${project.overdueTasks} overdue`,
  }));

  const teamFocus = [...report.overloadedMembers, ...report.watchMembers].slice(0, 4).map((member) => ({
    id: member.id,
    title: member.name,
    detail: `%${member.utilization} utilization • ${member.activeTasks} aktif • ${member.overdueTasks} overdue`,
  }));

  const recommendations = [
    report.summary.overdueTasks > 0 ? `${report.summary.overdueTasks} overdue gorev icin owner checkpoint alin.` : null,
    report.summary.criticalRisks > 0 ? `${report.summary.criticalRisks} kritik risk icin escalation sahipligini netlestirin.` : null,
    report.summary.overloadedMembers > 0 ? "Overloaded uyelerin teslim baskisini yeniden dengeleyin." : null,
  ].filter(Boolean) as string[];

  return {
    tone,
    headline,
    narrative,
    leadershipBlocks,
    clientSignals,
    deliveryFocus,
    teamFocus,
    recommendations,
  };
}
