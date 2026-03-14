import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarRange, ShieldAlert, Target } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import { buildWorkspaceRiskRegister } from "@/lib/workspace-risks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function dueStateLabel(value: "overdue" | "due-soon" | "scheduled" | "none") {
  if (value === "overdue") return "Overdue";
  if (value === "due-soon") return "Due soon";
  if (value === "scheduled") return "Scheduled";
  return "No date";
}

export default async function RisksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = session.user.id;

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      _count: { select: { projects: true } },
    },
  });

  if (!workspace) redirect("/auth/login");

  const risks = await db.risk.findMany({
    where: {
      project: {
        workspaceId: workspace.id,
        status: { not: "ARCHIVED" },
      },
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      owner: { select: { name: true, email: true } },
      task: { select: { title: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { dueDate: "asc" }],
  });

  const register = buildWorkspaceRiskRegister(
    risks.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      impact: item.impact,
      likelihood: item.likelihood,
      mitigationPlan: item.mitigationPlan,
      dueDate: item.dueDate,
      ownerName: item.owner?.name ?? item.owner?.email ?? "Owner tanimsiz",
      taskTitle: item.task?.title ?? null,
      projectId: item.project.id,
      projectName: item.project.name,
      projectColor: item.project.color,
    }))
  );

  const risksWithPlan = register.items.filter((item) => item.status !== "CLOSED" && item.mitigationPlan).length;
  const summaryCards = [
    { label: "Open risks", value: register.summary.openCount, note: "kapanmamis register kaydi" },
    { label: "Critical", value: register.summary.criticalCount, note: "acil escalation gereken risk" },
    { label: "Mitigating", value: register.summary.mitigatingCount, note: "aktif aksiyon altindaki kayit" },
    { label: "Due soon", value: register.summary.dueSoonCount, note: "7 gun icinde closure hedefi" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(239,68,68,0.08)_42%,rgba(245,158,11,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <ShieldAlert size={13} />
                Workspace Risk Register
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Risk kayitlarini proje bazindan cikarip workspace seviyesinde yonetin.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {workspace.name} icindeki tum risk kayitlari, severity sirasi, due pressure ve mitigation kapsami ile tek
                register yuzeyinde toplanir.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/projects?health=risk">
                    Riskte projeler
                    <ArrowRight size={13} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reports">Reports</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</div>
                <div className="mt-2 text-xl font-black text-slate-950">{workspace.name}</div>
                <div className="mt-1 text-xs text-slate-500">{workspace._count.projects} proje icin register okunuyor</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mitigation coverage</div>
                <div className="mt-2 text-xl font-black text-slate-950">{risksWithPlan}</div>
                <div className="mt-1 text-xs text-slate-500">acik risk icin plan tanimlandi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = index === 0 ? ShieldAlert : index === 1 ? AlertTriangle : index === 2 ? Target : CalendarRange;
          return (
            <div key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon size={18} />
              </div>
              <div className="mt-4 text-3xl font-black text-slate-950">{card.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{card.label}</div>
              <div className="mt-1 text-xs text-slate-500">{card.note}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <ShieldAlert size={18} className="text-red-500" />
            Risk register
          </div>
          <div className="mt-5 space-y-3">
            {register.items.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Workspace seviyesinde kayitli risk bulunmuyor.
              </div>
            )}
            {register.items.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-red-200 hover:bg-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.projectColor }} />
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      <Badge variant={item.severity === "critical" ? "danger" : "warning"}>{item.severity}</Badge>
                      <Badge variant={item.status === "CLOSED" ? "success" : item.status === "MITIGATING" ? "warning" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1">{item.projectName}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">Impact {item.impact}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">Likelihood {item.likelihood}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{item.ownerName}</span>
                      {item.taskTitle && <span className="rounded-full bg-white px-2.5 py-1">{item.taskTitle}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{item.dueDate ? formatDate(item.dueDate) : "Plansiz"}</div>
                    <div className="mt-1">{item.dueDate ? formatRelative(item.dueDate) : dueStateLabel(item.dueState)}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2.5 py-1">Score {item.score}</span>
                  <span className="rounded-full bg-white px-2.5 py-1">{dueStateLabel(item.dueState)}</span>
                </div>
                <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
                  {item.mitigationPlan ?? "Mitigation plani tanimlanmadi."}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <AlertTriangle size={18} className="text-amber-600" />
              Project hotspots
            </div>
            <div className="mt-5 space-y-3">
              {register.hotspots.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Risk hotspot hesaplanmadi.
                </div>
              )}
              {register.hotspots.slice(0, 6).map((item) => (
                <Link key={item.projectId} href={`/projects/${item.projectId}?tab=risks`} className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-red-200 hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.projectColor }} />
                        <div className="text-sm font-black text-slate-950">{item.projectName}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.openRisks} open risk • {item.criticalRisks} kritik • {item.overdueRisks} overdue
                      </div>
                    </div>
                    <Badge variant={item.criticalRisks > 0 ? "danger" : "warning"}>{item.criticalRisks > 0 ? "Escalate" : "Watch"}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="text-sm font-semibold text-white">Coverage notes</div>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Acik risklerin {risksWithPlan} tanesinde mitigation plan kaydi var.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Critical severity, impact ve likelihood toplam skoruna gore workspace seviyesinde siralanir.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Hotspot paneli, proje bazinda hangi register&apos;in oncelikli eskalasyon gerektirdigini ayiklar.
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
