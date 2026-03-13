"use client";

import Link from "next/link";
import { ChevronRight, Settings, Plus, LayoutList, Columns, LayoutPanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Project } from "@prisma/client";

interface Props {
  project: Project;
  taskCount: number;
}

export default function ProjectHeader({ project, taskCount }: Props) {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5 flex-shrink-0">
      <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-600 transition-colors">Projects</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-slate-700">{project.name}</span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <LayoutPanelTop size={13} />
            Projects Execution Layer
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: project.color }} />
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{project.name}</h1>
            <span className="text-sm text-slate-400">{taskCount} gorev</span>
          </div>
          {project.description && (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                view === "kanban" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Columns size={13} /> Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                view === "list" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutList size={13} /> Liste
            </button>
          </div>

          <Button size="sm" variant="outline">
            <Settings size={14} />
          </Button>

          <Button size="sm">
            <Plus size={14} /> Görev Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
