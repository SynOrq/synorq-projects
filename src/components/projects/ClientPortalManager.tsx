"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Globe, Link2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PortalState = {
  isPublished: boolean;
  shareToken: string | null;
  welcomeTitle: string | null;
  welcomeMessage: string | null;
  accentColor: string;
  publishedAt: string | Date | null;
};

type Props = {
  clientId: string;
  clientName: string;
  canManage: boolean;
  initialPortal: PortalState | null;
};

function formatDateTime(value: string | Date | null) {
  if (!value) return "Taslak";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ClientPortalManager({ clientId, clientName, canManage, initialPortal }: Props) {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalState | null>(initialPortal);
  const [welcomeTitle, setWelcomeTitle] = useState(initialPortal?.welcomeTitle ?? `${clientName} delivery portal`);
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialPortal?.welcomeMessage ?? "Bu read-only yuzey aktif proje, teslim ve risk sinyallerini tek akista toplar."
  );
  const [accentColor, setAccentColor] = useState(initialPortal?.accentColor ?? "#0f172a");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sharePath = useMemo(() => (portal?.shareToken ? `/portal/${portal.shareToken}` : null), [portal?.shareToken]);

  function savePortal(nextPublished: boolean, regenerateToken = false) {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      try {
        const res = await fetch(`/api/clients/${clientId}/portal`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isPublished: nextPublished,
            welcomeTitle,
            welcomeMessage,
            accentColor,
            regenerateToken,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Client portal kaydedilemedi.");
        }

        setPortal(data.portal);
        setWelcomeTitle(data.portal.welcomeTitle ?? "");
        setWelcomeMessage(data.portal.welcomeMessage ?? "");
        setAccentColor(data.portal.accentColor ?? "#0f172a");
        setMessage(data.message ?? "Client portal guncellendi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Client portal kaydedilemedi.");
      }
    });
  }

  async function copyLink() {
    if (!sharePath || typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
      setMessage("Portal linki panoya kopyalandi.");
      setError(null);
    } catch {
      setError("Portal linki kopyalanamadi.");
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <Globe size={12} />
            Client Portal
          </div>
          <div className="mt-3 text-lg font-black text-slate-950">{portal?.isPublished ? "Published portal" : "Draft portal"}</div>
          <div className="mt-1 text-sm text-slate-500">Client tarafina giden read-only delivery ozeti bu kayit uzerinden yayinlanir.</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{portal?.isPublished ? "Live" : "Draft"}</div>
          <div className="mt-1 text-xs text-slate-500">{formatDateTime(portal?.publishedAt ?? null)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-3">
          <Field label="Portal title" value={welcomeTitle} onChange={setWelcomeTitle} disabled={!canManage || isPending} />
          <TextAreaField label="Portal message" value={welcomeMessage} onChange={setWelcomeMessage} disabled={!canManage || isPending} rows={4} />
          <Field label="Accent color" value={accentColor} onChange={setAccentColor} disabled={!canManage || isPending} placeholder="#0f172a" />
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Share link</div>
            <div className="mt-2 break-all text-sm font-semibold text-slate-900">{sharePath ?? "Portal yayinlandiginda link burada gorunur."}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sharePath && (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                    <Link2 size={13} />
                    Linki kopyala
                  </Button>
                  <Button asChild type="button" size="sm" variant="outline">
                    <a href={sharePath} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} />
                      Portali ac
                    </a>
                  </Button>
                </>
              )}
              {canManage && (
                <Button type="button" size="sm" variant="outline" onClick={() => savePortal(portal?.isPublished ?? false, true)} loading={isPending}>
                  <RefreshCcw size={13} />
                  Linki yenile
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
            Portal sadece proje, milestone, risk ve son hareketleri read-only gosterir. Gorev mutasyonu veya ic yorum akisi disariya acilmaz.
          </div>
        </div>
      </div>

      {!canManage && <Notice tone="warning">Portal ayarlari sadece workspace owner veya admin tarafindan guncellenebilir.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => savePortal(true)} loading={isPending}>
            {portal?.isPublished ? "Degisiklikleri yayinla" : "Portali yayinla"}
          </Button>
          <Button type="button" variant="outline" onClick={() => savePortal(false)} loading={isPending}>
            Taslak olarak kaydet
          </Button>
        </div>
      )}
    </div>
  );
}

function Notice({ children, tone }: { children: string; tone: "success" | "warning" | "danger" }) {
  const toneMap = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
  } as const;

  return <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneMap[tone]}`}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
