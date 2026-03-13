"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  workspace: { id: string; name: string; slug: string } | null;
  projects: Array<{ id: string; name: string; color: string }>;
}

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",   icon: FolderKanban,    label: "Projeler" },
  { href: "/my-tasks",   icon: CheckSquare,     label: "Görevlerim" },
  { href: "/members",    icon: Users,           label: "Ekip" },
  { href: "/settings",   icon: Settings,        label: "Ayarlar" },
];

export default function Sidebar({ session, workspace, projects }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col">
      {/* Workspace selector */}
      <div className="p-4 border-b border-gray-100">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
          >
            {workspace?.name?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {workspace?.name ?? "Workspace"}
            </div>
            <div className="text-xs text-gray-400">Pro Plan</div>
          </div>
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        {/* Projects section */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Projeler
            </span>
            <Link
              href="/projects/new"
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus size={13} />
            </Link>
          </div>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                pathname.startsWith(`/projects/${p.id}`)
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-gray-400">Henüz proje yok</p>
          )}
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          <Avatar name={session.user?.name} image={session.user?.image} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {session.user?.name ?? "Kullanıcı"}
            </div>
            <div className="text-xs text-gray-400 truncate">{session.user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
