"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { Session } from "next-auth";

interface SidebarProps {
  session: Session;
  workspace: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  projects: Array<{ id: string; name: string; color: string }>;
}

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/notifications", icon: BellRing, label: "Bildirimler" },
  { href: "/projects",   icon: FolderKanban,    label: "Projeler" },
  { href: "/my-tasks",   icon: CheckSquare,     label: "Görevlerim" },
  { href: "/members",    icon: Users,           label: "Ekip" },
  { href: "/settings",   icon: Settings,        label: "Ayarlar" },
];

export default function Sidebar({ session, workspace, projects }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white/95 backdrop-blur">
      <div className="border-b border-slate-200 p-4">
        <button className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            {workspace?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
              >
                {workspace?.name?.[0]?.toUpperCase() ?? "S"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold text-slate-950">
              {workspace?.name ?? "Workspace"}
            </div>
            <div className="text-xs text-slate-400">Synorq Platform</div>
          </div>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.10))] text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <div className="pt-4 pb-1">
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Projeler
            </span>
            <Link
              href="/projects/new"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <Plus size={13} />
            </Link>
          </div>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm transition-all",
                pathname.startsWith(`/projects/${p.id}`)
                  ? "bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.10))] font-medium text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-slate-400">Henüz proje yok</p>
          )}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50">
          <Avatar name={session.user?.name} image={session.user?.image} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-950">
              {session.user?.name ?? "Kullanıcı"}
            </div>
            <div className="truncate text-xs text-slate-400">{session.user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
