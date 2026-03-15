"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarRange,
  ChevronDown,
  CircleGauge,
  FolderKanban,
  LayoutGrid,
  Plus,
  Settings,
  ShieldAlert,
  SquareCheckBig,
  Users,
  BarChart3,
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
  { href: "/dashboard",      icon: CircleGauge,    label: "Dashboard" },
  { href: "/notifications",  icon: Bell,           label: "Bildirimler" },
  { href: "/projects",       icon: FolderKanban,   label: "Projeler" },
  { href: "/my-tasks",       icon: SquareCheckBig, label: "Görevlerim" },
  { href: "/timeline",       icon: CalendarRange,  label: "Timeline" },
  { href: "/risks",          icon: ShieldAlert,    label: "Riskler" },
  { href: "/activity",       icon: Activity,       label: "Activity" },
  { href: "/members",        icon: Users,          label: "Ekip" },
  { href: "/reports",        icon: BarChart3,      label: "Raporlar" },
  { href: "/settings",       icon: Settings,       label: "Ayarlar" },
];

export default function Sidebar({ session, workspace, projects }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] flex-shrink-0 flex-col bg-[#0d1117]">
      {/* Workspace header */}
      <div className="px-3 pt-4 pb-3">
        <button className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/6">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10">
            {workspace?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {workspace?.name?.[0]?.toUpperCase() ?? "S"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold text-white">
              {workspace?.name ?? "Workspace"}
            </div>
            <div className="text-[11px] text-slate-500">Synorq Platform</div>
          </div>
          <ChevronDown size={13} className="flex-shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-white/6" />

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-indigo-400" : "text-white/40 group-hover:text-white/70"
                  )}
                />
                {label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Projects section */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Projeler
            </span>
            <Link
              href="/projects/new"
              className="flex items-center justify-center rounded-md p-0.5 text-white/30 transition-colors hover:bg-white/8 hover:text-white/60"
            >
              <Plus size={12} />
            </Link>
          </div>

          <div className="space-y-0.5">
            {projects.map((p) => {
              const isActive = pathname.startsWith(`/projects/${p.id}`);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all",
                    isActive
                      ? "bg-white/10 text-white font-medium"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}

            {projects.length === 0 && (
              <Link
                href="/projects/new"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                <LayoutGrid size={12} />
                Proje oluştur
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px bg-white/6" />

      {/* User profile */}
      <div className="px-3 py-3">
        <div className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/6">
          <Avatar name={session.user?.name} image={session.user?.image} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {session.user?.name ?? "Kullanıcı"}
            </div>
            <div className="truncate text-[11px] text-white/40">{session.user?.email}</div>
          </div>
          <Settings size={13} className="flex-shrink-0 text-white/30" />
        </div>
      </div>
    </aside>
  );
}
