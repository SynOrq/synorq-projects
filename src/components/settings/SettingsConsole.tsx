"use client";

import { ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Building2,
  ChevronRight,
  CreditCard,
  Link2,
  KeyRound,
  LogOut,
  Mail,
  PanelsTopLeft,
  Receipt,
  ShieldCheck,
  ShieldPlus,
  User,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  buildWorkspaceBillingSummary,
  WORKSPACE_BILLING_STATUS_OPTIONS,
  WORKSPACE_PLAN_OPTIONS,
} from "@/lib/billing";
import {
  summarizeWorkspaceIntegrations,
  WORKSPACE_INTEGRATION_PROVIDERS,
  WORKSPACE_INTEGRATION_STATUS_OPTIONS,
  WORKSPACE_WEBHOOK_EVENTS,
} from "@/lib/integrations";

type MemberRecord = {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: Date | string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date | string;
  };
};

type TabId = "workspace" | "profile" | "team" | "permissions" | "notifications" | "integrations" | "billing" | "security";

type Props = {
  initialWorkspace: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    createdAt: Date | string;
    owner: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
  initialUser: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  initialPreferences: {
    riskAlertsEnabled: boolean;
    activityAlertsEnabled: boolean;
    weeklyDigestEnabled: boolean;
  };
  initialBilling: {
    plan: "TEAM" | "GROWTH" | "SCALE" | "ENTERPRISE";
    status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    billingEmail: string | null;
    seatCap: number | null;
    allowOverage: boolean;
    usageAlertThresholdPct: number;
    renewalDate: Date | string | null;
  };
  usageTelemetry: {
    projectCount: number;
    publishedPortalCount: number;
    exportCountLast30Days: number;
  };
  initialIntegrations: Array<{
    provider: "SLACK" | "GOOGLE_CALENDAR" | "WEBHOOK" | "API_KEY";
    status: "DISCONNECTED" | "CONNECTED" | "ERROR";
    label: string | null;
    config: Record<string, unknown> | null;
    lastSyncedAt: Date | string | null;
  }>;
  initialMembers: MemberRecord[];
  currentUserId: string;
  currentAccess: {
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    isOwner: boolean;
  };
  canManageWorkspace: boolean;
  canManageMembers: boolean;
  logoutAction: () => Promise<void>;
};

const tabs: Array<{
  id: TabId;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  { id: "workspace", label: "Workspace", description: "Brand, delivery posture", icon: Building2 },
  { id: "profile", label: "Profile", description: "Identity and account", icon: User },
  { id: "team", label: "Team", description: "Members and invites", icon: Users },
  { id: "permissions", label: "Permissions", description: "Roles and access policy", icon: ShieldPlus },
  { id: "notifications", label: "Notifications", description: "Signals and digest rules", icon: BellRing },
  { id: "integrations", label: "Integrations", description: "Sync, hooks and providers", icon: Link2 },
  { id: "billing", label: "Billing", description: "Seats, plan and usage posture", icon: CreditCard },
  { id: "security", label: "Security", description: "Session and audit trail", icon: ShieldCheck },
];

const teamRoleCopy: Record<
  MemberRecord["role"] | "OWNER",
  { label: string; tone: string; description: string }
> = {
  OWNER: {
    label: "Owner",
    tone: "border-slate-900 bg-slate-900 text-white",
    description: "Workspace ownership, billing and governance control.",
  },
  ADMIN: {
    label: "Admin",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-700",
    description: "Can manage workspace settings, members and delivery setup.",
  },
  MEMBER: {
    label: "Member",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    description: "Can operate projects, tasks and execution views.",
  },
  VIEWER: {
    label: "Viewer",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    description: "Read-only access for stakeholders and observers.",
  },
};

