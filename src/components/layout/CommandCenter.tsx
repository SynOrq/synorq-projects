"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { buildCommandItems, filterCommandItems, type CommandItem } from "@/lib/command-center";

type Props = {
  projects: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  focusTasks: Array<{
    id: string;
    title: string;
    href: string;
      projectName: string;
      dueLabel?: string | null;
  }>;
  people: Array<{
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "VIEWER";
    isOwner?: boolean;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    detail: string;
    href: string;
    tone: "risk" | "activity";
  }>;
};

const groupOrder: Array<CommandItem["group"]> = ["Navigate", "Create", "Projects", "My Work", "People", "Signals"];

export default function CommandCenter({ projects, focusTasks, people, alerts }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = useMemo(() => buildCommandItems({ projects, focusTasks, people, alerts }), [alerts, focusTasks, people, projects]);
  const filtered = useMemo(() => filterCommandItems(items, query), [items, query]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white"
        >
          <Search size={14} className="flex-shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-left text-sm">Ara veya komut gir...</span>
          <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[min(680px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(10,14,26,0.18)]">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
            <Search size={16} className="flex-shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Proje, görev, kişi veya sayfa ara..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            <Dialog.Title className="sr-only">Command Center</Dialog.Title>
            <Dialog.Description className="sr-only">Hızlı gezinme ve arama</Dialog.Description>
            <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400">
                Eşleşen sonuç bulunamadı.
              </div>
            )}

            <div className="space-y-4">
              {groupOrder.map((group) => {
                const groupItems = filtered.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;

                return (
                  <div key={group}>
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                    <div>
                      {groupItems.map((item) => (
                        <Dialog.Close asChild key={item.id}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
                          >
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-300"
                              style={item.accent ? { background: item.accent } : undefined}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                              <p className="truncate text-xs text-slate-400">{item.subtitle}</p>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <CornerDownLeft size={12} />
                              <ArrowRight size={12} />
                            </div>
                          </Link>
                        </Dialog.Close>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
