import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { findWorkspaceState } from "@/lib/workspace-state";
import { redirect } from "next/navigation";
import SettingsConsole from "@/components/settings/SettingsConsole";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ joinedAt: "asc" }],
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const membership = workspace.members.find((member) => member.userId === userId);
  const currentRole = membership?.role ?? "MEMBER";
  const isOwner = workspace.ownerId === userId;
  const canManageWorkspace = isOwner || currentRole === "ADMIN";
  const workspaceState = await findWorkspaceState({
    workspaceId: workspace.id,
    userId,
    includePreferences: true,
  });

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/auth/login" });
  }

  return (
    <SettingsConsole
      initialWorkspace={{
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        logoUrl: workspace.logoUrl,
        createdAt: workspace.createdAt,
        owner: workspace.owner,
      }}
      initialUser={{
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
      }}
      initialPreferences={{
        riskAlertsEnabled: workspaceState?.riskAlertsEnabled ?? true,
        activityAlertsEnabled: workspaceState?.activityAlertsEnabled ?? true,
        weeklyDigestEnabled: workspaceState?.weeklyDigestEnabled ?? false,
      }}
      initialMembers={workspace.members}
      currentUserId={userId}
      currentAccess={{
        role: isOwner ? "OWNER" : currentRole,
        isOwner,
      }}
      canManageWorkspace={canManageWorkspace}
      canManageMembers={canManageWorkspace}
      logoutAction={logoutAction}
    />
  );
}
