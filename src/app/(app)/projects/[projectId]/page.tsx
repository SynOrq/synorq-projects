import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/project-access";
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

const validTabs = new Set(["overview", "board", "list", "timeline", "files", "activity", "risks", "settings"]);

const riskLevelWeight = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const currentTab = validTabs.has(query?.tab ?? "")
    ? (query?.tab as "overview" | "board" | "list" | "timeline" | "files" | "activity" | "risks" | "settings")
    : "overview";

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
      milestones: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      risks: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
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
          clients: {
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
          members: {
            include: { user: { select: { id: true, name: true, image: true, email: true } } },
          },
        },
      },
      tasks: {
        where: {
          attachments: { some: {} },
        },
        select: {
          id: true,
          title: true,
          section: { select: { name: true } },
          attachments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              url: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!project) notFound();
  const currentMembership = project.workspace.members.find((member) => member.userId === userId);
  if (
    !currentMembership ||
    !canAccessProject({
      visibility: project.visibility,
      workspaceRole: currentMembership.role,
      isWorkspaceOwner: project.workspace.ownerId === userId,
      isProjectOwner: project.ownerId === userId,
    })
  ) {
    notFound();
  }

  const tasks = project.sections.flatMap((section) => section.tasks);
  const analyzedProject = analyzeProjects([
    {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      type: project.type,
      visibility: project.visibility,
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
      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        dueDate: milestone.dueDate,
        tasks: milestone.tasks.map((task) => ({
          id: task.id,
          status: task.status,
        })),
      })),
      risks: project.risks.map((risk) => ({
        id: risk.id,
        status: risk.status,
        impact: risk.impact,
        likelihood: risk.likelihood,
        dueDate: risk.dueDate,
      })),
    } satisfies PortfolioProject,
  ])[0];

  const members = project.workspace.members.map((member) => member.user);
  const ownerOptions = project.workspace.members.map((member) => ({
    value: member.userId,
    label: member.user.name ?? member.user.email,
  }));
  const clientOptions = [
    { value: "", label: "Internal / no client" },
    ...project.workspace.clients.map((client) => ({
      value: client.id,
      label: client.name,
    })),
  ];
  const sortedTasks = [...tasks].sort((left, right) => {
    const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || right.updatedAt.getTime() - left.updatedAt.getTime();
  });
  const taskOptions = sortedTasks.map((task) => ({
    value: task.id,
    label: task.title,
  }));
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

  const milestones = project.milestones.map((milestone) => {
    const milestoneTaskCount = milestone.tasks.length;
    const completedTaskCount = milestone.tasks.filter((task) => task.status === "DONE").length;
    const progress = milestoneTaskCount === 0 ? (milestone.status === "COMPLETED" ? 100 : 0) : Math.round((completedTaskCount / milestoneTaskCount) * 100);

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      dueDate: milestone.dueDate,
      ownerId: milestone.ownerId,
      ownerName: milestone.owner?.name ?? milestone.owner?.email ?? "Owner tanimsiz",
      taskCount: milestoneTaskCount,
      completedTaskCount,
      progress,
      taskIds: milestone.tasks.map((task) => task.id),
    };
  });

  const risks = [
    ...project.risks.map((risk) => {
      const riskWeight = riskLevelWeight[risk.impact] + riskLevelWeight[risk.likelihood];
      return {
        id: risk.id,
        title: risk.title,
        detail: risk.description ?? "Bu risk kaydi icin ek aciklama girilmedi.",
        severity: riskWeight >= 6 || risk.impact === "CRITICAL" || risk.likelihood === "CRITICAL" ? ("critical" as const) : ("warning" as const),
        recommendation: risk.mitigationPlan ?? "Mitigation plani eklenmedi.",
        status: risk.status,
        ownerName: risk.owner?.name ?? risk.owner?.email ?? "Owner tanimsiz",
        ownerId: risk.ownerId,
        dueDate: risk.dueDate,
        taskTitle: risk.task?.title ?? null,
        taskId: risk.taskId,
        impact: risk.impact,
        likelihood: risk.likelihood,
      };
    }),
    ...(project.risks.length === 0 && project.client?.health === "AT_RISK"
      ? [{
          id: "client-health",
          title: "Client health at risk",
          detail: `${project.client.name} iliski seviyesi riskte gorunuyor ve bu proje icin daha sik durum guncellemesi gerekebilir.`,
          severity: "critical" as const,
          recommendation: "Haftalik status ozetini siklastirin ve onay bekleyen deliverable listesini netlestirin.",
          status: "OPEN",
          ownerName: project.owner?.name ?? project.owner?.email ?? "Owner tanimsiz",
          ownerId: project.ownerId,
          dueDate: project.dueDate,
          taskTitle: null,
          taskId: null,
          impact: "CRITICAL",
          likelihood: "HIGH",
        }]
      : []),
  ];

  const files = project.tasks
    .flatMap((task) =>
      task.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        createdAt: attachment.createdAt,
        taskId: task.id,
        taskTitle: task.title,
        sectionName: task.section?.name ?? null,
      }))
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

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
            description: project.description,
            color: project.color,
            status: project.status,
            type: project.type,
            visibility: project.visibility,
            priority: project.priority,
            ownerId: project.ownerId,
            clientId: project.clientId,
            tags: project.tags,
            startDate: project.startDate,
            dueDate: analyzedProject.dueDateResolved,
          }}
          sections={project.sections}
          members={members}
          tasks={sortedTasks}
          health={{
            ...analyzedProject.health,
            factors: analyzedProject.healthFactors,
            strategy: analyzedProject.healthStrategy,
          }}
          metrics={{
            openTasks: analyzedProject.openTasks,
            completedTasks: analyzedProject.completedTasks,
            overdueTasks: analyzedProject.overdueTasks,
            dueThisWeekTasks: analyzedProject.dueThisWeekTasks,
            unassignedTasks: analyzedProject.unassignedTasks,
            completionRate: analyzedProject.completionRate,
          }}
          milestones={milestones}
          teamLoad={teamLoad}
          activity={activity}
          risks={risks}
          files={files}
          ownerOptions={ownerOptions}
          clientOptions={clientOptions}
          taskOptions={taskOptions}
        />
      </div>
    </div>
  );
}
