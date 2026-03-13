import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import MembersManagement from "@/components/members/MembersManagement";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const currentUserId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const currentMembership = workspace.members.find((member) => member.userId === currentUserId) ?? null;
  const canManageMembers = workspace.ownerId === currentUserId || currentMembership?.role === "ADMIN";

  return (
    <MembersManagement
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      ownerId={workspace.ownerId}
      currentUserId={currentUserId}
      canManageMembers={canManageMembers}
      initialMembers={workspace.members}
    />
  );
}