const memberRoleOptions = [
  { value: "ADMIN", label: "Yonetici" },
  { value: "MEMBER", label: "Uye" },
  { value: "VIEWER", label: "Izleyici" },
] as const;

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function SettingsConsole({
  initialWorkspace,
  initialUser,
  initialPreferences,
  initialBilling,
  usageTelemetry,
  initialIntegrations,
  initialMembers,
  currentUserId,
  currentAccess,
  canManageWorkspace,
  canManageMembers,
  logoutAction,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("workspace");
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.name);
  const [workspaceDescription, setWorkspaceDescription] = useState(initialWorkspace.description ?? "");
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState(initialWorkspace.logoUrl ?? "");
  const [profileName, setProfileName] = useState(initialUser.name ?? "");
  const [profileImage, setProfileImage] = useState(initialUser.image ?? "");
  const [riskAlertsEnabled, setRiskAlertsEnabled] = useState(initialPreferences.riskAlertsEnabled);
  const [activityAlertsEnabled, setActivityAlertsEnabled] = useState(initialPreferences.activityAlertsEnabled);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(initialPreferences.weeklyDigestEnabled);
  const [billingPlan, setBillingPlan] = useState<Props["initialBilling"]["plan"]>(initialBilling.plan);
  const [billingStatus, setBillingStatus] = useState<Props["initialBilling"]["status"]>(initialBilling.status);
  const [billingEmail, setBillingEmail] = useState(initialBilling.billingEmail ?? "");
  const [seatCap, setSeatCap] = useState(initialBilling.seatCap ? String(initialBilling.seatCap) : "");
  const [allowOverage, setAllowOverage] = useState(initialBilling.allowOverage);
  const [usageAlertThresholdPct, setUsageAlertThresholdPct] = useState(String(initialBilling.usageAlertThresholdPct));
  const [renewalDate, setRenewalDate] = useState(
    initialBilling.renewalDate ? new Date(initialBilling.renewalDate).toISOString().slice(0, 10) : ""
  );
  const [integrations, setIntegrations] = useState<
    Record<
      Props["initialIntegrations"][number]["provider"],
      {
        provider: Props["initialIntegrations"][number]["provider"];
        status: Props["initialIntegrations"][number]["status"];
        label: string;
        config: Record<string, unknown>;
        lastSyncedAt: string;
      }
    >
  >(() => {
    const base = Object.fromEntries(
      WORKSPACE_INTEGRATION_PROVIDERS.map((item) => [
        item.value,
        {
          provider: item.value,
          status: "DISCONNECTED" as const,
          label: "",
          config: {},
          lastSyncedAt: "",
        },
      ])
    ) as Record<
      Props["initialIntegrations"][number]["provider"],
      {
        provider: Props["initialIntegrations"][number]["provider"];
        status: Props["initialIntegrations"][number]["status"];
        label: string;
        config: Record<string, unknown>;
        lastSyncedAt: string;
      }
    >;

    for (const integration of initialIntegrations) {
      base[integration.provider] = {
        provider: integration.provider,
        status: integration.status,
        label: integration.label ?? "",
        config: integration.config ?? {},
        lastSyncedAt: integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toISOString().slice(0, 10) : "",
      };
    }

    return base;
  });
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRecord["role"]>("MEMBER");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPreferencesPending, startPreferencesTransition] = useTransition();
  const [isBillingPending, startBillingTransition] = useTransition();
  const [isIntegrationPending, startIntegrationTransition] = useTransition();
  const [isInvitePending, startInviteTransition] = useTransition();
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [savingIntegrationProvider, setSavingIntegrationProvider] = useState<string | null>(null);

  const teamSummary = useMemo(() => {
    const admins = members.filter((member) => member.role === "ADMIN").length;
    const viewers = members.filter((member) => member.role === "VIEWER").length;

    return {
      total: members.length,
      admins,
      viewers,
    };
  }, [members]);

  const currentMember = members.find((member) => member.userId === currentUserId) ?? null;
  const adminCount = teamSummary.admins + (currentAccess.isOwner ? 1 : 0);
  const billingSummary = useMemo(
    () =>
      buildWorkspaceBillingSummary({
        plan: billingPlan,
        status: billingStatus,
        seatCap: seatCap ? Number(seatCap) : null,
        allowOverage,
        usageAlertThresholdPct: Number(usageAlertThresholdPct) || initialBilling.usageAlertThresholdPct,
        activeMembers: teamSummary.total,
        viewerMembers: teamSummary.viewers,
        adminMembers: adminCount,
        projectCount: usageTelemetry.projectCount,
        publishedPortalCount: usageTelemetry.publishedPortalCount,
        exportCountLast30Days: usageTelemetry.exportCountLast30Days,
        weeklyDigestEnabled,
      }),
    [
      adminCount,
      allowOverage,
      billingPlan,
      billingStatus,
      initialBilling.usageAlertThresholdPct,
      seatCap,
      teamSummary.total,
      teamSummary.viewers,
      usageAlertThresholdPct,
      usageTelemetry.exportCountLast30Days,
      usageTelemetry.projectCount,
      usageTelemetry.publishedPortalCount,
      weeklyDigestEnabled,
    ]
  );
  const integrationSummary = useMemo(
    () =>
      summarizeWorkspaceIntegrations(
        Object.values(integrations).map((integration) => ({
          provider: integration.provider,
          status: integration.status,
          config: integration.config,
        }))
      ),
    [integrations]
  );
  const securitySignals = [
    {
      label: "Current access",
      value: currentAccess.role,
      note: currentAccess.isOwner ? "Workspace ownership active" : "Managed through team role",
    },
    {
      label: "Audit visibility",
      value: "Live",
      note: "Changes flow into Activity and Audit surfaces.",
    },
    {
      label: "Notification posture",
      value: riskAlertsEnabled ? "Risk aware" : "Manual",
      note: weeklyDigestEnabled ? "Weekly summary enabled" : "Digest disabled",
    },
  ];

  function clearMessages(scope: "workspace" | "profile" | "notifications" | "team" | "billing" | "integrations") {
    if (scope === "workspace") {
      setWorkspaceMessage(null);
      setWorkspaceError(null);
      return;
    }
    if (scope === "profile") {
      setProfileMessage(null);
      setProfileError(null);
      return;
    }
    if (scope === "notifications") {
      setPreferencesMessage(null);
      setPreferencesError(null);
      return;
    }
    if (scope === "billing") {
      setBillingMessage(null);
      setBillingError(null);
      return;
    }
    if (scope === "integrations") {
      setIntegrationMessage(null);
      setIntegrationError(null);
      return;
    }
    setTeamMessage(null);
    setTeamError(null);
  }

  function saveWorkspace() {
    startWorkspaceTransition(async () => {
      clearMessages("workspace");

      try {
        const res = await fetch("/api/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workspaceName,
            description: workspaceDescription,
            logoUrl: workspaceLogoUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Workspace ayarlari kaydedilemedi.");
        }

        setWorkspaceName(data.workspace.name);
        setWorkspaceDescription(data.workspace.description ?? "");
        setWorkspaceLogoUrl(data.workspace.logoUrl ?? "");
        setWorkspaceMessage("Workspace kimligi guncellendi.");
        router.refresh();
      } catch (err) {
        setWorkspaceError(err instanceof Error ? err.message : "Workspace ayarlari kaydedilemedi.");
      }
    });
  }

  function saveProfile() {
    startProfileTransition(async () => {
      clearMessages("profile");

      try {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: profileName, image: profileImage }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Profil guncellenemedi.");
        }

        setProfileName(data.user.name ?? "");
        setProfileImage(data.user.image ?? "");
        setProfileMessage("Profil kimligi guncellendi.");
        router.refresh();
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Profil guncellenemedi.");
      }
    });
  }

  function savePreferences() {
    startPreferencesTransition(async () => {
      clearMessages("notifications");

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riskAlertsEnabled,
            activityAlertsEnabled,
            weeklyDigestEnabled,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Bildirim tercihleri guncellenemedi.");
        }

        setRiskAlertsEnabled(data.state.riskAlertsEnabled ?? true);
        setActivityAlertsEnabled(data.state.activityAlertsEnabled ?? true);
        setWeeklyDigestEnabled(data.state.weeklyDigestEnabled ?? false);
        setPreferencesMessage("Bildirim tercihleri kaydedildi.");
        router.refresh();
      } catch (err) {
        setPreferencesError(err instanceof Error ? err.message : "Bildirim tercihleri guncellenemedi.");
      }
    });
  }

  function saveBilling() {
    startBillingTransition(async () => {
      clearMessages("billing");

      try {
        const res = await fetch("/api/workspace/billing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: billingPlan,
            status: billingStatus,
            billingEmail,
            seatCap: seatCap ? Number(seatCap) : null,
            allowOverage,
            usageAlertThresholdPct: Number(usageAlertThresholdPct),
            renewalDate: renewalDate || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Billing ayarlari guncellenemedi.");
        }

        setBillingPlan(data.billing.plan);
        setBillingStatus(data.billing.status);
        setBillingEmail(data.billing.billingEmail ?? "");
        setSeatCap(data.billing.seatCap ? String(data.billing.seatCap) : "");
        setAllowOverage(Boolean(data.billing.allowOverage));
        setUsageAlertThresholdPct(String(data.billing.usageAlertThresholdPct ?? 85));
        setRenewalDate(data.billing.renewalDate ? new Date(data.billing.renewalDate).toISOString().slice(0, 10) : "");
        setBillingMessage("Billing ayarlari kaydedildi.");
        router.refresh();
      } catch (err) {
        setBillingError(err instanceof Error ? err.message : "Billing ayarlari guncellenemedi.");
      }
    });
  }

  function updateIntegration(
    provider: Props["initialIntegrations"][number]["provider"],
    patch: Partial<{
      status: Props["initialIntegrations"][number]["status"];
      label: string;
      config: Record<string, unknown>;
      lastSyncedAt: string;
    }>
  ) {
    setIntegrations((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        ...patch,
        config: {
          ...current[provider].config,
          ...(patch.config ?? {}),
        },
      },
    }));
  }

  function saveIntegration(provider: Props["initialIntegrations"][number]["provider"]) {
    startIntegrationTransition(async () => {
      clearMessages("integrations");
      setSavingIntegrationProvider(provider);

      try {
        const integration = integrations[provider];
        const res = await fetch(`/api/workspace/integrations/${provider.toLowerCase()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: integration.status,
            label: integration.label || null,
            lastSyncedAt: integration.lastSyncedAt || null,
            ...integration.config,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Integration kaydi guncellenemedi.");
        }

        setIntegrations((current) => ({
          ...current,
          [provider]: {
            ...current[provider],
            status: data.integration.status,
            label: data.integration.label ?? "",
            config: (data.integration.config as Record<string, unknown> | null) ?? {},
            lastSyncedAt: data.integration.lastSyncedAt ? new Date(data.integration.lastSyncedAt).toISOString().slice(0, 10) : "",
          },
        }));
        setIntegrationMessage(`${provider} integration ayari kaydedildi.`);
        router.refresh();
      } catch (err) {
        setIntegrationError(err instanceof Error ? err.message : "Integration kaydi guncellenemedi.");
      } finally {
        setSavingIntegrationProvider(null);
      }
    });
  }

  function inviteMember() {
    startInviteTransition(async () => {
      clearMessages("team");
      if (!inviteEmail.trim()) {
        setTeamError("Davet icin bir e-posta girin.");
        return;
      }

      try {
        const res = await fetch("/api/workspace/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: initialWorkspace.id,
            email: inviteEmail,
            role: inviteRole,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Uye daveti gonderilemedi.");
        }

        setMembers((current) => [...current, data.member]);
        setInviteEmail("");
        setInviteRole("MEMBER");
        setTeamMessage(data.message ?? "Uye workspace'e eklendi.");
      } catch (err) {
        setTeamError(err instanceof Error ? err.message : "Uye daveti gonderilemedi.");
      }
    });
  }

  async function updateRole(memberId: string, role: MemberRecord["role"]) {
    setSavingMemberId(memberId);
    clearMessages("team");

    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Rol guncellenemedi.");
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === memberId
            ? {
                ...member,
                role: data.member.role,
              }
            : member
        )
      );
      setTeamMessage("Uye rolu guncellendi.");
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Rol guncellenemedi.");
    } finally {
      setSavingMemberId(null);
    }
  }

  return (
    <div className="min-h-full">
      <div className="p-8">
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 self-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <PanelsTopLeft size={13} />
              Settings Console
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Ayarlar</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Workspace kimligi, ekip erisimi ve bildirim kararlarini tek kontrol yuzeyinde yonetin.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar name={workspaceName} image={workspaceLogoUrl} size="lg" className="rounded-xl" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{workspaceName}</div>
                <div className="truncate text-xs text-slate-500">{initialWorkspace.owner.email}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatPill label="Members" value={String(teamSummary.total)} />
              <StatPill label="Admins" value={String(adminCount)} />
              <StatPill label="Viewers" value={String(teamSummary.viewers)} />
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      active ? "bg-white/12 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{tab.label}</div>
                    <div className={`truncate text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {tab.description}
                    </div>
                  </div>
                  <ChevronRight size={15} className={active ? "text-slate-300" : "text-slate-400"} />
                </button>
              );
            })}
          </nav>

          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Session</div>
            <div className="text-xs leading-6 text-slate-600">Aktif kullanici: {initialUser.email ?? "Bilinmiyor"}</div>
            <div className="mt-4">
              <form action={logoutAction}>
                <Button type="submit" variant="danger" className="w-full">
                  <LogOut size={15} />
                  Cikis yap
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {activeTab === "workspace" && (
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                      <Building2 size={13} />
                      Workspace Identity
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900">Brand ve operating context</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Shell icinde gorunen kimligi ve ekiplerin baglandigi ana tanimi guncelleyin.
                    </p>
                  </div>
                  <Avatar name={workspaceName} image={workspaceLogoUrl} size="lg" className="rounded-xl" />
                </div>

                <div className="mt-6 space-y-4">
                  <Field label="Workspace adi" value={workspaceName} onChange={setWorkspaceName} disabled={!canManageWorkspace || isWorkspacePending} />
                  <TextAreaField
                    label="Workspace aciklamasi"
                    value={workspaceDescription}
                    onChange={setWorkspaceDescription}
                    disabled={!canManageWorkspace || isWorkspacePending}
                    rows={4}
                    placeholder="Ajans veya servis operasyonunuzun neyi yonettigini kisaca anlatin."
                  />
                  <Field
                    label="Logo URL"
                    type="url"
                    value={workspaceLogoUrl}
                    onChange={setWorkspaceLogoUrl}
                    disabled={!canManageWorkspace || isWorkspacePending}
                    placeholder="https://cdn.example.com/workspace-logo.png"
                  />
                </div>

                {!canManageWorkspace && (
                  <Notice tone="warning">Workspace ayarlari sadece owner veya admin tarafindan guncellenebilir.</Notice>
                )}
                {workspaceError && <Notice tone="danger">{workspaceError}</Notice>}
                {workspaceMessage && <Notice tone="success">{workspaceMessage}</Notice>}

                <div className="mt-5">
                  <Button onClick={saveWorkspace} loading={isWorkspacePending} disabled={!canManageWorkspace}>
                    Degisiklikleri kaydet
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Operating snapshot</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SnapshotCard label="Owner" value={initialWorkspace.owner.name ?? "Workspace owner"} note={initialWorkspace.owner.email} />
                    <SnapshotCard label="Created" value={formatDate(initialWorkspace.createdAt)} note="Workspace start date" />
                    <SnapshotCard label="Team access" value={`${teamSummary.total} active`} note={`${teamSummary.viewers} viewer seat`} />
                    <SnapshotCard
                      label="Notification mode"
                      value={riskAlertsEnabled ? "Risk aware" : "Manual"}
                      note={activityAlertsEnabled ? "Activity stream open" : "Activity stream limited"}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                  <div className="text-sm font-semibold text-white">Governance shortcut</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Workspace degisikliklerini Activity ve Audit timeline icinden izleyin.
                  </p>
                  <div className="mt-4">
                    <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                      <a href="/audit">Audit console</a>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "profile" && (
            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar name={profileName || initialUser.email} image={profileImage} size="lg" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Profile identity</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Avatar ve isim, task kartlari, comment akisi ve audit timeline icinde kullanilir.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <Field label="Adiniz" value={profileName} onChange={setProfileName} disabled={isProfilePending} />
                  <Field
                    label="Avatar URL"
                    type="url"
                    value={profileImage}
                    onChange={setProfileImage}
                    disabled={isProfilePending}
                    placeholder="https://cdn.example.com/avatar.png"
                  />
                  <Field label="E-posta" value={initialUser.email ?? ""} onChange={() => undefined} disabled type="email" />
                </div>

                {profileError && <Notice tone="danger">{profileError}</Notice>}
                {profileMessage && <Notice tone="success">{profileMessage}</Notice>}

                <div className="mt-5">
                  <Button onClick={saveProfile} loading={isProfilePending} className="bg-emerald-600 hover:bg-emerald-700">
                    Profili guncelle
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Account snapshot</div>
                  <div className="mt-4 space-y-3">
                    <SnapshotCard label="Primary email" value={initialUser.email ?? "-"} note="Credential identity" />
                    <SnapshotCard
                      label="Workspace role"
                      value={currentAccess.role}
                      note={currentAccess.isOwner ? "Ownership access active" : "Inherited from team permissions"}
                    />
                    <SnapshotCard
                      label="Joined platform"
                      value={currentMember ? formatDate(currentMember.user.createdAt) : "-"}
                      note="User account creation date"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Identity usage</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Profil guncellemesi sonraki route yenilemesinde board kartlari, comments ve activity timeline icine yansir.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === "team" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Total members" value={String(teamSummary.total)} note="Active workspace seats" />
                <MetricCard label="Admins" value={String(adminCount)} note="Can manage settings" />
                <MetricCard label="Viewers" value={String(teamSummary.viewers)} note="Read-only observers" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <UserPlus size={18} className="text-indigo-600" />
                    Team invite
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ilk surumde davet akisi mevcut kayitli kullaniciyi workspace&apos;e ekler.
                  </p>

                  <div className="mt-6 space-y-4">
                    <Field
                      label="E-posta"
                      type="email"
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      disabled={!canManageMembers || isInvitePending}
                      placeholder="ornek@firma.com"
                    />

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Rol</label>
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as MemberRecord["role"])}
                        disabled={!canManageMembers || isInvitePending}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {memberRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={inviteMember} loading={isInvitePending} disabled={!canManageMembers}>
                      <UserPlus size={15} />
                      Davet et
                    </Button>
                  </div>

                  {!canManageMembers && <Notice tone="warning">Uye daveti ve rol yonetimi icin yonetici yetkisi gerekir.</Notice>}
                  {teamError && <Notice tone="danger">{teamError}</Notice>}
                  {teamMessage && <Notice tone="success">{teamMessage}</Notice>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Role matrix</h2>
                      <p className="mt-1 text-sm text-slate-500">Uyeleri goruntuleyin, rol degistirin ve sahipligi koruyun.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {members.length} kayit
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500">
                      <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Kullanici</th>
                          <th className="px-6 py-4 font-semibold">Rol</th>
                          <th className="hidden px-6 py-4 font-semibold md:table-cell">Katilim</th>
                          <th className="px-6 py-4 text-right font-semibold">Aksiyon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((member) => {
                          const isSelf = member.user.id === currentUserId;
                          const isOwner = member.user.id === initialWorkspace.owner.id;
                          const canEdit = canManageMembers && !isSelf && !isOwner;
                          const roleConfig = teamRoleCopy[isOwner ? "OWNER" : member.role];

                          return (
                            <tr key={member.id} className="transition-colors hover:bg-slate-50/70">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar name={member.user.name ?? member.user.email} image={member.user.image} size="sm" />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-900">
                                      {member.user.name ?? "Kullanici"}
                                      {isOwner && (
                                        <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                          Owner
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1 truncate text-slate-400">
                                      <Mail size={12} />
                                      {member.user.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${roleConfig.tone}`}>
                                  {roleConfig.label}
                                </span>
                              </td>
                              <td className="hidden whitespace-nowrap px-6 py-4 md:table-cell">{formatDate(member.joinedAt)}</td>
                              <td className="px-6 py-4 text-right">
                                {canEdit ? (
                                  <select
                                    value={member.role}
                                    disabled={savingMemberId === member.id}
                                    onChange={(event) => updateRole(member.id, event.target.value as MemberRecord["role"])}
                                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed"
                                  >
                                    {memberRoleOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs font-medium text-slate-300">
                                    {isOwner ? "Sahip" : isSelf ? "Siz" : "Kilitli"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                  <KeyRound size={13} />
                  Access Model
                </div>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">Role-based access policy</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Synorq v1 icin yetki modeli workspace rolune dayanir. Ayarlar, ekip yonetimi ve governance owner/admin katmaninda tutulur.
                </p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const).map((roleKey) => (
                    <div key={roleKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${teamRoleCopy[roleKey].tone}`}>
                        {teamRoleCopy[roleKey].label}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{teamRoleCopy[roleKey].description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Current role"
                  value={currentAccess.role}
                  note={currentAccess.isOwner ? "Ownership privileges active" : "Inherited from role matrix"}
                />
                <MetricCard label="Workspace control" value={canManageWorkspace ? "Enabled" : "Limited"} note="Brand and delivery settings" />
                <MetricCard label="Member control" value={canManageMembers ? "Enabled" : "Limited"} note="Invite and role changes" />
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  <BellRing size={13} />
                  Signal Rules
                </div>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">Notification posture</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Risk, activity ve digest sinyallerini bildirim merkezi ile uyumlu sekilde yonetin.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      label: "Teslim riski alarmlari",
                      description: "Geciken gorevler, health dususleri ve kritik aksiyonlar Action Required akisina duser.",
                      checked: riskAlertsEnabled,
                      onChange: setRiskAlertsEnabled,
                    },
                    {
                      label: "Activity feed gorunurlugu",
                      description: "Yorumlar, task hareketleri ve ekip aksiyonlari Activity timeline icinde gosterilir.",
                      checked: activityAlertsEnabled,
                      onChange: setActivityAlertsEnabled,
                    },
                    {
                      label: "Weekly digest",
                      description: "Haftalik durum raporu ve ozet iletileri icin tercih aktif edilir.",
                      checked: weeklyDigestEnabled,
                      onChange: setWeeklyDigestEnabled,
                    },
                  ].map((item) => (
                    <label key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) => item.onChange(event.target.checked)}
                        disabled={isPreferencesPending}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                        <div className="mt-1 text-xs leading-6 text-slate-500">{item.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {preferencesError && <Notice tone="danger">{preferencesError}</Notice>}
                {preferencesMessage && <Notice tone="success">{preferencesMessage}</Notice>}

                <div className="mt-5">
                  <Button onClick={savePreferences} loading={isPreferencesPending} variant="outline">
                    Tercihleri kaydet
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Signal routing</div>
                  <div className="mt-4 space-y-3">
                    <SnapshotCard label="Action Required" value={riskAlertsEnabled ? "Enabled" : "Muted"} note="Critical delivery issues and mentions" />
                    <SnapshotCard label="Activity" value={activityAlertsEnabled ? "Enabled" : "Muted"} note="Comments, moves and collaboration events" />
                    <SnapshotCard label="Digest" value={weeklyDigestEnabled ? "Enabled" : "Disabled"} note="Weekly summary and reporting cadence" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Notification surfaces</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Bu tercihler notification center, dashboard signal kartlari ve activity timeline ile birlikte calisir.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                    <Link2 size={13} />
                    Integration readiness
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Delivery stack connection posture</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Slack, Calendar, webhook ve API key baglantilari workspace seviyesinde burada kaydedilir. Bu katman
                    governance ve routing kararlarini persisted hale getirir.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <SnapshotCard label="Connected" value={String(integrationSummary.connected)} note="Aktif provider baglantisi" />
                    <SnapshotCard label="Configured" value={String(integrationSummary.configured)} note="Draft veya live integration kaydi" />
                    <SnapshotCard label="Errors" value={String(integrationSummary.errors)} note="Attention isteyen provider" />
                  </div>

                  <div className="mt-6 space-y-4">
                    {WORKSPACE_INTEGRATION_PROVIDERS.map((provider) => {
                      const integration = integrations[provider.value];
                      const webhookEvents = Array.isArray(integration.config.events)
                        ? (integration.config.events as string[])
                        : [];

                      return (
                        <div key={provider.value} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                {provider.value === "WEBHOOK" ? <Webhook size={16} className="text-cyan-600" /> : <Link2 size={16} className="text-cyan-600" />}
                                {provider.label}
                              </div>
                              <div className="mt-1 text-xs leading-6 text-slate-500">{provider.note}</div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => saveIntegration(provider.value)}
                              loading={isIntegrationPending && savingIntegrationProvider === provider.value}
                              disabled={!canManageWorkspace}
                            >
                              Kaydet
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-700">Status</label>
                              <select
                                value={integration.status}
                                onChange={(event) =>
                                  updateIntegration(provider.value, {
                                    status: event.target.value as Props["initialIntegrations"][number]["status"],
                                  })
                                }
                                disabled={!canManageWorkspace || isIntegrationPending}
                                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                              >
                                {WORKSPACE_INTEGRATION_STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Field
                              label="Label"
                              value={integration.label}
                              onChange={(value) => updateIntegration(provider.value, { label: value })}
                              disabled={!canManageWorkspace || isIntegrationPending}
                              placeholder={`${provider.label} workspace config`}
                            />
                            <Field
                              label="Last sync"
                              type="date"
                              value={integration.lastSyncedAt}
                              onChange={(value) => updateIntegration(provider.value, { lastSyncedAt: value })}
                              disabled={!canManageWorkspace || isIntegrationPending}
                            />
                            {provider.value === "SLACK" && (
                              <Field
                                label="Channel"
                                value={String(integration.config.channel ?? "")}
                                onChange={(value) => updateIntegration(provider.value, { config: { channel: value } })}
                                disabled={!canManageWorkspace || isIntegrationPending}
                                placeholder="#delivery-alerts"
                              />
                            )}
                            {provider.value === "GOOGLE_CALENDAR" && (
                              <>
                                <Field
                                  label="Calendar ID"
                                  value={String(integration.config.calendarId ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { calendarId: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="team@group.calendar.google.com"
                                />
                                <Field
                                  label="Sync window"
                                  type="number"
                                  value={String(integration.config.syncWindowDays ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { syncWindowDays: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="21"
                                />
                              </>
                            )}
                            {provider.value === "WEBHOOK" && (
                              <>
                                <Field
                                  label="Endpoint"
                                  type="url"
                                  value={String(integration.config.endpoint ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { endpoint: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="https://hooks.example.com/synorq"
                                />
                                <Field
                                  label="Secret preview"
                                  value={String(integration.config.secretPreview ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { secretPreview: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="whsec_****"
                                />
                                <div className="sm:col-span-2 space-y-2">
                                  <div className="text-sm font-medium text-slate-700">Events</div>
                                  <div className="flex flex-wrap gap-2">
                                    {WORKSPACE_WEBHOOK_EVENTS.map((eventName) => (
                                      <label key={eventName} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                        <input
                                          type="checkbox"
                                          checked={webhookEvents.includes(eventName)}
                                          onChange={(event) =>
                                            updateIntegration(provider.value, {
                                              config: {
                                                events: event.target.checked
                                                  ? [...webhookEvents, eventName]
                                                  : webhookEvents.filter((item) => item !== eventName),
                                              },
                                            })
                                          }
                                          disabled={!canManageWorkspace || isIntegrationPending}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {eventName}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                            {provider.value === "API_KEY" && (
                              <>
                                <Field
                                  label="Key name"
                                  value={String(integration.config.keyName ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { keyName: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="automation-bot"
                                />
                                <Field
                                  label="Secret preview"
                                  value={String(integration.config.secretPreview ?? "")}
                                  onChange={(value) => updateIntegration(provider.value, { config: { secretPreview: value } })}
                                  disabled={!canManageWorkspace || isIntegrationPending}
                                  placeholder="sk_live_****"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!canManageWorkspace && <Notice tone="warning">Integration ayarlari sadece owner veya admin tarafindan guncellenebilir.</Notice>}
                  {integrationError && <Notice tone="danger">{integrationError}</Notice>}
                  {integrationMessage && <Notice tone="success">{integrationMessage}</Notice>}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Integration guardrails</div>
                    <div className="mt-4 space-y-3">
                      <SnapshotCard label="Notification source" value="Workspace state" note="Rule toggles Settings ve Notification Console ile ortak calisir." />
                      <SnapshotCard label="Audit trace" value="Required" note="Her integration mutasyonu activity ve audit timeline'a duser." />
                      <SnapshotCard label="Access model" value={canManageWorkspace ? "Admin-managed" : "Restricted"} note="Baglanti aktivasyonu owner/admin katmaninda tutulur." />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                    <div className="text-sm font-semibold text-white">Integration posture</div>
                    <div className="mt-5 grid gap-3 text-sm text-slate-200">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        Slack ve Calendar baglantilari status + target config ile persisted tutulur.
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        Webhook olay secimi `workspace.billing_updated` dahil normalized event kontratini kullanir.
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        API key layer secret preview ve label ile automation entry point olarak modellenir.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    <CreditCard size={13} />
                    Billing posture
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Seat, plan ve usage kontrol katmani</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Workspace plani, seat cap ve usage threshold kararlari burada tutulur. Bu katman owner/admin tarafinda
                    commercial guardrail olarak calisir.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Plan</label>
                      <select
                        value={billingPlan}
                        onChange={(event) => setBillingPlan(event.target.value as Props["initialBilling"]["plan"])}
                        disabled={!canManageWorkspace || isBillingPending}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        {WORKSPACE_PLAN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Billing status</label>
                      <select
                        value={billingStatus}
                        onChange={(event) => setBillingStatus(event.target.value as Props["initialBilling"]["status"])}
                        disabled={!canManageWorkspace || isBillingPending}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        {WORKSPACE_BILLING_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field
                      label="Billing email"
                      type="email"
                      value={billingEmail}
                      onChange={setBillingEmail}
                      disabled={!canManageWorkspace || isBillingPending}
                      placeholder="finance@company.com"
                    />
                    <Field
                      label="Renewal date"
                      type="date"
                      value={renewalDate}
                      onChange={setRenewalDate}
                      disabled={!canManageWorkspace || isBillingPending}
                    />
                    <Field
                      label="Seat cap"
                      type="number"
                      value={seatCap}
                      onChange={setSeatCap}
                      disabled={!canManageWorkspace || isBillingPending}
                      placeholder="12"
                    />
                    <Field
                      label="Usage alert threshold %"
                      type="number"
                      value={usageAlertThresholdPct}
                      onChange={setUsageAlertThresholdPct}
                      disabled={!canManageWorkspace || isBillingPending}
                      placeholder="85"
                    />
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Receipt size={16} className="text-emerald-600" />
                      Usage guardrails
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                        <input
                          type="checkbox"
                          checked={allowOverage}
                          onChange={(event) => setAllowOverage(event.target.checked)}
                          disabled={!canManageWorkspace || isBillingPending}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Allow seat overage</div>
                          <div className="mt-1 text-xs leading-6 text-slate-500">
                            Seat cap asildiginda workspace davet akisini bloklamak yerine overage sinyali uret.
                          </div>
                        </div>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SnapshotCard label="Active seats" value={`${billingSummary.metrics.activeMembers}`} note={`${billingSummary.metrics.viewerMembers} viewer, ${billingSummary.metrics.elevatedSeats} elevated`} />
                        <SnapshotCard label="Seat usage" value={seatCap ? `%${billingSummary.metrics.seatUsagePct}` : "Uncapped"} note={seatCap ? `${billingSummary.metrics.overageSeats} overage` : "Seat limiti tanimsiz"} />
                        <SnapshotCard label="Published portals" value={String(billingSummary.metrics.publishedPortalCount)} note="Client-facing share surface" />
                        <SnapshotCard label="Exports 30d" value={String(billingSummary.metrics.exportCountLast30Days)} note="Audit/export usage footprint" />
                      </div>
                    </div>
                  </div>

                  {!canManageWorkspace && <Notice tone="warning">Billing ayarlari sadece owner veya admin tarafindan guncellenebilir.</Notice>}
                  {billingError && <Notice tone="danger">{billingError}</Notice>}
                  {billingMessage && <Notice tone="success">{billingMessage}</Notice>}

                  <div className="mt-5">
                    <Button onClick={saveBilling} loading={isBillingPending} disabled={!canManageWorkspace}>
                      Billing ayarlarini kaydet
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Commercial checkpoints</div>
                    <div className="mt-4 space-y-3">
                      <SnapshotCard label="Plan posture" value={billingPlan} note={billingStatus === "PAST_DUE" ? "Collection attention gerekiyor." : "Workspace commercial state kayitli."} />
                      <SnapshotCard label="Usage state" value={billingSummary.flags.alertState} note={billingSummary.guidance} />
                      <SnapshotCard label="Seat control" value={seatCap ? `${teamSummary.total}/${seatCap}` : "Open"} note={billingSummary.flags.overageBlocked ? "Overage bloklu" : allowOverage ? "Overage izinli" : "Cap enforced"} />
                      <SnapshotCard label="Owner authority" value={currentAccess.isOwner ? "Active" : "Owner-led"} note="Plan ve invoice mutasyonlari owner seviyesinde tutulur." />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                    <div className="text-sm font-semibold text-white">Usage signals</div>
                    <div className="mt-5 grid gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        {billingSummary.metrics.projectCount} aktif proje plan kapasitesiyle ayni workspace posture icinde izleniyor.
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        Weekly digest {billingSummary.flags.weeklyDigestEnabled ? "aktif" : "kapali"}; reporting load billing usage yorumuna dahil ediliyor.
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        Threshold %{
                          Number(usageAlertThresholdPct) || initialBilling.usageAlertThresholdPct
                        } seviyesinde; seat kullanimi buna gore warning state uretir.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {securitySignals.map((signal) => (
                  <MetricCard key={signal.label} label={signal.label} value={signal.value} note={signal.note} />
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-700">
                    <ShieldCheck size={13} />
                    Governance
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Session and audit controls</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Mevcut rolu, oturum kimligini ve governance yuzeylerini kontrol edin.
                  </p>

                  <div className="mt-6 space-y-3">
                    <SnapshotCard label="Signed in as" value={initialUser.email ?? "-"} note="Credential session identity" />
                    <SnapshotCard label="Workspace owner" value={initialWorkspace.owner.name ?? "Owner"} note={initialWorkspace.owner.email} />
                    <SnapshotCard
                      label="Team policy"
                      value={canManageMembers ? "Managed" : "Restricted"}
                      note={canManageMembers ? "You can edit roles and invites." : "Role changes require admin access."}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild variant="outline">
                      <a href="/audit">Audit timeline</a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="/notifications">Notification center</a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                  <div className="text-sm font-semibold text-white">Security posture</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Synorq v1 guvenlik katmani auditability, role governance ve controlled workspace mutation pattern&apos;i uzerine kuruludur.
                  </p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-200">
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Workspace update aksiyonlari activity log kaydi olusturur.
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Team rol degisiklikleri audit timeline icinde severity ile izlenir.
                    </li>
                    <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      Bildirim tercihleri workspace user state uzerinden tutulur.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{note}</div>
    </div>
  );
}

function SnapshotCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "warning" | "danger" }) {
  const toneMap = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
  } as const;

  return <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${toneMap[tone]}`}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
