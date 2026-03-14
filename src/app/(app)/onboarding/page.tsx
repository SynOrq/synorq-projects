import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, FolderKanban, Rocket, Settings, Users, WandSparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildOnboardingChecklist } from "@/lib/onboarding";
import { findWorkspaceState } from "@/lib/workspace-state";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, projects: true } },
    },
  });

  if (!workspace) redirect("/auth/login");

  const [taskCount, workspaceState] = await Promise.all([
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
    }),
  ]);

  const onboarding = buildOnboardingChecklist({
    hasProfileIdentity: Boolean(session.user.name) && Boolean(session.user.image),
    hasWorkspace: true,
    hasWorkspaceBrand: Boolean(workspace.logoUrl),
    projectCount: workspace._count.projects,
    memberCount: workspace._count.members,
    taskCount,
    reportsReady: workspace._count.projects > 0,
    weeklyDigestEnabled: workspaceState?.weeklyDigestEnabled ?? false,
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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(16,185,129,0.08)_42%,rgba(59,130,246,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <WandSparkles size={13} />
                Smart Onboarding
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Synorq execution OS kurulumunu adim adim tamamlayin.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Bu yuzey, workspace markasi, ekip setup'i, proje akisi ve reporting posture'unu tek setup hub icinde toplar.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kurulum ilerleme</div>
                <div className="mt-2 text-2xl font-black text-slate-950">%{onboarding.progress}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {onboarding.completed}/{onboarding.total} adim tamam
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sonraki adim</div>
                <div className="mt-2 text-sm font-black text-slate-950">{onboarding.nextItem?.label ?? "Kurulum tamamlandi"}</div>
                <div className="mt-1 text-xs text-slate-500">{onboarding.nextItem?.description ?? "Tum temel adimlar hazir."}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Guided checklist
          </div>
          <div className="mt-5 space-y-3">
            {onboarding.items.map((item, index) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                          item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.done ? "✓" : index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-950">{item.label}</div>
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
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Starter actions</div>
            <div className="mt-5 grid gap-3">
              {starterActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-950">{action.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{action.detail}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Workspace readiness</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReadinessCard label="Logo" value={workspace.logoUrl ? "Hazir" : "Eksik"} note="Workspace branding" />
              <ReadinessCard label="Projects" value={String(workspace._count.projects)} note="aktif proje kaydi" />
              <ReadinessCard label="Members" value={String(workspace._count.members)} note="workspace seat" />
              <ReadinessCard label="Tasks" value={String(taskCount)} note="execution backlog" />
              <ReadinessCard label="Digest" value={workspaceState?.weeklyDigestEnabled ? "Acik" : "Kapali"} note="weekly summary posture" />
              <ReadinessCard label="Checklist" value={`%${onboarding.progress}`} note="setup completion" />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ReadinessCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{note}</div>
    </div>
  );
}
