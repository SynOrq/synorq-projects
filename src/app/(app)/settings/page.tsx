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
      _count: {
        select: {
          projects: true,
        },
      },
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
      billing: true,
      integrations: {
        orderBy: { provider: "asc" },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const membership = workspace.members.find((member) => member.userId === userId);
  const currentRole = membership?.role ?? "MEMBER";
  const isOwner = workspace.ownerId === userId;
  const canManageWorkspace = isOwner || currentRole === "ADMIN";
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const workspaceState = await findWorkspaceState({
    workspaceId: workspace.id,
    userId,
    includePreferences: true,
  });
  const [publishedPortalCount, exportCountLast30Days] = await Promise.all([
    db.clientPortal.count({
      where: {
        isPublished: true,
        client: { workspaceId: workspace.id },
      },
    }),
    db.activityLog.count({
      where: {
        workspaceId: workspace.id,
        action: "export.created",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

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
      initialBilling={{
        plan: workspace.billing?.plan ?? "TEAM",
        status: workspace.billing?.status ?? "ACTIVE",
        billingEmail: workspace.billing?.billingEmail ?? workspace.owner.email,
        seatCap: workspace.billing?.seatCap ?? 12,
        allowOverage: workspace.billing?.allowOverage ?? false,
        usageAlertThresholdPct: workspace.billing?.usageAlertThresholdPct ?? 85,
        renewalDate: workspace.billing?.renewalDate ?? null,
      }}
      usageTelemetry={{
        projectCount: workspace._count?.projects ?? 0,
        publishedPortalCount,
        exportCountLast30Days,
      }}
      initialIntegrations={workspace.integrations.map((integration) => ({
        provider: integration.provider,
        status: integration.status,
        label: integration.label,
        config: integration.config as Record<string, unknown> | null,
        lastSyncedAt: integration.lastSyncedAt,
      }))}
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
