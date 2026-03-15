"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
          <div className="w-full rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_32px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/10 p-3 text-red-300">
              <ShieldAlert size={18} />
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight">Uygulama guvenli moda alindi</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Cekirdek uygulama katmaninda beklenmeyen bir hata yakalandi. Oturumunu kaybetmeden tekrar deneyebilir ya da ana akisa donebilirsin.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
              <div className="font-semibold text-white">Error detail</div>
              <div className="mt-2 break-words">{error.message || "Bilinmeyen uygulama hatasi."}</div>
              {error.digest ? <div className="mt-2 text-xs text-slate-400">Ref: {error.digest}</div> : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={reset}>Tekrar dene</Button>
              <Button asChild variant="outline" className="border-white/15 bg-white text-slate-900 hover:bg-slate-100">
                <Link href="/dashboard">Dashboard&apos;a don</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
