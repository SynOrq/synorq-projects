"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-full bg-[#eef3f8] p-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-red-100 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <div className="inline-flex rounded-2xl border border-red-200 bg-red-50 p-3 text-red-600">
          <TriangleAlert size={18} />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Bu calisma alani yuklenemedi</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Sayfa guvenli sekilde durduruldu. Veriyi tekrar yukleyebilir veya ana dashboard&apos;a donebilirsin.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">Error detail</div>
          <div className="mt-2 break-words">{error.message || "Bilinmeyen modul hatasi."}</div>
          {error.digest ? <div className="mt-2 text-xs text-slate-500">Ref: {error.digest}</div> : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>
            <RotateCcw size={14} />
            Tekrar dene
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard&apos;a don</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
