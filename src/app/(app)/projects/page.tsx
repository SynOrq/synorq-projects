import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";

const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "danger" }> = {
  ACTIVE:    { label: "Aktif",     variant: "success" },
  ON_HOLD:   { label: "Beklemede", variant: "warning" },
  COMPLETED: { label: "Tamamlandı",variant: "secondary" },
  ARCHIVED:  { label: "Arşiv",     variant: "secondary" },
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
  });
  if (!workspace) redirect("/auth/login");

  const projects = await db.project.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: { select: { tasks: true, sections: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Projeler</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} proje</p>
        </div>
        <Button asChild>
          <Link href="/projects/new"><Plus size={16} /> Yeni Proje</Link>
        </Button>
      </div>

      {/* Empty */}
      {projects.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="inline-flex p-4 bg-indigo-50 rounded-2xl mb-4">
            <FolderKanban size={28} className="text-indigo-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Henüz proje yok</h3>
          <p className="text-sm text-gray-500 mb-6">İlk projenizi oluşturarak başlayın.</p>
          <Button asChild>
            <Link href="/projects/new"><Plus size={16} /> Proje Oluştur</Link>
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const st = statusLabel[p.status] ?? statusLabel.ACTIVE;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all"
            >
              {/* Top bar */}
              <div
                className="h-1.5 rounded-full mb-5 w-full"
                style={{ background: p.color }}
              />
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              {p.description && (
                <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">
                  {p.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                <span>{p._count.tasks} görev</span>
                <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                  Aç <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
