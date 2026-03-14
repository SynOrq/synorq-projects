import Link from "next/link";
import { ChevronRight, LayoutPanelTop, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "timeline", label: "Timeline" },
  { id: "activity", label: "Activity" },
  { id: "risks", label: "Risks" },
] as const;

type Props = {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    type: string;
    priority: string;
    owner: { name: string | null; email: string } | null;
    client: { name: string } | null;
  };
  taskCount: number;
  currentTab: (typeof tabs)[number]["id"];
  health: {
    label: string;
    score: number;
    key: "good" | "steady" | "risk";
  };
  openTasks: number;
  overdueTasks: number;
};

export default function ProjectHeader({ project, taskCount, currentTab, health, openTasks, overdueTasks }: Props) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5">
      <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-600 transition-colors">Projects</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-slate-700">{project.name}</span>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <LayoutPanelTop size={13} />
            Project Control Center
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: project.color }} />
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{project.name}</h1>
            <Badge variant={health.key === "risk" ? "danger" : health.key === "steady" ? "warning" : "success"}>
              {health.label} • {health.score}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{project.client?.name ?? "Internal"}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {project.owner?.name ?? project.owner?.email ?? "Owner tanimsiz"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{project.type.replace("_", " ")}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{project.priority}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{taskCount} gorev</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{openTasks} acik is</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{overdueTasks} geciken</span>
          </div>
          {project.description && (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">
              <Settings size={14} />
              Settings
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/projects/${project.id}?tab=board`}>
              <Plus size={14} />
              Gorev Ekle
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/projects/${project.id}?tab=${tab.id}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              currentTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
