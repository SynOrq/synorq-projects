import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { redirect } from "next/navigation";
import TeamCapacityConsole from "@/components/members/TeamCapacityConsole";

type MembersPageProps = {
  searchParams?: Promise<{
    member?: string;
  }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const currentUserId = session.user.id;
  const filters = await searchParams;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      projects: {
        select: {
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
              assigneeId: true,
              estimatedH: true,
              loggedH: true,
              labels: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const currentMembership = workspace.members.find((member) => member.userId === currentUserId) ?? null;
  const canManageMembers = workspace.ownerId === currentUserId || currentMembership?.role === "ADMIN";
  const capacity = analyzeTeamCapacity(
    workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      isOwner: member.user.id === workspace.ownerId,
    })),
    workspace.projects.flatMap((project) => project.tasks)
  );

  return (
    <TeamCapacityConsole
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      ownerId={workspace.ownerId}
      currentUserId={currentUserId}
      canManageMembers={canManageMembers}
      initialMembers={workspace.members}
      capacity={capacity}
      spotlightMemberId={filters?.member}
    />
  );
}
