import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]">
          <div className="inline-flex rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
            <Compass size={18} />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Aradigin sayfa bulunamadi</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Link eski olabilir, erisim politikasina takiliyor olabilir veya ilgili kayit kaldirilmis olabilir.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Dashboard&apos;a don</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">Projeleri gor</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
