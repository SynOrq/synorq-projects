type RiskStatus = "OPEN" | "MITIGATING" | "WATCH" | "CLOSED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkspaceRiskRecord = {
  id: string;
  title: string;
  status: RiskStatus;
  impact: RiskLevel;
  likelihood: RiskLevel;
  mitigationPlan: string | null;
  dueDate: Date | null;
  ownerName: string;
  taskTitle: string | null;
  projectId: string;
  projectName: string;
  projectColor: string;
};

export type WorkspaceRiskItem = WorkspaceRiskRecord & {
  severity: "warning" | "critical";
  score: number;
  dueState: "overdue" | "due-soon" | "scheduled" | "none";
  href: string;
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

export function buildWorkspaceRiskRegister(risks: WorkspaceRiskRecord[], now = new Date()) {
  const today = startOfDay(now);
  const dueSoonBoundary = new Date(today);
  dueSoonBoundary.setDate(dueSoonBoundary.getDate() + 7);

  const items: WorkspaceRiskItem[] = risks
    .map((risk) => {
      const score = riskLevelWeight[risk.impact] + riskLevelWeight[risk.likelihood];
      const severity: WorkspaceRiskItem["severity"] =
        risk.impact === "CRITICAL" || risk.likelihood === "CRITICAL" || score >= 6 ? "critical" : "warning";
      const dueState: WorkspaceRiskItem["dueState"] =
        risk.dueDate === null
          ? "none"
          : risk.dueDate < today
            ? "overdue"
            : risk.dueDate <= dueSoonBoundary
              ? "due-soon"
              : "scheduled";

      return {
        ...risk,
        severity,
        score,
        dueState,
        href: `/projects/${risk.projectId}?tab=risks`,
      };
    })
    .sort((left, right) => {
      if (left.status === "CLOSED" && right.status !== "CLOSED") return 1;
      if (left.status !== "CLOSED" && right.status === "CLOSED") return -1;
      if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1;
      const leftTime = left.dueDate ? left.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueDate ? right.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime || right.score - left.score;
    });

  const hotspotsMap = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      projectColor: string;
      openRisks: number;
      criticalRisks: number;
      overdueRisks: number;
    }
  >();

  for (const item of items) {
    const current = hotspotsMap.get(item.projectId) ?? {
      projectId: item.projectId,
      projectName: item.projectName,
      projectColor: item.projectColor,
      openRisks: 0,
      criticalRisks: 0,
      overdueRisks: 0,
    };

    if (item.status !== "CLOSED") current.openRisks += 1;
    if (item.status !== "CLOSED" && item.severity === "critical") current.criticalRisks += 1;
    if (item.status !== "CLOSED" && item.dueState === "overdue") current.overdueRisks += 1;
    hotspotsMap.set(item.projectId, current);
  }

  return {
    summary: {
      openCount: items.filter((item) => item.status !== "CLOSED").length,
      criticalCount: items.filter((item) => item.status !== "CLOSED" && item.severity === "critical").length,
      mitigatingCount: items.filter((item) => item.status === "MITIGATING").length,
      dueSoonCount: items.filter((item) => item.status !== "CLOSED" && item.dueState === "due-soon").length,
    },
    items,
    hotspots: [...hotspotsMap.values()].sort(
      (left, right) =>
        right.criticalRisks - left.criticalRisks ||
        right.overdueRisks - left.overdueRisks ||
        right.openRisks - left.openRisks
    ),
  };
}
