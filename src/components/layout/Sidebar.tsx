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

const fallbackProjectAccents = [
  "var(--sidebar-project-indigo)",
  "var(--sidebar-project-sky)",
  "var(--sidebar-project-teal)",
  "var(--sidebar-project-violet)",
  "var(--sidebar-project-amber)",
  "var(--sidebar-project-rose)",
];

function parseHexColor(value: string) {
  const normalized = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized)) {
    return null;
  }

  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function getHue(color: { r: number; g: number; b: number }) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return null;
  }

  let hue = 0;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}

function getProjectAccent(color: string, index: number) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return fallbackProjectAccents[index % fallbackProjectAccents.length];
  }

  const hue = getHue(rgb);
  if (hue === null) {
    return fallbackProjectAccents[index % fallbackProjectAccents.length];
  }

  if (hue < 18 || hue >= 338) return "var(--sidebar-project-rose)";
  if (hue < 55) return "var(--sidebar-project-amber)";
  if (hue < 175) return "var(--sidebar-project-teal)";
  if (hue < 230) return "var(--sidebar-project-sky)";
  if (hue < 286) return "var(--sidebar-project-indigo)";
  return "var(--sidebar-project-violet)";
}

export default function Sidebar({ session, workspace, projects }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
      {/* Workspace header */}
      <div className="px-3 pt-4 pb-3">
        <button className="group flex w-full items-center gap-2.5 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] px-2.5 py-2.5 text-left transition-colors hover:border-[var(--sidebar-border-strong)] hover:bg-[var(--sidebar-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)]">
            {workspace?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-[11px] text-xs font-bold text-[var(--sidebar-active-text)]"
                style={{ background: "linear-gradient(135deg, var(--sidebar-accent), var(--sidebar-accent-strong))" }}
              >
                {workspace?.name?.[0]?.toUpperCase() ?? "S"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold text-[var(--sidebar-text)]">
              {workspace?.name ?? "Workspace"}
            </div>
            <div className="text-[11px] text-[var(--sidebar-text-muted)]">Synorq Platform</div>
          </div>
          <ChevronDown size={13} className="flex-shrink-0 text-[var(--sidebar-icon-muted)] transition-colors group-hover:text-[var(--sidebar-icon)]" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-[var(--sidebar-border)]" />

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]",
                  isActive
                    ? "border-[var(--sidebar-active-border)] bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-active-text)]"
                    : "border-transparent text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-[var(--sidebar-accent)]" : "text-[var(--sidebar-icon-muted)] group-hover:text-[var(--sidebar-icon)]"
                  )}
                />
                {label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--sidebar-accent)] shadow-[0_0_0_3px_var(--sidebar-accent-soft)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Projects section */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between px-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-text-subtle)]">
              Projeler
            </span>
            <Link
              href="/projects/new"
              className="flex items-center justify-center rounded-md p-1 text-[var(--sidebar-icon-muted)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-icon)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]"
            >
              <Plus size={12} />
            </Link>
          </div>

          <div className="space-y-0.5">
            {projects.map((p, index) => {
              const isActive = pathname.startsWith(`/projects/${p.id}`);
              const accent = getProjectAccent(p.color, index);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]",
                    isActive
                      ? "border-[var(--sidebar-active-border)] bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-active-text)]"
                      : "border-transparent text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}

            {projects.length === 0 && (
              <Link
                href="/projects/new"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-[var(--sidebar-text-subtle)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-focus-ring)]"
              >
                <LayoutGrid size={12} className="text-[var(--sidebar-icon-muted)]" />
                Proje oluştur
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px bg-[var(--sidebar-border)]" />

      {/* User profile */}
      <div className="px-3 py-3">
        <div className="group flex cursor-pointer items-center gap-2.5 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] px-2.5 py-2 transition-colors hover:border-[var(--sidebar-border-strong)] hover:bg-[var(--sidebar-hover-bg)]">
          <Avatar
            name={session.user?.name}
            image={session.user?.image}
            size="sm"
            className="ring-1 ring-[var(--sidebar-border)]"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--sidebar-text)]">
              {session.user?.name ?? "Kullanıcı"}
            </div>
            <div className="truncate text-[11px] text-[var(--sidebar-text-muted)]">{session.user?.email}</div>
          </div>
          <Settings size={13} className="flex-shrink-0 text-[var(--sidebar-icon-muted)] transition-colors group-hover:text-[var(--sidebar-icon)]" />
        </div>
      </div>
    </aside>
  );
}
