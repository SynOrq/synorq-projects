import { db } from "@/lib/db";

type WorkspaceStateRecord = {
  notificationsReadAt: Date | null;
  onboardingDismissedAt?: Date | null;
  riskAlertsEnabled?: boolean;
  activityAlertsEnabled?: boolean;
  weeklyDigestEnabled?: boolean;
  savedProjectsView?: unknown;
  notificationConsoleState?: unknown;
};

type WorkspaceStateDelegate = {
  findUnique: (args: {
    where: {
      workspaceId_userId: {
        workspaceId: string;
        userId: string;
      };
    };
    select: {
      notificationsReadAt?: true;
      onboardingDismissedAt?: true;
      riskAlertsEnabled?: true;
      activityAlertsEnabled?: true;
      weeklyDigestEnabled?: true;
      savedProjectsView?: true;
      notificationConsoleState?: true;
    };
  }) => Promise<WorkspaceStateRecord | null>;
  upsert: (args: {
    where: {
      workspaceId_userId: {
        workspaceId: string;
        userId: string;
      };
    };
    update: {
      notificationsReadAt?: Date | null;
      onboardingDismissedAt?: Date | null;
      riskAlertsEnabled?: boolean;
      activityAlertsEnabled?: boolean;
      weeklyDigestEnabled?: boolean;
      savedProjectsView?: unknown;
      notificationConsoleState?: unknown;
    };
    create: {
      workspaceId: string;
      userId: string;
      notificationsReadAt?: Date | null;
      onboardingDismissedAt?: Date | null;
      riskAlertsEnabled?: boolean;
      activityAlertsEnabled?: boolean;
      weeklyDigestEnabled?: boolean;
      savedProjectsView?: unknown;
      notificationConsoleState?: unknown;
    };
    select: {
      notificationsReadAt?: true;
      onboardingDismissedAt?: true;
      riskAlertsEnabled?: true;
      activityAlertsEnabled?: true;
      weeklyDigestEnabled?: true;
      savedProjectsView?: true;
      notificationConsoleState?: true;
    };
  }) => Promise<WorkspaceStateRecord>;
};

function getWorkspaceStateDelegate() {
  return (db as unknown as { workspaceUserState?: WorkspaceStateDelegate }).workspaceUserState ?? null;
}

export async function findWorkspaceState(params: {
  workspaceId: string;
  userId: string;
  includeOnboarding?: boolean;
  includePreferences?: boolean;
  includeProjectView?: boolean;
  includeNotificationConsole?: boolean;
}) {
  const delegate = getWorkspaceStateDelegate();
  if (!delegate) return null;

  return delegate.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
    },
    select: {
      notificationsReadAt: true,
      ...(params.includeOnboarding ? { onboardingDismissedAt: true } : {}),
      ...(params.includePreferences
        ? {
            riskAlertsEnabled: true,
            activityAlertsEnabled: true,
            weeklyDigestEnabled: true,
          }
        : {}),
      ...(params.includeProjectView ? { savedProjectsView: true } : {}),
      ...(params.includeNotificationConsole ? { notificationConsoleState: true } : {}),
    },
  });
}

export async function upsertWorkspaceState(params: {
  workspaceId: string;
  userId: string;
  updates: {
    notificationsReadAt?: Date | null;
    onboardingDismissedAt?: Date | null;
    riskAlertsEnabled?: boolean;
    activityAlertsEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    savedProjectsView?: unknown;
    notificationConsoleState?: unknown;
  };
}) {
  const delegate = getWorkspaceStateDelegate();
  if (!delegate) return null;

  return delegate.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
    },
    update: params.updates,
    create: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      ...params.updates,
    },
    select: {
      notificationsReadAt: true,
      onboardingDismissedAt: true,
      riskAlertsEnabled: true,
      activityAlertsEnabled: true,
      weeklyDigestEnabled: true,
      savedProjectsView: true,
      notificationConsoleState: true,
    },
  });
}
