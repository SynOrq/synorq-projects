export type CommandItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: "Navigate" | "Create" | "Projects" | "My Work" | "Signals";
  accent?: string;
  keywords: string[];
};

type CommandProject = {
  id: string;
  name: string;
  color: string;
};

type CommandTask = {
  id: string;
  title: string;
  href: string;
  projectName: string;
  dueLabel?: string | null;
};

type CommandAlert = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "risk" | "activity";
};

export function buildCommandItems(params: {
  projects: CommandProject[];
  focusTasks: CommandTask[];
  alerts: CommandAlert[];
}) {
  const items: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "Dashboard",
      subtitle: "Delivery control surface",
      href: "/dashboard",
      group: "Navigate",
      keywords: ["dashboard", "home", "pulse"],
    },
    {
      id: "nav-projects",
      title: "Projects",
      subtitle: "Portfolio visibility and saved views",
      href: "/projects",
      group: "Navigate",
      keywords: ["projects", "portfolio", "list"],
    },
    {
      id: "nav-reports",
      title: "Reports",
      subtitle: "Executive summary and weekly report",
      href: "/reports",
      group: "Navigate",
      keywords: ["reports", "weekly", "executive", "summary"],
    },
    {
      id: "nav-team",
      title: "Team capacity",
      subtitle: "Load, heatmap and member access",
      href: "/members",
      group: "Navigate",
      keywords: ["team", "capacity", "members", "workload"],
    },
    {
      id: "nav-notifications",
      title: "Notifications",
      subtitle: "Action required, activity and digest",
      href: "/notifications",
      group: "Navigate",
      keywords: ["notifications", "alerts", "activity"],
    },
    {
      id: "nav-audit",
      title: "Audit log",
      subtitle: "Governance and traceability",
      href: "/audit",
      group: "Navigate",
      keywords: ["audit", "activity", "governance", "log"],
    },
    {
      id: "nav-settings",
      title: "Settings",
      subtitle: "Workspace, team and notification rules",
      href: "/settings",
      group: "Navigate",
      keywords: ["settings", "workspace", "profile"],
    },
    {
      id: "create-project",
      title: "Create project",
      subtitle: "Open project creation wizard",
      href: "/projects/new",
      group: "Create",
      keywords: ["new", "create", "project"],
    },
    {
      id: "create-risk-view",
      title: "Show risk projects",
      subtitle: "Open portfolio filtered by health risk",
      href: "/projects?health=risk",
      group: "Create",
      keywords: ["risk", "projects", "health"],
    },
  ];

  items.push(
    ...params.projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      subtitle: "Open project detail",
      href: `/projects/${project.id}`,
      group: "Projects" as const,
      accent: project.color,
      keywords: [project.name.toLowerCase(), "project"],
    }))
  );

  items.push(
    ...params.focusTasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: `${task.projectName}${task.dueLabel ? ` • ${task.dueLabel}` : ""}`,
      href: task.href,
      group: "My Work" as const,
      keywords: [task.title.toLowerCase(), task.projectName.toLowerCase(), "task", "my work"],
    }))
  );

  items.push(
    ...params.alerts.map((alert) => ({
      id: `signal-${alert.id}`,
      title: alert.title,
      subtitle: alert.detail,
      href: alert.href,
      group: "Signals" as const,
      keywords: [alert.title.toLowerCase(), alert.detail.toLowerCase(), alert.tone],
    }))
  );

  return items;
}

export function filterCommandItems(items: CommandItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;

  return items.filter((item) => {
    const haystack = [item.title, item.subtitle, ...item.keywords].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}
