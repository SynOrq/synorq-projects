import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, FolderKanban, Gauge, Rocket, Settings, Users, WandSparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDemoWorkspaceState, buildOnboardingChecklist } from "@/lib/onboarding";
import { filterAccessibleProjects } from "@/lib/project-access";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { normalizeSavedProjectsView } from "@/lib/projects-saved-view";
import { findWorkspaceState } from "@/lib/workspace-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, projects: true } },
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");
  const currentMembership = workspace.members.find((member) => member.userId === userId);
  if (!currentMembership) redirect("/auth/login");

  const [taskCount, workspaceState, activityCount, projectsRaw] = await Promise.all([
    db.task.count({
      where: {
        project: { workspaceId: workspace.id },
      },
    }),
    findWorkspaceState({
      workspaceId: workspace.id,
      userId,
      includeOnboarding: true,
      includePreferences: true,
      includeProjectView: true,
    }),
    db.activityLog.count({
      where: { workspaceId: workspace.id },
    }),
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, health: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            completedAt: true,
            assigneeId: true,
            createdAt: true,
            updatedAt: true,
            priority: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            tasks: { select: { id: true, status: true } },
          },
        },
        risks: {
          select: {
            id: true,
            status: true,
            impact: true,
            likelihood: true,
            dueDate: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });
  const accessibleProjectCount = accessibleProjectsRaw.length;
  const analyzedProjects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[]);
  const demoState = buildDemoWorkspaceState({
    workspaceName: workspace.name,
    projectCount: accessibleProjectCount,
    memberCount: workspace._count.members,
    taskCount,
    activityCount,
    riskProjectCount: analyzedProjects.filter((project) => project.health.key === "risk").length,
    overdueTaskCount: analyzedProjects.reduce((sum, project) => sum + project.overdueTasks, 0),
    openRiskCount: analyzedProjects.reduce((sum, project) => sum + project.openRisks, 0),
    criticalMilestoneCount: analyzedProjects.reduce(
      (sum, project) => sum + (project.milestones ?? []).filter((milestone) => milestone.status === "AT_RISK").length,
      0
    ),
    weeklyDigestEnabled: workspaceState?.weeklyDigestEnabled ?? false,
  });

  const onboarding = buildOnboardingChecklist({
    hasProfileIdentity: Boolean(session.user.name) && Boolean(session.user.image),
    hasWorkspace: true,
    hasWorkspaceBrand: Boolean(workspace.logoUrl),
    projectCount: accessibleProjectCount,
    memberCount: workspace._count.members,
    taskCount,
    reportsReady: accessibleProjectCount > 0,
    weeklyDigestEnabled: workspaceState?.weeklyDigestEnabled ?? false,
    hasSavedProjectView: Boolean(normalizeSavedProjectsView(workspaceState?.savedProjectsView ?? null).data),
  });

  const starterActions = [
    {
      title: "Ilk proje wizard",
      detail: "Template tabanli proje olustur ve starter task setini ac.",
      href: "/projects/new",
      icon: FolderKanban,
    },
    {
      title: "Team capacity",
      detail: "Ilk ekip rol dagilimini ve kapasite sinyallerini kur.",
      href: "/members",
      icon: Users,
    },
    {
      title: "Reports surface",
      detail: "Executive summary ve weekly digest posture'unu kontrol et.",
      href: "/reports",
      icon: Rocket,
    },
    {
      title: "Workspace settings",
      detail: "Logo, notification rules ve profile kimligini tamamla.",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-full">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <WandSparkles size={13} />
              Smart Onboarding
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Synorq execution OS kurulumunu adim adim tamamlayin.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Bu yuzey, workspace markasi, ekip setup&apos;i, proje akisi ve reporting posture&apos;unu tek setup hub icinde toplar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kurulum ilerleme</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">%{onboarding.progress}</div>
              <div className="mt-1 text-xs text-slate-500">
                {onboarding.completed}/{onboarding.total} adim tamam
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sonraki adim</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{onboarding.nextItem?.label ?? "Kurulum tamamlandi"}</div>
              <div className="mt-1 text-xs text-slate-500">{onboarding.nextItem?.description ?? "Tum temel adimlar hazir."}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">Guided checklist</h2>
            </div>
            <div className="p-5 space-y-3">
              {onboarding.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold ${
                            item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {item.done ? "✓" : index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                          <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.done ? "Tamam" : "Siradaki is"}
                      </span>
                      <Button asChild size="sm" variant={item.done ? "outline" : "default"}>
                        <Link href={item.href}>
                          {item.cta}
                          <ArrowRight size={13} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">Demo workspace state</h2>
                </div>
                <Badge variant={demoState.tone === "thin" ? "warning" : demoState.tone === "active" ? "success" : "secondary"}>
                  {demoState.tone === "thin" ? "Thin shell" : demoState.tone === "active" ? "Demo ready" : "Stable"}
                </Badge>
              </div>
              <div className="p-5">
                <p className="text-sm leading-7 text-slate-600">{demoState.description}</p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{demoState.headline}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Demo etkisi icin hedef: en az 3 proje, 10+ task, 6+ activity ve gozle gorulur risk/ritim sinyali.
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {demoState.metrics.map((metric) => (
                    <ReadinessCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Starter actions</h2>
              </div>
              <div className="p-5 grid gap-3">
                {starterActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{action.title}</div>
                          <div className="mt-1 text-sm text-slate-600">{action.detail}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
                <Gauge size={18} className="text-emerald-600" />
                <h2 className="text-base font-semibold text-slate-900">Recommended exploration paths</h2>
              </div>
              <div className="p-5 grid gap-3">
                {demoState.explorationPaths.map((path) => (
                  <Link
                    key={path.label}
                    href={path.href}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{path.label}</div>
                        <div className="mt-1 text-sm text-slate-600">{path.description}</div>
                      </div>
                      <ArrowRight size={16} className="flex-shrink-0 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Workspace readiness</h2>
              </div>
              <div className="p-5 grid gap-3 sm:grid-cols-2">
                <ReadinessCard label="Logo" value={workspace.logoUrl ? "Hazir" : "Eksik"} note="Workspace branding" />
                <ReadinessCard label="Projects" value={String(accessibleProjectCount)} note="gorunebilen proje kaydi" />
                <ReadinessCard label="Members" value={String(workspace._count.members)} note="workspace seat" />
                <ReadinessCard label="Tasks" value={String(taskCount)} note="execution backlog" />
                <ReadinessCard label="Activity" value={String(activityCount)} note="audit + collaboration" />
                <ReadinessCard label="Digest" value={workspaceState?.weeklyDigestEnabled ? "Acik" : "Kapali"} note="weekly summary posture" />
                <ReadinessCard label="Checklist" value={`%${onboarding.progress}`} note="setup completion" />
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadinessCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{note}</div>
    </div>
  );
}
