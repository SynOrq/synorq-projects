"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Mail, ShieldAlert, UserPlus, Users, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CapacityHeatmap, CapacitySnapshot } from "@/lib/team-capacity";

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

type Props = {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  currentUserId: string;
  canManageMembers: boolean;
  initialMembers: MemberRecord[];
  spotlightMemberId?: string;
  capacity: {
    snapshots: CapacitySnapshot[];
    heatmap: CapacityHeatmap;
    summary: {
      totalMembers: number;
      overloadedMembers: number;
      watchMembers: number;
      dueThisWeekTasks: number;
      blockedTasks: number;
      weeklyCapacityHours: number;
      projectedHours: number;
    };
  };
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Yonetici" },
  { value: "MEMBER", label: "Uye" },
  { value: "VIEWER", label: "Izleyici" },
] as const;

const roles: Record<MemberRecord["role"], { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Yonetici", color: "text-red-700", bg: "bg-red-50" },
  MEMBER: { label: "Uye", color: "text-blue-700", bg: "bg-blue-50" },
  VIEWER: { label: "Izleyici", color: "text-gray-700", bg: "bg-gray-50" },
};

function heatColor(value: number, max: number) {
  if (value === 0) return "bg-slate-100 text-slate-400";
  if (max <= 1) return "bg-cyan-100 text-cyan-700";
  const ratio = value / max;
  if (ratio >= 0.8) return "bg-red-100 text-red-700";
  if (ratio >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-cyan-100 text-cyan-700";
}

export default function TeamCapacityConsole({
  workspaceId,
  workspaceName,
  ownerId,
  currentUserId,
  canManageMembers,
  initialMembers,
  spotlightMemberId,
  capacity,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRecord["role"]>("MEMBER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const memberStats = useMemo(() => {
    const admins = members.filter((member) => member.role === "ADMIN").length;
    const viewers = members.filter((member) => member.role === "VIEWER").length;
    return {
      admins,
      viewers,
    };
  }, [members]);
  const spotlightMember = useMemo(
    () => capacity.snapshots.find((member) => member.id === spotlightMemberId) ?? null,
    [capacity.snapshots, spotlightMemberId]
  );

  const maxHeatValue = Math.max(1, ...capacity.heatmap.rows.flatMap((row) => row.values));

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      setError("Davet icin bir e-posta girin.");
      return;
    }

    setInviteLoading(true);
    setInviteMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
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
      setInviteMessage(data.message ?? "Uye workspace'e eklendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uye daveti gonderilemedi.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function updateRole(memberId: string, role: MemberRecord["role"]) {
    setSavingMemberId(memberId);
    setError(null);
    setInviteMessage(null);

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
      setInviteMessage("Uye rolu guncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rol guncellenemedi.");
    } finally {
      setSavingMemberId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(6,182,212,0.08)_42%,rgba(34,197,94,0.08))] px-6 py-6">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <Users size={13} />
                Team Load & Capacity
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Ekibin kapasitesini, darbo gazlarini ve teslim yogunlugunu tek yuzeyde yonetin.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {workspaceName} icin role-based capacity, due-date density ve ownership sinyalleri ayni ekip konsolunda bir araya gelir.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Toplam uye" value={String(capacity.summary.totalMembers)} note={`${memberStats.admins} admin`} />
              <MetricCard label="Yuksek yuk" value={String(capacity.summary.overloadedMembers)} note={`${capacity.summary.watchMembers} izleniyor`} />
              <MetricCard label="Kapasite" value={`${capacity.summary.projectedHours}/${capacity.summary.weeklyCapacityHours}h`} note="haftalik tahmini yuk" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bu hafta teslim" value={String(capacity.summary.dueThisWeekTasks)} note="ekip bazli due yoğunluğu" />
        <MetricCard label="Blocked work" value={String(capacity.summary.blockedTasks)} note="kapasiteyi kitleyen is" />
        <MetricCard label="Watchlist" value={String(capacity.summary.watchMembers)} note="yakindan izlenecek uye" />
        <MetricCard label="Viewer seats" value={String(memberStats.viewers)} note="read-only erisim" />
      </section>

      {spotlightMember && (
        <section className="rounded-[30px] border border-indigo-200 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(255,255,255,0.95))] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Member spotlight</div>
              <div className="mt-2 text-2xl font-black text-slate-950">{spotlightMember.name}</div>
              <div className="mt-1 text-sm text-slate-600">
                {spotlightMember.role} {spotlightMember.isOwner ? "• Owner" : ""} • {spotlightMember.email}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <StatChip label="Utilization" value={`%${spotlightMember.utilization}`} />
              <StatChip label="Aktif" value={String(spotlightMember.activeTasks)} />
              <StatChip label="Overdue" value={String(spotlightMember.overdueTasks)} />
              <StatChip label="Blocked" value={String(spotlightMember.blockedTasks)} />
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Zap size={18} className="text-cyan-600" />
            Capacity lanes
          </div>
          <div className="mt-5 space-y-4">
            {capacity.snapshots.map((member) => (
              <div
                key={member.id}
                className={`rounded-[24px] border px-4 py-4 ${
                  member.id === spotlightMemberId
                    ? "border-indigo-200 bg-indigo-50/60 shadow-[0_14px_32px_-24px_rgba(79,70,229,0.45)]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} image={member.image} size="sm" />
                      <div>
                        <div className="text-sm font-black text-slate-950">{member.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {member.role} {member.isOwner ? "• Owner" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <StatChip label="Aktif" value={String(member.activeTasks)} />
                      <StatChip label="Overdue" value={String(member.overdueTasks)} />
                      <StatChip label="Bu hafta" value={String(member.dueThisWeekTasks)} />
                      <StatChip label="Blocked" value={String(member.blockedTasks)} />
                    </div>
                  </div>
                  <div className="min-w-[220px] rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Utilization</span>
                      <span>%{member.utilization}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${
                          member.loadState === "overloaded"
                            ? "bg-red-500"
                            : member.loadState === "watch"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, member.utilization))}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>
                        <div>Tahmin</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{member.projectedHours}h</div>
                      </div>
                      <div>
                        <div>Kapasite</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{member.weeklyCapacityHours}h</div>
                      </div>
                      <div>
                        <div>Musait</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{member.availableHours}h</div>
                      </div>
                      <div>
                        <div>7 gun throughput</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{member.completedLast7Days}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {member.upcomingTasks.length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {member.upcomingTasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <div className="truncate text-sm font-semibold text-slate-950">{task.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">{task.projectName}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">{task.priority}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {task.dueDate ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(task.dueDate)) : "Plansiz"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <CalendarRange size={18} className="text-indigo-600" />
              Due-date density heatmap
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    <th className="px-3 py-2 font-semibold">Uye</th>
                    {capacity.heatmap.days.map((day) => (
                      <th key={day.key} className="px-2 py-2 text-center font-semibold">
                        <div>{day.label}</div>
                        <div className="mt-1 text-[10px] normal-case tracking-normal text-slate-400">{day.fullLabel}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capacity.snapshots.map((member) => {
                    const row = capacity.heatmap.rows.find((item) => item.memberId === member.id);
                    return (
                    <tr key={member.id}>
                        <td className="rounded-l-2xl bg-slate-50 px-3 py-3 font-semibold text-slate-900">
                          {member.name}
                        </td>
                        {(row?.values ?? []).map((value, index) => (
                          <td key={`${member.id}-${index}`} className="px-2 py-3 text-center">
                            <div className={`rounded-xl px-2 py-2 text-xs font-semibold ${heatColor(value, maxHeatValue)}`}>
                              {value}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-950">Capacity guidance</div>
            <div className="mt-4 space-y-3">
              <GuidanceItem
                tone="danger"
                title="Yuksek yuk"
                body={`${capacity.summary.overloadedMembers} uye overdue, blocked veya %90+ utilization seviyesinde.`}
              />
              <GuidanceItem
                tone="warning"
                title="Workload watch"
                body={`${capacity.summary.watchMembers} uye yakindan izlenmeli; due-week cluster olusuyor.`}
              />
              <GuidanceItem
                tone="info"
                title="Role capacity"
                body="Admin 30h, Member 34h, Viewer 10h haftalik kapasite varsayimi ile hesaplanir."
              />
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <UserPlus size={18} className="text-indigo-600" />
            Uye davet et
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mevcut kayitli kullaniciyi workspace'e ekleyin ve ekip kapasitesini role bazli genisletin.
          </p>

          <div className="mt-6 space-y-4">
            <Input
              label="E-posta"
              type="email"
              placeholder="ornek@firma.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              disabled={!canManageMembers || inviteLoading}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as MemberRecord["role"])}
                disabled={!canManageMembers || inviteLoading}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={inviteMember} loading={inviteLoading} disabled={!canManageMembers}>
              <UserPlus size={15} />
              Davet et
            </Button>

            {!canManageMembers && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Uye daveti ve rol yonetimi icin yonetici yetkisi gerekir.
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {inviteMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {inviteMessage}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-slate-950">Role matrix</h2>
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
                  <th className="px-6 py-4 font-semibold">Yuk sinyali</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Katilim</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const roleConfig = roles[member.role];
                  const capacityRecord = capacity.snapshots.find((item) => item.id === member.user.id);
                  const isSelf = member.user.id === currentUserId;
                  const isOwner = member.user.id === ownerId;
                  const canEdit = canManageMembers && !isSelf && !isOwner;

                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors hover:bg-slate-50/60 ${
                        member.user.id === spotlightMemberId ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.user.name ?? member.user.email} image={member.user.image} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">
                              {member.user.name ?? "Kullanici"}
                              {isOwner && (
                                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${roleConfig.bg} ${roleConfig.color}`}>
                          {member.role === "ADMIN" && <ShieldAlert size={12} className="mr-1" />}
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {capacityRecord ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              capacityRecord.loadState === "overloaded"
                                ? "bg-red-50 text-red-700"
                                : capacityRecord.loadState === "watch"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            %{capacityRecord.utilization} · {capacityRecord.loadState}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Yuk kaydi yok</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-4 md:table-cell">
                        {new Date(member.joinedAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-2">
                            <select
                              defaultValue={member.role}
                              disabled={savingMemberId === member.id}
                              onChange={(event) => updateRole(member.id, event.target.value as MemberRecord["role"])}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed"
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
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
        </section>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{note}</div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function GuidanceItem({
  tone,
  title,
  body,
}: {
  tone: "danger" | "warning" | "info";
  title: string;
  body: string;
}) {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-cyan-200 bg-cyan-50 text-cyan-700",
  } as const;

  const Icon = tone === "danger" ? AlertTriangle : tone === "warning" ? CalendarRange : Zap;

  return (
    <div className={`rounded-2xl border px-4 py-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={15} />
        {title}
      </div>
      <div className="mt-2 text-sm leading-6">{body}</div>
    </div>
  );
}
