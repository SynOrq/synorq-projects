import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, UserPlus, Mail, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!workspace) redirect("/auth/login");

  const roles: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN: { label: "Yönetici", color: "text-red-700", bg: "bg-red-50" },
    MEMBER: { label: "Üye", color: "text-blue-700", bg: "bg-blue-50" },
    VIEWER: { label: "İzleyici", color: "text-gray-700", bg: "bg-gray-50" },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-emerald-600" />
            Ekip Üyeleri
          </h1>
          <p className="text-gray-500 text-sm mt-1">Workspace'teki tüm üyeler ({workspace.members.length})</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <UserPlus size={16} />
          Yeni Üye Davet Et
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Kullanıcı</th>
                <th className="px-6 py-4 font-semibold">Rol</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Katılım Tarihi</th>
                <th className="px-6 py-4 font-semibold text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workspace.members.map((member: any) => {
                const rc = roles[member.role] || roles.MEMBER;
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.user.name} image={member.user.image} size="sm" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {member.user.name ?? "Kullanıcı"}
                          </div>
                          <div className="text-gray-400 flex items-center gap-1 mt-0.5">
                            <Mail size={12} />
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.color}`}>
                        {member.role === "ADMIN" && <ShieldAlert size={12} className="mr-1" />}
                        {rc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell whitespace-nowrap">
                      {new Date(member.joinedAt).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.user.id !== session.user?.id ? (
                        <button className="text-gray-400 hover:text-indigo-600 transition-colors font-medium">
                          Düzenle
                        </button>
                      ) : (
                        <span className="text-gray-300 italic">Siz</span>
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
  );
}
