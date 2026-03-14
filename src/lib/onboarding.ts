export type OnboardingChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
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
