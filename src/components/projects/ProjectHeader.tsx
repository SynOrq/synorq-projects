"use client";

import Link from "next/link";
import { ChevronRight, Settings, Plus, LayoutList, Columns } from "lucide-react";
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
    <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
        <Link href="/projects" className="hover:text-gray-600 transition-colors">Projeler</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{project.name}</span>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: project.color }}
          />
          <h1 className="text-xl font-black text-gray-900">{project.name}</h1>
          <span className="text-sm text-gray-400">{taskCount} görev</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "kanban" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Columns size={13} /> Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
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

      {project.description && (
        <p className="text-sm text-gray-500 mt-2 ml-7">{project.description}</p>
      )}
    </div>
  );
}
