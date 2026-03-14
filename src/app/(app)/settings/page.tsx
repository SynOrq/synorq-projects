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
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const currentRole = workspace.members[0]?.role;
  const canManageWorkspace = workspace.ownerId === userId || currentRole === "ADMIN";
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
        name: workspace.name,
        description: workspace.description,
        logoUrl: workspace.logoUrl,
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
      canManageWorkspace={canManageWorkspace}
      logoutAction={logoutAction}
    />
  );
}
