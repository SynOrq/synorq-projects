import type { AnalyzedProject } from "@/lib/portfolio";
import type { CapacitySnapshot } from "@/lib/team-capacity";

export function buildPortfolioRiskTrend(projects: AnalyzedProject[]) {
  const buckets = [
    { key: "risk", label: "Riskte", count: projects.filter((project) => project.health.key === "risk").length, tone: "bg-red-500" },
    { key: "watch", label: "Izlemede", count: projects.filter((project) => project.health.key === "steady").length, tone: "bg-amber-500" },
    { key: "overdue", label: "Overdue", count: projects.reduce((sum, project) => sum + project.overdueTasks, 0), tone: "bg-orange-500" },
    { key: "open-risks", label: "Open risk", count: projects.reduce((sum, project) => sum + project.openRisks, 0), tone: "bg-indigo-500" },
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
  const topLoad = [...team]
    .sort((left, right) => right.utilization - left.utilization || right.activeTasks - left.activeTasks)
    .slice(0, 4);

  return {
    overloadedMembers: team.filter((member) => member.loadState === "overloaded").length,
    watchMembers: team.filter((member) => member.loadState === "watch").length,
    averageUtilization:
      team.length === 0 ? 0 : Math.round(team.reduce((sum, member) => sum + member.utilization, 0) / team.length),
    projectedHours: team.reduce((sum, member) => sum + member.projectedHours, 0),
    capacityHours: team.reduce((sum, member) => sum + member.weeklyCapacityHours, 0),
    topLoad,
  };
}
