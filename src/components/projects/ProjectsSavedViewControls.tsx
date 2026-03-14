"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, RotateCcw } from "lucide-react";
import type { SavedProjectsView } from "@/lib/projects-saved-view";
import { Button } from "@/components/ui/button";

type Props = {
  currentView: SavedProjectsView;
  savedView: SavedProjectsView | null;
};

export default function ProjectsSavedViewControls({ currentView, savedView }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSavedView(nextSavedView: SavedProjectsView | null, successMessage: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const res = await fetch("/api/workspace/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedProjectsView: nextSavedView }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Saved view guncellenemedi.");
        }

        setMessage(successMessage);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saved view guncellenemedi.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" loading={isPending} onClick={() => updateSavedView(currentView, "Current view kaydedildi.")}>
        <Bookmark size={14} />
        Bu view'u kaydet
      </Button>
      {savedView && (
        <Button type="button" size="sm" variant="ghost" loading={isPending} onClick={() => updateSavedView(null, "Saved view temizlendi.")}>
          <RotateCcw size={14} />
          Kaydi temizle
        </Button>
      )}
      {savedView && <div className="text-xs text-slate-500">Kayitli: {savedView.label}</div>}
      {message && <div className="text-xs text-emerald-600">{message}</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
