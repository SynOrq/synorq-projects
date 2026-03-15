import type { ExecutiveReport } from "./reports.ts";

export type AISummaryTone = "attention" | "watch" | "stable";

type SummaryBlock = {
  id: string;
  title: string;
  detail: string;
};

type ProjectSummaryInput = {
  project: {
    name: string;
    status: string;
    type: string;
    priority: string;
    dueDate: Date | null;
    client: {
      name: string;
      health: "STABLE" | "WATCH" | "AT_RISK";
    } | null;
  };
  health: {
    key: "good" | "steady" | "risk";
    score: number;
    label: string;
  };
  metrics: {
    openTasks: number;
    completedTasks: number;
    overdueTasks: number;
    dueThisWeekTasks: number;
    unassignedTasks: number;
    completionRate: number;
  };
  teamLoad: Array<{
    id: string;
    name: string;
    loadState: "balanced" | "watch" | "overloaded";
    activeTasks: number;
    overdueTasks: number;
    dueThisWeekTasks: number;
  }>;
  risks: Array<{
    id: string;
    title: string;
    severity: "warning" | "critical";
    status: string;
  }>;
};

export function buildProjectAISummary(input: ProjectSummaryInput) {
  const criticalRisks = input.risks.filter((risk) => risk.severity === "critical" && risk.status !== "CLOSED");
  const warningRisks = input.risks.filter((risk) => risk.severity === "warning" && risk.status !== "CLOSED");
  const overloadedMembers = input.teamLoad.filter((member) => member.loadState === "overloaded");
  const watchMembers = input.teamLoad.filter((member) => member.loadState === "watch");

  const tone: AISummaryTone =
    input.health.key === "risk" || criticalRisks.length > 0 || input.metrics.overdueTasks > 0 || overloadedMembers.length > 0
      ? "attention"
      : input.health.key === "steady" ||
          warningRisks.length > 0 ||
          input.metrics.dueThisWeekTasks > 0 ||
          input.metrics.unassignedTasks > 0 ||
          watchMembers.length > 0 ||
          input.project.client?.health === "WATCH"
        ? "watch"
        : "stable";

  const headline =
    tone === "attention"
      ? `${input.project.name} icin delivery posture mudahale gerektiriyor.`
      : tone === "watch"
        ? `${input.project.name} kontrollu ilerliyor, fakat yakin izleme gerekli.`
        : `${input.project.name} icin delivery ritmi stabil gorunuyor.`;

  const narrative = [
    `Health skoru ${input.health.score}; ${input.metrics.completedTasks}/${input.metrics.openTasks + input.metrics.completedTasks} gorev tamamlandi ve completion orani %${input.metrics.completionRate}.`,
    `${input.metrics.overdueTasks} overdue, ${input.metrics.dueThisWeekTasks} bu hafta teslim ve ${input.metrics.unassignedTasks} ownership gap sinyali bulunuyor.`,
    input.project.client
      ? `${input.project.client.name} iliski seviyesi ${clientHealthLabel(input.project.client.health)} bandinda; proje tipi ${input.project.type.toLowerCase()} ve oncelik ${input.project.priority.toLowerCase()}.`
      : `Internal proje olarak takip ediliyor; proje tipi ${input.project.type.toLowerCase()} ve oncelik ${input.project.priority.toLowerCase()}.`,
  ];

  const focusAreas: SummaryBlock[] = [
    criticalRisks[0]
      ? {
          id: "risk",
          title: "Critical risk pressure",
          detail: `${criticalRisks.length} kritik risk var; ilk kayit "${criticalRisks[0].title}" olarak one cikiyor.`,
        }
      : warningRisks[0]
        ? {
            id: "risk",
            title: "Risk watchlist",
            detail: `${warningRisks.length} watch seviyesi risk takipte; erken aksiyon delivery kaybini engeller.`,
          }
        : null,
    input.metrics.overdueTasks > 0 || input.metrics.dueThisWeekTasks > 0
      ? {
          id: "delivery",
          title: "Delivery window",
          detail: `${input.metrics.overdueTasks} overdue ve ${input.metrics.dueThisWeekTasks} bu hafta teslim gorevi bulunuyor.`,
        }
      : null,
    overloadedMembers[0]
      ? {
          id: "capacity",
          title: "Capacity pressure",
          detail: `${overloadedMembers[0].name} overloaded; ${overloadedMembers[0].activeTasks} aktif ve ${overloadedMembers[0].dueThisWeekTasks} due-this-week gorevi var.`,
        }
      : watchMembers[0]
        ? {
            id: "capacity",
            title: "Team watch",
            detail: `${watchMembers[0].name} watch bandinda; proje ekibi teslim yogunluguna yaklasiyor.`,
          }
        : null,
    {
      id: "progress",
      title: "Progress posture",
      detail: `${input.metrics.openTasks} acik gorev kaldi; mevcut completion orani %${input.metrics.completionRate}.`,
    },
  ].filter(Boolean) as SummaryBlock[];

  const nextActions = [
    input.metrics.overdueTasks > 0 ? `${input.metrics.overdueTasks} overdue gorev icin owner checkpoint alin.` : null,
    input.metrics.unassignedTasks > 0 ? `${input.metrics.unassignedTasks} sahipsiz goreve sahiplik atayin.` : null,
    criticalRisks.length > 0 ? `${criticalRisks.length} kritik risk icin mitigation planini leadership review'a tasiyin.` : null,
    overloadedMembers.length > 0 ? "Teslim baskisini overloaded uyeler uzerinden yeniden dengeleyin." : null,
    tone === "stable" ? "Mevcut ritmi koruyup client/status ozetini haftalik olarak paylasin." : null,
  ].filter(Boolean) as string[];

  return {
    tone,
    headline,
    narrative,
    focusAreas: focusAreas.slice(0, 3),
    nextActions,
  };
}

