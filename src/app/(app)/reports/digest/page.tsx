import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarRange, Gauge, Share2, TriangleAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildExecutiveWeeklyDigest } from "@/lib/executive-digest";
import { filterAccessibleProjects } from "@/lib/project-access";
import { analyzeProjects, type PortfolioProject } from "@/lib/portfolio";
import { buildExecutiveReport } from "@/lib/reports";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ExecutiveDigestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          capacityProfile: true,
        },
      },
    },
  });

  if (!workspace) redirect("/auth/login");
  const currentMembership = workspace.members.find((member) => member.user.id === userId);
  if (!currentMembership) redirect("/auth/login");

  const [projectsRaw, activity] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, health: true } },
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
            estimatedH: true,
            loggedH: true,
            labels: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, action: true, projectId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });
  const accessibleProjectIds = new Set(accessibleProjectsRaw.map((project) => project.id));
  const filteredActivity = activity.filter((item) => !item.projectId || accessibleProjectIds.has(item.projectId));

  const projects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[]);
  const teamCapacity = analyzeTeamCapacity(
    workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      isOwner: member.user.id === workspace.ownerId,
      capacityProfile: member.capacityProfile
        ? {
            weeklyCapacityHours: member.capacityProfile.weeklyCapacityHours,
            reservedHours: member.capacityProfile.reservedHours,
            outOfOfficeHours: member.capacityProfile.outOfOfficeHours,
          }
        : undefined,
    })),
    accessibleProjectsRaw.flatMap((project) =>
      project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assigneeId: task.assigneeId,
        estimatedH: task.estimatedH,
        loggedH: task.loggedH,
        labels: task.labels,
        project: {
          id: project.id,
          name: project.name,
          color: project.color,
        },
      }))
    )
  );

  const report = buildExecutiveReport(projects, teamCapacity.snapshots, filteredActivity);
  const digest = buildExecutiveWeeklyDigest(report);
  const toneClass =
    digest.tone === "attention"
      ? "border-red-200 bg-red-50 text-red-700"
      : digest.tone === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Share2 size={12} />
                Executive Weekly Digest
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Weekly digest, leadership okuma ritmine gore hazirlandi.</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {workspace.name} icin risk, teslim ve kapasite sinyalleri haftalik yonetici ozet formatinda derlenir.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/reports">
                  <ArrowLeft size={13} />
                  Reports
                </Link>
              </Button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Generated</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(report.generatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
              <TriangleAlert size={12} />
              {digest.tone === "attention" ? "Attention" : digest.tone === "watch" ? "Watch" : "Stable"}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{digest.headline}</h2>
            <div className="mt-5 space-y-3">
              {digest.narrative.map((item) => (
                <div key={item} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard icon={<TriangleAlert size={16} className="text-red-600" />} label="Risk projects" value={String(report.summary.riskProjects)} note={`${report.summary.criticalRisks} kritik risk`} />
            <MetricCard icon={<CalendarRange size={16} className="text-amber-600" />} label="Deliveries this week" value={String(report.summary.deliveriesThisWeek)} note={`${report.summary.dueThisWeekTasks} task teslimi`} />
            <MetricCard icon={<Gauge size={16} className="text-cyan-600" />} label="Capacity" value={`%${report.summary.utilization}`} note={`${report.summary.projectedHours}/${report.summary.totalCapacityHours}h`} />
            <MetricCard icon={<Users size={16} className="text-indigo-600" />} label="Overloaded members" value={String(report.summary.overloadedMembers)} note={`${report.summary.watchMembers} watch seviyesi`} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <DigestPanel title="Leadership blocks" emptyLabel="Bu hafta leadership block olusmadi." items={digest.leadershipBlocks} />
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-black text-slate-950">Client signal mix</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {digest.clientSignals.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{item.value}</div>
              </div>
            ))}
            {digest.clientSignals.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Client signal yok.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DigestPanel title="Delivery focus" emptyLabel="Risk watchlist bos." items={digest.deliveryFocus} />
        <DigestPanel title="Team focus" emptyLabel="Kapasite baskisi yok." items={digest.teamFocus} />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recommendations</div>
            <div className="mt-2 text-lg font-black text-slate-950">This week&apos;s management moves</div>
          </div>
          <Badge variant="secondary">{workspace.owner.name ?? workspace.owner.email}</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {digest.recommendations.map((item) => (
            <div key={item} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              {item}
            </div>
          ))}
          {digest.recommendations.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Ozel yonetim aksiyonu onerilmiyor.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="text-sm font-semibold text-white">Digest cadence</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Bu sayfa haftalik leadership okumasina gore optimize edilir; sayisal sinyallerle birlikte kisa anlatim bloklari ayni yuzeyde tutulur.
        </p>
        <div className="mt-4 text-xs text-slate-400">Coverage window: {formatDate(report.generatedAt)} haftasi</div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function DigestPanel({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-black text-slate-950">{title}</div>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-black text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
