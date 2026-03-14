import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeProjects, analyzeTeamLoad, type PortfolioProject } from "@/lib/portfolio";
import { taskCardInclude } from "@/lib/task-detail";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { getActivityDetail, getActivitySeverity, getActivityTitle } from "@/lib/activity";
import ProjectHeader from "@/components/projects/ProjectHeader";
import ProjectDetailConsole from "@/components/projects/ProjectDetailConsole";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

const validTabs = new Set(["overview", "board", "list", "activity", "risks"]);

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const currentTab = validTabs.has(query?.tab ?? "") ? (query?.tab as "overview" | "board" | "list" | "activity" | "risks") : "overview";

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId } } },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, health: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: taskCardInclude,
          },
        },
      },
      activityLogs: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      workspace: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, image: true, email: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const tasks = project.sections.flatMap((section) => section.tasks);
  const analyzedProject = analyzeProjects([
    {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      type: project.type,
      priority: project.priority,
      tags: project.tags,
      startDate: project.startDate,
      dueDate: project.dueDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner,
      client: project.client,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assigneeId: task.assigneeId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        priority: task.priority,
      })),
    } satisfies PortfolioProject,
  ])[0];

  const members = project.workspace.members.map((member) => member.user);
  const teamLoad = analyzeTeamLoad(
    project.workspace.members.map((member) => ({
      id: member.userId,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      role: member.role,
    })),
    analyzedProject.tasks
  ).filter((member) => member.activeTasks > 0 || member.overdueTasks > 0 || member.dueThisWeekTasks > 0);

  const activity = project.activityLogs.map((item) => {
    const actorName = item.user.name ?? item.user.email;
    return {
      id: item.id,
      title: getActivityTitle(item.action),
      detail: getActivityDetail({
        action: item.action,
        metadata: item.metadata,
        actorName,
        projectName: project.name,
      }),
      severity: getActivitySeverity(item.action, item.metadata),
      actorName,
      meta: `${formatRelative(item.createdAt)} • ${formatDateTime(item.createdAt)}`,
    };
  });

  const overdueTasks = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED");
  const unassignedTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED" && !task.assigneeId);
  const blockedTasks = tasks.filter((task) => task.labels.includes("Blocked"));
  const nearDeadlineTasks = tasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE" || task.status === "CANCELLED") return false;
    const diff = new Date(task.dueDate).getTime() - Date.now();
    return diff >= 0 && diff <= 3 * 86400000;
  });

  const risks = [
    ...(project.client?.health === "AT_RISK"
      ? [{
          id: "client-health",
          title: "Client health at risk",
          detail: `${project.client.name} iliski seviyesi riskte gorunuyor ve bu proje icin daha sik durum guncellemesi gerekebilir.`,
          severity: "critical" as const,
          recommendation: "Haftalik status ozetini siklastirin ve onay bekleyen deliverable listesini netlestirin.",
        }]
      : project.client?.health === "WATCH"
        ? [{
            id: "client-watch",
            title: "Client relationship needs monitoring",
            detail: `${project.client.name} proje akisinda watch seviyesinde. Revizyon ve onay donguleri yakindan izlenmeli.`,
            severity: "warning" as const,
            recommendation: "Bir sonraki teslim oncesi paydaslarla risk review notu paylasin.",
          }]
        : []),
    ...(overdueTasks.length > 0
      ? [{
          id: "overdue-tasks",
          title: "Overdue tasks are impacting delivery",
          detail: `${overdueTasks.length} acik gorev teslim tarihini gecmis durumda.`,
          severity: "critical" as const,
          recommendation: "Overdue isleri owner bazli dagitip bugun kapanacak net aksiyon listesi olusturun.",
        }]
      : []),
    ...(unassignedTasks.length > 0
      ? [{
          id: "ownership-gap",
          title: "Ownership gap detected",
          detail: `${unassignedTasks.length} gorev henuz bir kisiye baglanmamis.`,
          severity: "warning" as const,
          recommendation: "Backlog grooming yapip atanmamis isleri owner ve tarihle netlestirin.",
        }]
      : []),
    ...(blockedTasks.length > 0
      ? [{
          id: "blocked-work",
          title: "Blocked work is accumulating",
          detail: `${blockedTasks.length} gorev blocked etiketiyle bekliyor.`,
          severity: "warning" as const,
          recommendation: "Blocker sebeplerini acip ilgili karar sahiplerini ayni akisa cekin.",
        }]
      : []),
    ...(nearDeadlineTasks.length > 0
      ? [{
          id: "deadline-cluster",
          title: "Upcoming deadline cluster",
          detail: `${nearDeadlineTasks.length} gorev sonraki 72 saat icinde teslim bekliyor.`,
          severity: "warning" as const,
          recommendation: "Bu gorevleri tek timeline gorusunde gruplayip review kapasitesini onceden ayirin.",
        }]
      : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        taskCount={tasks.length}
        currentTab={currentTab}
        health={analyzedProject.health}
        openTasks={analyzedProject.openTasks}
        overdueTasks={analyzedProject.overdueTasks}
      />
      <div className="flex-1 overflow-y-auto bg-[#f4f7fb]">
        <ProjectDetailConsole
          currentTab={currentTab}
          project={{
            id: project.id,
            name: project.name,
            dueDate: analyzedProject.dueDateResolved,
          }}
          sections={project.sections}
          members={members}
          tasks={[...tasks].sort((left, right) => {
            const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return leftTime - rightTime || right.updatedAt.getTime() - left.updatedAt.getTime();
          })}
          health={analyzedProject.health}
          metrics={{
            openTasks: analyzedProject.openTasks,
            completedTasks: analyzedProject.completedTasks,
            overdueTasks: analyzedProject.overdueTasks,
            dueThisWeekTasks: analyzedProject.dueThisWeekTasks,
            unassignedTasks: analyzedProject.unassignedTasks,
            completionRate: analyzedProject.completionRate,
          }}
          teamLoad={teamLoad}
          activity={activity}
          risks={risks}
        />
      </div>
    </div>
  );
}
