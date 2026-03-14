"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, MessageSquare, GitBranch, Calendar, AlertTriangle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import TaskModal from "@/components/tasks/TaskModal";
import type { TaskCardData } from "@/lib/task-detail";
import type { Section, User } from "@prisma/client";

type SectionWithTasks = Section & { tasks: TaskCardData[] };

interface Props {
  project: { id: string };
  sections: SectionWithTasks[];
  members: Pick<User, "id" | "name" | "image" | "email">[];
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400", MEDIUM: "bg-blue-500", HIGH: "bg-orange-500", URGENT: "bg-red-500",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function KanbanBoard({ project, sections: initialSections, members }: Props) {
  const [sections, setSections] = useState(initialSections);
  const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);
  const [addingSection, setAddingSection] = useState<string | null>(null); // sectionId
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const sourceSection = sections.find((s) => s.id === source.droppableId);
      const destSection   = sections.find((s) => s.id === destination.droppableId);
      if (!sourceSection || !destSection) return;

      const sourceTasks = [...sourceSection.tasks];
      const [movedTask] = sourceTasks.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        sourceTasks.splice(destination.index, 0, movedTask);
        setSections((prev) =>
          prev.map((s) => (s.id === source.droppableId ? { ...s, tasks: sourceTasks } : s))
        );
      } else {
        const destTasks = [...destSection.tasks];
        destTasks.splice(destination.index, 0, { ...movedTask, sectionId: destination.droppableId });
        setSections((prev) =>
          prev.map((s) => {
            if (s.id === source.droppableId) return { ...s, tasks: sourceTasks };
            if (s.id === destination.droppableId) return { ...s, tasks: destTasks };
            return s;
          })
        );
      }

      // Persist
      await fetch(`/api/tasks/${draggableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: destination.droppableId,
          order: destination.index,
        }),
      });
    },
    [sections]
  );

  async function addTask(sectionId: string) {
    if (!newTaskTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        sectionId,
        title: newTaskTitle.trim(),
      }),
    });
    if (res.ok) {
      const task = await res.json();
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, tasks: [...s.tasks, { ...task, _count: { comments: 0, subTasks: 0 } }] }
            : s
        )
      );
    }
    setNewTaskTitle("");
    setAddingSection(null);
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 p-6 min-w-max h-full">
          {sections.map((section) => (
            <div key={section.id} className="w-72 flex-shrink-0 flex flex-col">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{section.name}</span>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {section.tasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setAddingSection(section.id); setNewTaskTitle(""); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              {/* Tasks list */}
              <Droppable droppableId={section.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors",
                      snapshot.isDraggingOver ? "bg-indigo-50/60" : "bg-gray-50/50"
                    )}
                  >
                    {section.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTask(task)}
                            className={cn(
                              "bg-white rounded-xl border border-gray-100 p-3.5 cursor-pointer",
                              "hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all",
                              snapshot.isDragging && "shadow-xl shadow-indigo-100 rotate-1 border-indigo-200"
                            )}
                          >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", PRIORITY_BADGE[task.priority])}>
                                {task.priority}
                              </span>
                              {task.labels.slice(0, 2).map((label) => (
                                <span key={label} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                  {label}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-start gap-2 mb-2.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", PRIORITY_DOT[task.priority])} />
                              <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 flex-1">
                                {task.title}
                              </p>
                            </div>

                            {/* Due date */}
                            {task.dueDate && (
                              <div className={cn(
                                "mb-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                new Date(task.dueDate) < new Date()
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-500"
                              )}>
                                {new Date(task.dueDate) < new Date() ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                                {formatDate(task.dueDate)}
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-gray-400">
                                {task._count.comments > 0 && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <MessageSquare size={11} /> {task._count.comments}
                                  </span>
                                )}
                                {task._count.subTasks > 0 && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <GitBranch size={11} /> {task._count.subTasks}
                                  </span>
                                )}
                              </div>
                              {task.assignee && (
                                <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Quick add input */}
                    {addingSection === section.id && (
                      <div className="bg-white rounded-xl border border-indigo-200 p-2.5 shadow-sm">
                        <input
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addTask(section.id);
                            if (e.key === "Escape") setAddingSection(null);
                          }}
                          placeholder="Görev başlığı..."
                          className="w-full text-sm outline-none text-gray-800 placeholder-gray-400"
                        />
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => addTask(section.id)}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Ekle
                          </button>
                          <button
                            onClick={() => setAddingSection(null)}
                            className="px-3 py-1 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Add task button */}
              {addingSection !== section.id && (
                <button
                  onClick={() => { setAddingSection(section.id); setNewTaskTitle(""); }}
                  className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors w-full"
                >
                  <Plus size={14} /> Görev ekle
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => {
            setSections((prev) =>
              prev.map((s) => ({
                ...s,
                tasks: s.tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
              }))
            );
            setSelectedTask(updated);
          }}
          onCommentAdded={(taskId) => {
            setSections((prev) =>
              prev.map((section) => ({
                ...section,
                tasks: section.tasks.map((task) =>
                  task.id === taskId
                    ? { ...task, _count: { ...task._count, comments: task._count.comments + 1 } }
                    : task
                ),
              }))
            );
          }}
        />
      )}
    </>
  );
}