export function buildExecutiveAISummary(report: ExecutiveReport) {
  const tone: AISummaryTone =
    report.summary.riskProjects > 0 || report.summary.criticalRisks > 0 || report.summary.overloadedMembers > 0
      ? "attention"
      : report.summary.watchedProjects > 0 || report.summary.watchMembers > 0
        ? "watch"
        : "stable";

  const headline =
    tone === "attention"
      ? "AI-assisted briefing, delivery posture icin yonetsel mudahale oneriyor."
      : tone === "watch"
        ? "AI-assisted briefing, portfoy stabil fakat izlenecek yogunluk noktalarini vurguluyor."
        : "AI-assisted briefing, portfoy ritminin kontrollu oldugunu gosteriyor.";

  const narrative = [
    `${report.summary.projectCount} aktif projenin ${report.summary.riskProjects} tanesi risk, ${report.summary.watchedProjects} tanesi watch bandinda.`,
    `Bu hafta ${report.summary.deliveriesThisWeek} proje teslim bandinda; ${report.summary.dueThisWeekTasks} gorev kapanis ve ${report.summary.overdueTasks} overdue sinyali var.`,
    `Toplam kapasite kullanimı %${report.summary.utilization}; ${report.summary.overloadedMembers} uye overloaded, ${report.summary.watchMembers} uye watch seviyesinde.`,
  ];

  const focusAreas: SummaryBlock[] = [
    report.projectSpotlights.highestRisk
      ? {
          id: "risk",
          title: "Top escalation",
          detail: `${report.projectSpotlights.highestRisk.name} en kritik proje; ${report.projectSpotlights.highestRisk.criticalRisks} kritik risk ve ${report.projectSpotlights.highestRisk.overdueTasks} overdue gorev tasiyor.`,
        }
      : null,
    report.projectSpotlights.nearestDeadline
      ? {
          id: "delivery",
          title: "Nearest delivery",
          detail: `${report.projectSpotlights.nearestDeadline.name} en yakin teslim penceresinde ve takvim kontrolu gerektiriyor.`,
        }
      : null,
    report.overloadedMembers[0]
      ? {
          id: "capacity",
          title: "Capacity hotspot",
          detail: `${report.overloadedMembers[0].name} %${report.overloadedMembers[0].utilization} utilization ile en yuksek baskiyi tasiyor.`,
        }
      : report.watchMembers[0]
        ? {
            id: "capacity",
            title: "Capacity watch",
            detail: `${report.watchMembers[0].name} watch bandinda; dengeleme gecikirse overloaded sinyaline donebilir.`,
          }
        : null,
  ].filter(Boolean) as SummaryBlock[];

  const nextActions = [
    report.summary.criticalRisks > 0 ? `${report.summary.criticalRisks} kritik risk icin escalation sahipligini netlestirin.` : null,
    report.summary.overdueTasks > 0 ? `${report.summary.overdueTasks} overdue gorev icin haftalik owner review planlayin.` : null,
    report.summary.overloadedMembers > 0 ? "Overloaded ekip uyeleri icin kapasite yeniden dagitimi yapin." : null,
    tone === "stable" ? "Stable portfoy ritmini haftalik digest ve shareable summary ile koruyun." : null,
  ].filter(Boolean) as string[];

  return {
    tone,
    headline,
    narrative,
    focusAreas,
    nextActions,
  };
}

function clientHealthLabel(value: "STABLE" | "WATCH" | "AT_RISK") {
  if (value === "AT_RISK") return "at risk";
  if (value === "WATCH") return "watch";
  return "stable";
}
