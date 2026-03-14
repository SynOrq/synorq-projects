import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ProjectCreateWizard from "@/components/projects/ProjectCreateWizard";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      clients: {
        select: {
          id: true,
          name: true,
          health: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  return (
    <ProjectCreateWizard
      members={workspace.members.map((member) => ({
        id: member.user.id,
        name: member.user.name ?? member.user.email,
        email: member.user.email,
        role: member.role,
      }))}
      clients={workspace.clients}
    />
  );
}
