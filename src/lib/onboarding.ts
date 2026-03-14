export type OnboardingChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

export type DemoWorkspaceMetric = {
  label: string;
  value: string;
  note: string;
};

export type DemoWorkspacePath = {
  label: string;
  description: string;
  href: string;
};

export function buildOnboardingChecklist(params: {
  hasProfileIdentity: boolean;
  hasWorkspace: boolean;
  hasWorkspaceBrand: boolean;
  projectCount: number;
  memberCount: number;
  taskCount: number;
  reportsReady: boolean;
  weeklyDigestEnabled: boolean;
  hasSavedProjectView: boolean;
}) {
  const items: OnboardingChecklistItem[] = [
    {
      id: "profile",
      label: "Profil kimligini tamamla",
      description: "Avatar ve isim, ekip ve activity akislari icinde kullanilir.",
      done: params.hasProfileIdentity,
      href: "/settings",
      cta: "Profile git",
    },
    {
      id: "workspace",
      label: "Workspace markasini tanimla",
      description: "Logo ve aciklama ile shell yuzeyini netlestir.",
      done: params.hasWorkspace && params.hasWorkspaceBrand,
      href: "/settings",
      cta: "Workspace ayarlari",
    },
    {
      id: "project",
      label: "Ilk proje akisini baslat",
      description: "Delivery visibility ve owner atamalarini projeler uzerinden kur.",
      done: params.projectCount > 0,
      href: "/projects/new",
      cta: "Proje olustur",
    },
    {
      id: "team",
      label: "Ekibi ve rolleri ekle",
      description: "Capacity ve governance yuzeyleri icin ilk ekip kadrosunu olustur.",
      done: params.memberCount > 1,
      href: "/members",
      cta: "Ekibi ac",
    },
    {
      id: "tasks",
      label: "Execution akisini doldur",
      description: "Task, due date ve milestone baglantilarini olustur.",
      done: params.taskCount > 0,
      href: "/projects",
      cta: "Projeleri ac",
    },
    {
      id: "saved-view",
      label: "Portfoy gorunumunu kaydet",
      description: "Risk, table veya owner odakli view'u ekip icin tekrar kullanilabilir hale getir.",
      done: params.hasSavedProjectView,
      href: "/projects",
      cta: "View'u kaydet",
    },
    {
      id: "reports",
      label: "Weekly summary posture kur",
      description: "Reports ve digest tercihleri ile yonetici gorunurlugunu ac.",
      done: params.reportsReady && params.weeklyDigestEnabled,
      href: "/reports",
      cta: "Raporlari ac",
    },
  ];

  const completed = items.filter((item) => item.done).length;

  return {
    items,
    completed,
    total: items.length,
    progress: items.length === 0 ? 0 : Math.round((completed / items.length) * 100),
    nextItem: items.find((item) => !item.done) ?? null,
  };
}

export function buildDemoWorkspaceState(params: {
  workspaceName: string;
  projectCount: number;
  memberCount: number;
  taskCount: number;
  activityCount: number;
  riskProjectCount: number;
  overdueTaskCount: number;
  openRiskCount: number;
  criticalMilestoneCount: number;
  weeklyDigestEnabled: boolean;
}) {
  const hasDemoDensity =
    params.projectCount >= 3 && params.taskCount >= 10 && params.activityCount >= 6 && params.memberCount >= 3;

  const tone =
    !hasDemoDensity
      ? "thin"
      : params.riskProjectCount > 0 || params.overdueTaskCount > 0 || params.openRiskCount > 0
        ? "active"
        : "stable";

  const headline =
    tone === "thin"
      ? `${params.workspaceName} halen ince bir shell gorunumu veriyor.`
      : tone === "active"
        ? `${params.workspaceName} demo workspace'i artik operasyon sinyallerini gosterebiliyor.`
        : `${params.workspaceName} workspace'i stabil bir demo ritmine sahip.`;

  const description =
    tone === "thin"
      ? "Daha guclu demo etkisi icin proje, gorev, activity ve risk yogunlugu artirilmali."
      : "Dashboard, projects, reports ve team capacity yuzeylerini acarken artik kanitlayici veri katmani hazir.";

  const metrics: DemoWorkspaceMetric[] = [
    {
      label: "Projects",
      value: String(params.projectCount),
      note: params.riskProjectCount > 0 ? `${params.riskProjectCount} risk bandinda` : "delivery portfolio",
    },
    {
      label: "Tasks",
      value: String(params.taskCount),
      note: params.overdueTaskCount > 0 ? `${params.overdueTaskCount} overdue task` : "execution backlog",
    },
    {
      label: "Activity",
      value: String(params.activityCount),
      note: "audit + collaboration stream",
    },
    {
      label: "Signals",
      value: String(params.openRiskCount + params.criticalMilestoneCount),
      note: `${params.openRiskCount} open risk • ${params.criticalMilestoneCount} at-risk milestone`,
    },
  ];

  const explorationPaths: DemoWorkspacePath[] = [
    {
      label: "Risk portfolio view",
      description: "Table view icinde riskteki projeleri ve teslim baskisini tara.",
      href: "/projects?health=risk&view=table",
    },
    {
      label: "Shareable report",
      description: "Yonetime veya client review'a gidecek sade executive summary'i ac.",
      href: "/reports/share",
    },
    {
      label: "Team capacity",
      description: "Kapasite baskisi, due-date density ve workload heatmap'i incele.",
      href: "/members",
    },
    {
      label: "Execution inbox",
      description: "Gecikenler, review queue ve blocked isleri kisisel akis icinde gor.",
      href: "/my-tasks?segment=overdue",
    },
  ];

  if (!params.weeklyDigestEnabled) {
    explorationPaths.unshift({
      label: "Digest posture ac",
      description: "Weekly summary posture'u tamamlayip reports katmanini kapat.",
      href: "/settings",
    });
  }

  return {
    tone,
    headline,
    description,
    hasDemoDensity,
    metrics,
    explorationPaths: explorationPaths.slice(0, 4),
  };
}
