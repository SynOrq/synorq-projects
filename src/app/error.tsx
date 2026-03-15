"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),_transparent_38%),linear-gradient(180deg,#fff7f7_0%,#f8fafc_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <div className="w-full rounded-[32px] border border-red-100 bg-white p-8 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]">
          <div className="inline-flex rounded-2xl border border-red-200 bg-red-50 p-3 text-red-600">
            <AlertTriangle size={18} />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Beklenmeyen bir hata olustu</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Synorq bu ekrani guvenli moda aldi. Sayfayi yeniden deneyebilir veya dashboard&apos;a geri donebilirsin.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Error detail</div>
            <div className="mt-2 break-words">{error.message || "Bilinmeyen uygulama hatasi."}</div>
            {error.digest ? <div className="mt-2 text-xs text-slate-500">Ref: {error.digest}</div> : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={reset}>
              <RefreshCw size={14} />
              Yeniden dene
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard&apos;a don</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
