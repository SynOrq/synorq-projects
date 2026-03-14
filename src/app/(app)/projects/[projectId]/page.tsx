import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskCardInclude } from "@/lib/task-detail";
import { redirect, notFound } from "next/navigation";
import KanbanBoard from "@/components/projects/KanbanBoard";
import ProjectHeader from "@/components/projects/ProjectHeader";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: session.user.id } } },
    },
    include: {
      owner: { select: { name: true, email: true } },
      client: { select: { name: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: taskCardInclude,
          },
        },
      },
    },
  });

  if (!project) notFound();

  const members = await db.workspaceMember.findMany({
    where: { workspace: { projects: { some: { id: projectId } } } },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader project={project} taskCount={project.sections.reduce((acc: number, s: { tasks: unknown[] }) => acc + s.tasks.length, 0)} />
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard
          project={project}
          sections={project.sections}
          members={members.map((m) => m.user)}
        />
      </div>
    </div>
  );
}
