import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FolderKanban,
  LineChart,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildClientRiskVisibility,
  buildQuickActions,
  buildRecentBlockers,
  buildUpcomingDeadlines,
  buildWeeklyCompletionTrend,
  countOverloadedMembers,
} from "@/lib/dashboard";
import { filterAccessibleProjects } from "@/lib/project-access";
import { analyzeProjects, analyzeTeamLoad, getWorkloadImbalanceScore, type PortfolioProject } from "@/lib/portfolio";
import { analyzeTeamCapacity } from "@/lib/team-capacity";
import { formatDate, formatRelative, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTIVITY_LABELS = {
  "workspace.updated": "Workspace ayarlari guncellendi",
  "workspace.member.invited": "Yeni ekip uyesi eklendi",
  "workspace.member.role_updated": "Rol yetkisi guncellendi",
  "task.created": "Yeni gorev olusturuldu",
  "task.updated": "Gorev guncellendi",
  "task.moved": "Gorev kolon degistirdi",
  "milestone.created": "Milestone eklendi",
  "risk.created": "Risk kaydi acildi",
  "task.commented": "Yorum eklendi",
  "task.subtask.created": "Alt gorev acildi",
  "task.subtask.updated": "Alt gorev guncellendi",
  "task.attachment.created": "Dosya eklendi",
  "task.attachment.deleted": "Dosya silindi",
} as const;

const PRIORITY_WEIGHT = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 } as const;

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function inNextWeek(date: Date | null, now: Date) {
  if (!date) return false;
  const today = startOfDay(now);
  const boundary = new Date(today);
  boundary.setDate(boundary.getDate() + 7);
  return date >= today && date <= boundary;
}

function deltaLabel(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return "degisim yok";
  return `${delta > 0 ? "+" : ""}${delta} gecen haftaya gore`;
}

function dueLabel(date: Date | null, now: Date) {
  if (!date) return "tarih tanimsiz";
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} gun overdue`;
  if (diff === 0) return "today";
  if (diff === 1) return "1 gun kaldi";
  if (diff <= 7) return "this week";
  return formatDate(date);
}

function getDecisionType(task: {
  assigneeId: string | null;
  status: string;
  dueDate: Date | null;
  labels: string[];
}, now: Date) {
  if (!task.assigneeId) return "Owner atamasi bekliyor";
  if (task.labels.includes("Blocked")) return "Unblock karari";
  if (task.status === "IN_REVIEW") return "Teknik review";
  if (task.dueDate && new Date(task.dueDate) < now) return "Onceliklendirme";
  return "Teslim onayi";
}

function riskReasons(project: {
  criticalRisks: number;
  overdueTasks: number;
  unassignedTasks: number;
  dueThisWeekTasks: number;
  nextMilestone: { status: string } | null;
}) {
  const reasons = [];
  if (project.criticalRisks > 0) reasons.push(`${project.criticalRisks} kritik risk`);
  if (project.overdueTasks > 0) reasons.push(`${project.overdueTasks} geciken teslim`);
  if (project.unassignedTasks > 0) reasons.push(`${project.unassignedTasks} atanmamis is`);
  if (project.nextMilestone?.status === "AT_RISK") reasons.push("kritik milestone kayiyor");
  if (project.dueThisWeekTasks > 0) reasons.push("bu hafta yogun kapanis");
  return reasons.slice(0, 3);
}

function MetricCard({
  label,
  value,
  note,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  delta: string;
  icon: typeof AlertTriangle;
  tone: "danger" | "warning" | "info" | "success";
}) {
  const toneMap = {
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-cyan-200 bg-cyan-50 text-cyan-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  } as const;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-2xl border p-2 ${toneMap[tone]}`}><Icon size={16} /></div>
      <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
        {delta.includes("+") ? <TrendingUp size={11} /> : delta.includes("-") ? <TrendingDown size={11} /> : <LineChart size={11} />}
        {delta}
      </div>
    </div>
  );
}

function SmallStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function Panel({
  title,
  kicker,
  linkHref,
  linkLabel,
  className = "border-slate-200",
  children,
}: {
  title: string;
  kicker: string;
  linkHref?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-[28px] border bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{kicker}</div>
          <div className="mt-1 text-lg font-black text-slate-950">{title}</div>
        </div>
        {linkHref && linkLabel ? <Link href={linkHref} className="text-xs font-semibold text-indigo-600 hover:underline">{linkLabel} →</Link> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function TopPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function MiniLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300">
      {label}
      <ArrowRight size={12} />
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { projects: true, members: true } },
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

  const [projectsRaw, recentActivity, myTasks] = await Promise.all([
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
            labels: true,
            estimatedH: true,
            loggedH: true,
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        milestones: { select: { id: true, title: true, status: true, dueDate: true, tasks: { select: { id: true, status: true } } } },
        risks: { select: { id: true, status: true, impact: true, likelihood: true, dueDate: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.task.findMany({
      where: { project: { workspaceId: workspace.id }, assigneeId: userId, status: { notIn: ["DONE", "CANCELLED"] } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
  ]);

  const accessibleProjectsRaw = filterAccessibleProjects(projectsRaw, {
    userId,
    workspaceOwnerId: workspace.ownerId,
    workspaceRole: currentMembership.role,
  });
  const accessibleProjectIds = new Set(accessibleProjectsRaw.map((project) => project.id));
  const visibleRecentActivity = recentActivity.filter((item) => !item.project || accessibleProjectIds.has(item.project.id));
  const visibleMyTasks = myTasks.filter((task) => accessibleProjectIds.has(task.project.id));

  const now = new Date();
  const weekAgo = startOfDay(new Date(now.getTime() - 7 * 86400000));
  const twoWeeksAgo = startOfDay(new Date(now.getTime() - 14 * 86400000));
  const firstName = session.user.name?.split(" ")[0] ?? "Kullanici";

  const projects = analyzeProjects(accessibleProjectsRaw as PortfolioProject[], now);
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const dashboardTasks = accessibleProjectsRaw.flatMap((project) =>
    project.tasks.map((task) => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      projectDueDate: projectMap.get(project.id)?.dueDateResolved ?? null,
      health: projectMap.get(project.id)?.health ?? { key: "good", label: "Saglikli", score: 100 },
    }))
  );

  const openTasks = dashboardTasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now);
  const unassignedTasks = openTasks.filter((task) => !task.assigneeId);
  const completedLast7Days = dashboardTasks.filter((task) => task.completedAt && new Date(task.completedAt) >= weekAgo).length;
  const createdLast7Days = dashboardTasks.filter((task) => new Date(task.createdAt) >= weekAgo).length;
  const previousCompleted = dashboardTasks.filter((task) => task.completedAt && new Date(task.completedAt) >= twoWeeksAgo && new Date(task.completedAt) < weekAgo).length;
  const previousCreated = dashboardTasks.filter((task) => new Date(task.createdAt) >= twoWeeksAgo && new Date(task.createdAt) < weekAgo).length;
  const previousOverdue = dashboardTasks.filter((task) => task.dueDate && new Date(task.dueDate) < weekAgo && task.status !== "DONE" && task.status !== "CANCELLED" && (!task.completedAt || new Date(task.completedAt) > weekAgo)).length;

  const teamLoad = analyzeTeamLoad(
    workspace.members.map((member) => ({
      id: member.userId,
      name: member.user.name ?? member.user.email,
      email: member.user.email,
      role: member.role,
    })),
    dashboardTasks,
    now
  );
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
    dashboardTasks.map((task) => ({
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
      project: { id: task.projectId, name: task.projectName, color: task.projectColor },
    })),
    now
  );

  const riskProjects = projects
    .filter((project) => project.health.key === "risk" || project.overdueTasks > 0 || project.unassignedTasks > 0)
    .sort((left, right) => left.health.score - right.health.score || right.criticalRisks - left.criticalRisks || right.overdueTasks - left.overdueTasks);
  const criticalProjects = riskProjects.slice(0, 4);
  const deliveriesThisWeek = projects.filter((project) => inNextWeek(project.dueDateResolved, now));
  const previousDeliveries = projects.filter((project) => project.dueDateResolved && project.dueDateResolved >= twoWeeksAgo && project.dueDateResolved < weekAgo).length;
  const attentionTasks = [...openTasks]
    .sort((left, right) => {
      const leftOverdue = left.dueDate ? new Date(left.dueDate) < now : false;
      const rightOverdue = right.dueDate ? new Date(right.dueDate) < now : false;
      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
      if (left.labels.includes("Blocked") !== right.labels.includes("Blocked")) return left.labels.includes("Blocked") ? -1 : 1;
      if (Boolean(left.assigneeId) !== Boolean(right.assigneeId)) return left.assigneeId ? 1 : -1;
      return PRIORITY_WEIGHT[right.priority ?? "MEDIUM"] - PRIORITY_WEIGHT[left.priority ?? "MEDIUM"];
    })
    .slice(0, 6);
  const previousDecisionCount = dashboardTasks.filter((task) => (!task.assigneeId || task.status === "IN_REVIEW" || task.labels.includes("Blocked") || Boolean(task.dueDate && new Date(task.dueDate) < weekAgo)) && task.status !== "DONE" && task.status !== "CANCELLED").length;

  const quickActions = buildQuickActions({
    riskProjects: riskProjects.length,
    unassignedTasks: unassignedTasks.length,
    dueThisWeekProjects: deliveriesThisWeek.length,
    overloadedMembers: countOverloadedMembers(teamLoad),
  });
  const weeklyTrend = buildWeeklyCompletionTrend(dashboardTasks, now);
  const upcomingDeadlines = buildUpcomingDeadlines(projects, dashboardTasks, now);
  const blockers = buildRecentBlockers(projects, dashboardTasks, now);
  const clientRisks = buildClientRiskVisibility(projects);

  const metrics = [
    { label: "Kritik riskte proje", value: riskProjects.length, note: "yakindan takip", delta: deltaLabel(riskProjects.length, Math.max(0, riskProjects.length - 1)), icon: AlertTriangle, tone: "danger" as const },
    { label: "Geciken gorev", value: overdueTasks.length, note: "bugun mudahale gerekli", delta: deltaLabel(overdueTasks.length, previousOverdue), icon: Clock3, tone: "danger" as const },
    { label: "Bu hafta teslim", value: deliveriesThisWeek.length, note: "bu hafta kapanmali", delta: deltaLabel(deliveriesThisWeek.length, previousDeliveries), icon: CheckCircle2, tone: "warning" as const },
    { label: "Karar bekleyen is", value: attentionTasks.length, note: "owner veya review karari", delta: deltaLabel(attentionTasks.length, previousDecisionCount), icon: FolderKanban, tone: "warning" as const },
    { label: "Takim yuk dengesizligi", value: `${getWorkloadImbalanceScore(teamLoad)}%`, note: "ekip dagiliminda risk var", delta: `${teamCapacity.summary.overloadedMembers} overload`, icon: UsersRound, tone: "info" as const },
    { label: "7 gun throughput", value: completedLast7Days, note: "tamamlanan is akisi", delta: deltaLabel(completedLast7Days, previousCompleted), icon: TrendingUp, tone: "success" as const },
  ];

  return (
    <div className="min-h-full bg-[#eef3f8]">
      <div className="border-b border-slate-300 bg-white px-8 py-7">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Zap size={12} />
              Executive Delivery Console
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Delivery Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Merhaba, {firstName}. Kritik risk, geciken teslim ve mudahale bekleyen kararlar bugun icin onceliklendirildi.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <TopPill label="Bugun kritik risk" value={String(riskProjects.length)} />
              <TopPill label="Bu hafta geciken teslim" value={String(overdueTasks.length)} />
              <TopPill label="Mudahale bekleyen is" value={String(attentionTasks.length)} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild><Link href="/projects/new"><Plus size={14} />Yeni Proje</Link></Button>
              <Button asChild variant="outline"><Link href="/my-tasks"><CheckCircle2 size={14} />Atanmis gorevler</Link></Button>
              <Button asChild variant="ghost"><Link href="/projects">Projeler<ChevronRight size={14} /></Link></Button>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick commands</div>
                <div className="mt-1 text-lg font-black">Bugun neye mudahele edilmeli?</div>
              </div>
              <Search size={16} className="text-slate-400" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { label: "Proje bul", href: "/projects" },
                { label: "Gorev bul", href: "/my-tasks" },
                { label: "Kullanici bul", href: "/members" },
                { label: "Bugun gecikenleri goster", href: "/projects?health=risk" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20 hover:bg-white/10">
                  <div>
                    <div className="text-sm font-semibold text-white">{action.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{action.detail}</div>
                  </div>
                  <ArrowRight size={14} className="text-slate-500" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Panel title="Raydan cikabilecek projeler" kicker="Critical Deliveries" linkHref="/projects?health=risk" linkLabel="Riskte olanlari gor">
            <div className="space-y-3">
              {criticalProjects.length === 0 ? <EmptyState label="Kritik proje sinyali yok." /> : criticalProjects.map((project, index) => (
                <div key={project.id} className={`rounded-[24px] border px-4 py-4 ${index < 3 ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projects/${project.id}`} className="text-sm font-black text-slate-950 hover:text-indigo-700">{project.name}</Link>
                    <Badge variant={project.health.key === "risk" ? "danger" : "warning"}>{project.health.label}</Badge>
                    <Badge variant="secondary">Health {project.health.score}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">{riskReasons(project).map((reason) => <span key={reason} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">{reason}</span>)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <MiniLink href={`/projects/${project.id}`} label="Projeye git" />
                    <MiniLink href={`/projects/${project.id}?tab=risks`} label="Risk detayini ac" />
                    <MiniLink href={`/projects/${project.id}?tab=list`} label="Gorevleri gor" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Bugun karar bekleyen isler" kicker="Decision Panel" linkHref="/my-tasks" linkLabel="Tum queue">
            <div className="space-y-3">
              {attentionTasks.length === 0 ? <EmptyState label="Bugun karar bekleyen is yok." /> : attentionTasks.map((task) => {
                const critical = !task.assigneeId || (task.dueDate && new Date(task.dueDate) < now);
                return (
                  <Link key={task.id} href={`/projects/${task.projectId}`} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-950">{task.title}</div>
                      <Badge variant={critical ? "danger" : task.status === "IN_REVIEW" ? "warning" : "secondary"}>{getDecisionType(task, now)}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{task.projectName}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1">{task.assigneeId === userId ? "Senden bekleniyor" : task.assignee?.name ?? task.assignee?.email ?? "Team lead / owner"}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{formatRelative(task.updatedAt)}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{dueLabel(task.dueDate, now)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Benim odagim</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">Bana atanmis kritik isler</div>
                </div>
                <Badge variant="secondary">{visibleMyTasks.length} aktif</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {visibleMyTasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Aktif kritik karar bulunmuyor.</div> : visibleMyTasks.slice(0, 3).map((task) => (
                  <Link key={task.id} href={`/projects/${task.project.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{task.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{task.project.name}</div>
                    </div>
                    <Badge variant={task.dueDate && new Date(task.dueDate) < now ? "danger" : "warning"}>{dueLabel(task.dueDate, now)}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <Panel title="Akisi bozan engeller" kicker="Blockers" linkHref="/risks" linkLabel="Risklere git" className="border-red-200">
            <div className="space-y-3">
              {blockers.length === 0 ? <EmptyState label="Aktif blocker sinyali gorunmuyor." /> : blockers.map((item, index) => (
                <Link key={item.id} href={item.href} className={`block rounded-[24px] border px-4 py-4 ${index < 3 ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{item.title}</div>
                    <Badge variant={item.severity === "critical" ? "danger" : "warning"}>{item.severity === "critical" ? "Critical" : "Watch"}</Badge>
                    {item.releaseImpact ? <Badge variant="warning">Release etkisi</Badge> : null}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{item.ownerName}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.ageDays} gun bloklu</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.nextStep}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Kapasite ve darbogaz sinyali" kicker="Team Capacity" linkHref="/members" linkLabel="Ekip detaylari">
            <div className="grid gap-3 sm:grid-cols-4">
              <SmallStat label="Overload" value={String(teamCapacity.summary.overloadedMembers)} note="mudahale bekliyor" />
              <SmallStat label="Watch" value={String(teamCapacity.summary.watchMembers)} note="izlenmeli" />
              <SmallStat label="Capacity" value={`${teamCapacity.summary.projectedHours}/${teamCapacity.summary.weeklyCapacityHours}h`} note="assigned vs capacity" />
              <SmallStat label="Blocked" value={String(teamCapacity.summary.blockedTasks)} note="akisi kitliyor" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                `Tum ekip ${teamCapacity.snapshots.length}`,
                `Yoneticiler ${teamCapacity.snapshots.filter((member) => member.role === "ADMIN").length}`,
                `Contributor ${teamCapacity.snapshots.filter((member) => member.role !== "ADMIN").length}`,
                `Overloaded ${teamCapacity.summary.overloadedMembers}`,
              ].map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">{item}</span>)}
            </div>
            <div className="mt-4 space-y-3">
              {teamCapacity.snapshots.slice(0, 5).map((member) => (
                <div key={member.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-950">{member.name}</div>
                        <Badge variant={member.loadState === "overloaded" ? "danger" : member.loadState === "watch" ? "warning" : "success"}>{member.loadState}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{member.role} • {member.projectedHours}h assigned / {member.weeklyCapacityHours}h capacity</div>
                    </div>
                    <div className="text-right text-xl font-black text-slate-950">%{member.utilization}</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className={`h-2 rounded-full ${member.loadState === "overloaded" ? "bg-red-500" : member.loadState === "watch" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(6, member.utilization))}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <MicroStat label="WIP" value={String(member.activeTasks)} />
                    <MicroStat label="Overdue" value={String(member.overdueTasks)} />
                    <MicroStat label="Bu hafta" value={String(member.dueThisWeekTasks)} />
                    <MicroStat label="Throughput" value={String(member.completedLast7Days)} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <Panel title="Yaklasan teslimler" kicker="Deadline Timeline" linkHref="/reports/share" linkLabel="Executive view">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { label: "Tumu", href: "/dashboard" },
                { label: "Bugun", href: "/my-tasks" },
                { label: "Bu hafta", href: "/reports" },
                { label: "Riskli", href: "/projects?health=risk" },
                { label: "Blocked", href: "/risks" },
              ].map((item, index) => (
                <Link key={item.label} href={item.href} className={`rounded-full px-3 py-1 text-xs font-medium ${index === 2 ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? <EmptyState label="Onumuzdeki 7 gun icin planli teslim yok." /> : upcomingDeadlines.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{item.title}</div>
                    <Badge variant={item.statusTone === "critical" ? "danger" : item.statusTone === "warning" ? "warning" : "success"}>{item.statusLabel}</Badge>
                    <Badge variant="secondary">{item.type}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{item.ownerName}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.relativeDueLabel}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">son guncelleme {formatRelative(item.lastUpdateLabel)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <div className="grid gap-6">
            <Panel title="Tamamlanan is akisi" kicker="Throughput">
              <div className="grid gap-3 sm:grid-cols-3">
                <SmallStat label="Tamamlanan" value={String(completedLast7Days)} note={deltaLabel(completedLast7Days, previousCompleted)} />
                <SmallStat label="Acilan" value={String(createdLast7Days)} note={deltaLabel(createdLast7Days, previousCreated)} />
                <SmallStat label="Net flow" value={String(completedLast7Days - createdLast7Days)} note={completedLast7Days > previousCompleted ? "Takimin outputu ivmeleniyor." : completedLast7Days < previousCompleted ? "Hafta basi darboğazı var." : "Output stabil."} />
              </div>
              <div className="mt-5">
                <div className="flex h-36 items-end gap-3">
                  {weeklyTrend.map((point) => (
                    <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full items-end justify-center gap-1" style={{ height: 92 }}>
                        <div className="w-1/2 rounded-t-md bg-emerald-500/85" style={{ height: `${Math.max(6, point.completedCount * 10)}px` }} />
                        <div className="w-1/2 rounded-t-md bg-slate-300" style={{ height: `${Math.max(6, point.createdCount * 10)}px` }} />
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{point.label}</div>
                      <div className="text-xs font-semibold text-slate-700">{point.completedCount}/{point.createdCount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Son hareketler" kicker="Activity" linkHref="/audit" linkLabel="Tumu">
                <div className="space-y-3">
                  {visibleRecentActivity.length === 0 ? <EmptyState label="Henuz activity kaydi yok." /> : visibleRecentActivity.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">{getInitials(item.user.name ?? item.user.email)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{ACTIVITY_LABELS[item.action as keyof typeof ACTIVITY_LABELS] ?? item.action}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.user.name ?? item.user.email}{item.project ? ` • ${item.project.name}` : ""} • {formatRelative(item.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Musteri risk gorunurlugu" kicker="Client Risk">
                <div className="space-y-3">
                  {clientRisks.length === 0 ? <EmptyState label="Client bagli risk sinyali yok." /> : clientRisks.map((client) => (
                    <div key={client.name} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-950">{client.name}</div>
                        <Badge variant={client.health === "AT_RISK" ? "danger" : client.health === "WATCH" ? "warning" : "success"}>{client.health === "AT_RISK" ? "At risk" : client.health === "WATCH" ? "Watch" : "Stable"}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">risk skoru {client.riskScore} • son hareket {formatRelative(client.lastActivityAt)}</div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <MicroStat label="Projeler" value={String(client.projects)} />
                        <MicroStat label="Riskte" value={String(client.riskProjects)} />
                        <MicroStat label="Open risk" value={String(client.openRisks)} />
                        <MicroStat label="Overdue" value={String(client.overdueTasks)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
