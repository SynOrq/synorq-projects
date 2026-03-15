import type { AnalyzedProject } from "./portfolio.ts";
import type { CapacitySnapshot } from "./team-capacity.ts";
import { buildPortfolioHealthSummary, buildTeamWorkloadMetrics } from "./analytics.ts";

export function buildPortfolioRiskTrend(projects: AnalyzedProject[]) {
  const summary = buildPortfolioHealthSummary(projects);
  const buckets = [
    { key: "risk", label: "Riskte", count: summary.riskProjects.length, tone: "bg-red-500" },
    { key: "watch", label: "Izlemede", count: summary.watchedProjects.length, tone: "bg-amber-500" },
    { key: "overdue", label: "Overdue", count: summary.overdueTasks, tone: "bg-orange-500" },
    { key: "open-risks", label: "Open risk", count: summary.openRisks, tone: "bg-indigo-500" },
  ];

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return buckets.map((bucket) => ({
    ...bucket,
    width: Math.max(10, Math.round((bucket.count / max) * 100)),
  }));
}

export function buildOwnerDistribution(projects: AnalyzedProject[]) {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      projects: number;
      riskProjects: number;
      overdueTasks: number;
      completionRate: number;
    }
  >();

  for (const project of projects) {
    const id = project.owner?.id ?? "workspace-owner";
    const name = project.owner?.name ?? project.owner?.email ?? "Workspace owner";
    const current = grouped.get(id);

    if (!current) {
      grouped.set(id, {
        id,
        name,
        projects: 1,
        riskProjects: project.health.key === "risk" ? 1 : 0,
        overdueTasks: project.overdueTasks,
        completionRate: project.completionRate,
      });
      continue;
    }

    current.projects += 1;
    current.riskProjects += project.health.key === "risk" ? 1 : 0;
    current.overdueTasks += project.overdueTasks;
    current.completionRate += project.completionRate;
  }

  return [...grouped.values()]
    .map((owner) => ({
      ...owner,
      averageCompletion: owner.projects === 0 ? 0 : Math.round(owner.completionRate / owner.projects),
    }))
    .sort((left, right) => right.riskProjects - left.riskProjects || right.projects - left.projects);
}

export function buildPortfolioWorkloadSummary(team: CapacitySnapshot[]) {
  const workload = buildTeamWorkloadMetrics(team);

  return {
    overloadedMembers: workload.overloadedMembers.length,
    watchMembers: workload.watchMembers.length,
    averageUtilization: workload.averageUtilization,
    projectedHours: workload.projectedHours,
    capacityHours: workload.capacityHours,
    topLoad: workload.topLoad,
  };
}
