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
  alerts: Array<{
    id: string;
    title: string;
    detail: string;
    href: string;
    tone: "risk" | "activity";
  }>;
};

const groupOrder: Array<CommandItem["group"]> = ["Navigate", "Create", "Projects", "My Work", "Signals"];

export default function CommandCenter({ projects, focusTasks, alerts }: Props) {
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

  const items = useMemo(() => buildCommandItems({ projects, focusTasks, alerts }), [alerts, focusTasks, projects]);
  const filtered = useMemo(() => filterCommandItems(items, query), [items, query]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white lg:min-w-[320px]"
        >
          <Search size={15} className="text-slate-400" />
          <span className="flex-1 truncate text-left">Komut, proje veya gorev ara</span>
          <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            Ctrl K
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 rounded-[28px] border border-slate-200 bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.5)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <Dialog.Title className="text-lg font-black text-slate-950">Command Center</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">
              Hizli gecis, create action ve risk odakli navigation.
            </Dialog.Description>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Dashboard, risk projects, Northstar, launch checklist..."
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
            {filtered.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                Eslesen komut bulunamadi.
              </div>
            )}

            <div className="space-y-6">
              {groupOrder.map((group) => {
                const groupItems = filtered.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;

                return (
                  <div key={group}>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group}</div>
                    <div className="space-y-2">
                      {groupItems.map((item) => (
                        <Dialog.Close asChild key={item.id}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-white"
                          >
                            <span
                              className="h-3 w-3 flex-shrink-0 rounded-full bg-slate-300"
                              style={item.accent ? { background: item.accent } : undefined}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-950">{item.title}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">{item.subtitle}</div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="hidden rounded-lg border border-slate-200 bg-white px-2 py-1 sm:inline-flex">
                                <CornerDownLeft size={12} />
                              </span>
                              <ArrowRight size={14} />
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
