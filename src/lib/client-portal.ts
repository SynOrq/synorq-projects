import type { AnalyzedProject } from "./portfolio.ts";

type ClientHealth = "STABLE" | "WATCH" | "AT_RISK";

type ClientPortalInput = {
  client: {
    name: string;
    health: ClientHealth;
  };
  projects: AnalyzedProject[];
  recentActivityCount?: number;
  now?: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeClientPortalPayload(
  value: unknown
):
  | {
      data: {
        isPublished?: boolean;
        welcomeTitle?: string | null;
        welcomeMessage?: string | null;
        accentColor?: string;
        regenerateToken: boolean;
      };
    }
  | { error: string } {
  if (!isRecord(value)) {
    return { error: "Gecersiz portal payload." };
  }

  const data: {
    isPublished?: boolean;
    welcomeTitle?: string | null;
    welcomeMessage?: string | null;
    accentColor?: string;
    regenerateToken: boolean;
  } = {
    regenerateToken: value.regenerateToken === true,
  };

  if ("isPublished" in value) {
    if (typeof value.isPublished !== "boolean") {
      return { error: "Portal yayin durumu gecerli degil." };
    }
    data.isPublished = value.isPublished;
  }

  if ("welcomeTitle" in value) {
    data.welcomeTitle = normalizeOptionalText(value.welcomeTitle);
  }

  if ("welcomeMessage" in value) {
    data.welcomeMessage = normalizeOptionalText(value.welcomeMessage);
  }

  if ("accentColor" in value) {
    const accentColor = normalizeOptionalText(value.accentColor);
    if (!accentColor) {
      data.accentColor = "#0f172a";
    } else if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      return { error: "Portal accent rengi #RRGGBB formatinda olmali." };
    } else {
      data.accentColor = accentColor.toLowerCase();
    }
  }

  return { data };
}

export function buildClientPortalSummary({
  client,
  projects,
  recentActivityCount = 0,
  now = new Date(),
}: ClientPortalInput) {
  const nextTwoWeeks = new Date(now);
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  const completedBoundary = new Date(now);
  completedBoundary.setDate(completedBoundary.getDate() - 14);

  const deliveriesNext14Days = projects.filter(
    (project) => project.dueDateResolved && new Date(project.dueDateResolved) >= now && new Date(project.dueDateResolved) <= nextTwoWeeks
  ).length;
  const overdueTasks = projects.reduce((total, project) => total + project.overdueTasks, 0);
  const openRisks = projects.reduce((total, project) => total + project.openRisks, 0);
  const completedLast14Days = projects.reduce(
    (total, project) =>
      total +
      project.tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= completedBoundary).length,
    0
  );
  const averageCompletionRate =
    projects.length === 0 ? 0 : Math.round(projects.reduce((total, project) => total + project.completionRate, 0) / projects.length);
  const averageHealth =
    projects.length === 0 ? 0 : Math.round(projects.reduce((total, project) => total + project.health.score, 0) / projects.length);

  const tone =
    client.health === "AT_RISK" || overdueTasks >= 2 || openRisks >= 3
      ? "attention"
      : client.health === "WATCH" || deliveriesNext14Days > 0 || openRisks > 0
        ? "watch"
        : "stable";

  const headline =
    tone === "attention"
      ? `${client.name} icin yakin takip gerektiren teslim ve risk sinyalleri var.`
      : tone === "watch"
        ? `${client.name} teslim takvimi kontrollu, ancak izlenmesi gereken sinyaller mevcut.`
        : `${client.name} delivery gorunumu stabil ve paylasima hazir.`;

  const watchlist = [...projects]
    .sort((left, right) => {
      const leftScore = left.criticalRisks * 10 + left.overdueTasks * 6 + (left.dueInDays !== null && left.dueInDays <= 7 ? 4 : 0);
      const rightScore = right.criticalRisks * 10 + right.overdueTasks * 6 + (right.dueInDays !== null && right.dueInDays <= 7 ? 4 : 0);
      return rightScore - leftScore || left.health.score - right.health.score;
    })
    .slice(0, 4)
    .map((project) => ({
      id: project.id,
      name: project.name,
      healthLabel: project.health.label,
      healthKey: project.health.key,
      ownerName: project.owner?.name ?? project.owner?.email ?? "Owner tanimsiz",
      dueDate: project.dueDateResolved,
      openRisks: project.openRisks,
      overdueTasks: project.overdueTasks,
      completionRate: project.completionRate,
      nextMilestoneTitle: project.nextMilestone?.title ?? null,
    }));

  const highlights = [
    `${projects.length} aktif proje icinde ${deliveriesNext14Days} teslim gelecek 14 gun bandinda.`,
    `${overdueTasks} geciken task, ${openRisks} acik risk ve son 14 gunde ${completedLast14Days} tamamlanan is gorunuyor.`,
    `Ortalama proje sagligi ${averageHealth}, tamamlanma orani ise %${averageCompletionRate}. ${recentActivityCount} guncel hareket kaydi portal akisina dusuyor.`,
  ];

  return {
    tone,
    headline,
    metrics: {
      activeProjects: projects.length,
      deliveriesNext14Days,
      overdueTasks,
      openRisks,
      completedLast14Days,
      averageCompletionRate,
      averageHealth,
    },
    highlights,
    watchlist,
  };
}
