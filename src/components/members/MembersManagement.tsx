"use client";

import { useMemo, useState } from "react";
import { Mail, ShieldAlert, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Yönetici" },
  { value: "MEMBER", label: "Üye" },
  { value: "VIEWER", label: "İzleyici" },
] as const;

const roles: Record<MemberRecord["role"], { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Yönetici", color: "text-red-700", bg: "bg-red-50" },
  MEMBER: { label: "Üye", color: "text-blue-700", bg: "bg-blue-50" },
  VIEWER: { label: "İzleyici", color: "text-gray-700", bg: "bg-gray-50" },
};

export default function MembersManagement({
  workspaceId,
  workspaceName,
  ownerId,
  currentUserId,
  canManageMembers,
  initialMembers,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRecord["role"]>("MEMBER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const admins = members.filter((member) => member.role === "ADMIN").length;
    const viewers = members.filter((member) => member.role === "VIEWER").length;

    return {
      total: members.length,
      admins,
      viewers,
    };
  }, [members]);

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      setError("Davet için bir e-posta girin.");
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
        throw new Error(data.error ?? "Üye daveti gönderilemedi.");
      }

      setMembers((current) => [...current, data.member]);
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteMessage(data.message ?? "Üye workspace'e eklendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Üye daveti gönderilemedi.");
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
        throw new Error(data.error ?? "Rol güncellenemedi.");
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
      setInviteMessage("Üye rolü güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rol güncellenemedi.");
    } finally {
      setSavingMemberId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            <Users size={13} />
            Team Access
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-black text-gray-900">
            <Users className="text-emerald-600" />
            Ekip Üyeleri
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {workspaceName} workspace&apos;indeki erişimleri ve rol dağılımını yönetin.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-500">Toplam üye</div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-900">{summary.admins}</div>
            <div className="text-xs text-gray-500">Yönetici</div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-900">{summary.viewers}</div>
            <div className="text-xs text-gray-500">İzleyici</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-gray-900">
            <UserPlus size={18} className="text-indigo-600" />
            Üye Davet Et
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Bu akış mevcut kayıtlı kullanıcıyı e-posta ile workspace&apos;e ekler. İlk sürümde harici davet bağlantısı yok.
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
              <label className="text-sm font-medium text-gray-700">Rol</label>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as MemberRecord["role"])}
                disabled={!canManageMembers || inviteLoading}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
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
              Davet Et
            </Button>

            {!canManageMembers && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Üye daveti ve rol yönetimi için yönetici yetkisi gerekir.
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

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-gray-900">Rol Matrisi</h2>
              <p className="mt-1 text-sm text-gray-500">Üyeleri görüntüleyin, rol değiştirin ve sahipliği koruyun.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {members.length} kayıt
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Kullanıcı</th>
                  <th className="px-6 py-4 font-semibold">Rol</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Katılım</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => {
                  const roleConfig = roles[member.role];
                  const isSelf = member.user.id === currentUserId;
                  const isOwner = member.user.id === ownerId;
                  const canEdit = canManageMembers && !isSelf && !isOwner;

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.user.name ?? member.user.email} image={member.user.image} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">
                              {member.user.name ?? "Kullanıcı"}
                              {isOwner && <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Owner</span>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 truncate text-gray-400">
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
                              className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed"
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-300">
                            {isOwner ? "Sahip" : isSelf ? "Siz" : "Kilidi açık değil"}
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
      </div>
    </div>
  );
}
