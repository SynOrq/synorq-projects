import Link from "next/link";
import { ArrowRight, Blocks, FolderKanban, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Synorq Projects",
    description: "Proje yurutme, ekip koordinasyonu ve teslim gorunurlugunu tek operasyon yuzeyinde toplar.",
    href: "/products/projects",
    icon: FolderKanban,
  },
  {
    title: "Synorq Ops",
    description: "Standartlasmis operasyon akislari, kontrol katmani ve surec disiplini icin tasarlanan modul.",
    href: "/auth/register",
    icon: Gauge,
  },
  {
    title: "AI Workflows",
    description: "Tekrarlayan ekip islerini otomasyonla hizlandiran, Synorq platformuna bagli is akisi katmani.",
    href: "/auth/register",
    icon: Sparkles,
  },
];

export default function ProductsHubPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#0f1c33_44%,#eef4fb_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/8 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Blocks size={18} />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.28em]">SYNORQ</div>
                <div className="text-xs text-slate-300">Platform Modules</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/">Ana Sayfa</Link>
              </Button>
              <Button asChild className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                <Link href="/auth/register">Ucretsiz Dene</Link>
              </Button>
            </div>
          </header>

          <section className="py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                <ShieldCheck size={14} />
                Moduler product architecture
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl">
                Synorq, tek arac degil; modullerle buyuyen bir operasyon platformudur.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                Projects, Ops ve AI Workflows gibi urun katmanlari ayni marka dili, ayni kontrol mantigi ve ayni workspace omurgasi uzerinden calisir.
              </p>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {modules.map(({ title, description, href, icon: Icon }) => (
                <div key={title} className="rounded-[32px] border border-white/10 bg-white/8 p-6 text-white backdrop-blur-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Icon size={18} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{description}</p>
                  <Button asChild className="mt-6 rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                    <Link href={href}>
                      Modulu Gor
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
