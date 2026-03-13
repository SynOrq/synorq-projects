import type { Task, Project, Section, User, WorkspaceMember, Workspace } from "@prisma/client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export type TaskWithRelations = Task & {
  assignee: User | null;
  creator: User;
  section: Section | null;
  _count?: { comments: number; subTasks: number };
};

export type SectionWithTasks = Section & {
  tasks: TaskWithRelations[];
};

export type ProjectWithSections = Project & {
  sections: SectionWithTasks[];
  _count?: { tasks: number; members?: number };
};

export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & { user: User })[];
  _count?: { projects: number };
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:    { label: "Düşük",  color: "text-slate-500",  bg: "bg-slate-100" },
  MEDIUM: { label: "Orta",   color: "text-blue-600",   bg: "bg-blue-50" },
  HIGH:   { label: "Yüksek", color: "text-orange-600", bg: "bg-orange-50" },
  URGENT: { label: "Acil",   color: "text-red-600",    bg: "bg-red-50" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO:        { label: "Yapılacak",     color: "text-slate-600",  bg: "bg-slate-100" },
  IN_PROGRESS: { label: "Devam Ediyor", color: "text-blue-700",   bg: "bg-blue-100" },
  IN_REVIEW:   { label: "İncelemede",   color: "text-purple-700", bg: "bg-purple-100" },
  DONE:        { label: "Tamamlandı",   color: "text-green-700",  bg: "bg-green-100" },
  CANCELLED:   { label: "İptal",        color: "text-red-600",    bg: "bg-red-100" },
};

export const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];
