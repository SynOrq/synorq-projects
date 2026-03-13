import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CheckCheck,
  ChevronRight,
  FolderKanban,
  Gauge,
  LayoutPanelTop,
  LockKeyhole,
  MessageSquareMore,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Portfoy gorunurlugu",
    description: "Projeleri, durum dagilimini ve teslim risklerini tek operasyon yuzeyinde birlestirir.",
    icon: LayoutPanelTop,
  },
  {
    title: "Gorev ve alt gorev akisi",
    description: "Yorumlar, alt gorevler ve dosya baglantilari isi tek baglam icinde tutar.",
    icon: CheckCheck,
  },
  {
    title: "Rol bazli koordinasyon",
    description: "Admin, uye ve izleyici yapisi ekip buyudukce kontrolu korur.",
    icon: UsersRound,
  },
  {
    title: "Teslim riski takibi",
    description: "Geciken isleri ve bekleyen geri bildirimleri yonetim seviyesinde gorunur kilar.",
    icon: Gauge,
  },
];

const workflow = [
  "Workspace olustur",
  "Ekipleri ve rolleri tanimla",
  "Projeleri ve gorev akisini yapilandir",
  "Yurutmeyi, riski ve ritmi izle",
];

const useCases = [
  "Ajans proje operasyonu",
  "Ic urun ekipleri",
  "Musteri gorunurlugu gereken isler",
  "Cok paydasli teslim surecleri",
];

export default function ProjectsProductPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#091120_0%,#0f1c33_46%,#eef4fb_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute left-1/2 top-0 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/8 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Blocks size={18} />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.28em]">SYNORQ</div>
                <div className="text-xs text-slate-300">Projects Module</div>
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

          <section className="grid gap-14 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                <FolderKanban size={14} />
                Synorq platform modulu
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl">
                Proje yurutme ve teslim gorunurlugunu tek operasyon yuzeyinde toplayin.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
                Synorq Projects, proje portfoyunu, gorev akislarini ve ekip koordinasyonunu Synorq&apos;un merkezi
                kontrol yapisina baglayan execution layer&apos;dir.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
                  <Link href="/auth/register">
                    Ucretsiz Dene
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/6 px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#final-cta">Canli Demo Planla</a>
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  "Operasyon gorunurlugu",
                  "Rol bazli koordinasyon",
                  "Teslim disiplini",
                ].map((item) => (
                  <div key={item} className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-md">
                    <div className="text-sm font-semibold text-white">{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-[#dfe8f4] p-4 shadow-[0_40px_120px_-40px_rgba(8,17,31,0.82)]">
              <div className="rounded-[30px] bg-white p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Projects preview</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">Execution control workspace</div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-white">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-300">delivery</div>
                    <div className="mt-1 text-xl font-black">76%</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Portfolio</div>
                        <div className="mt-2 text-lg font-black">Proje, risk ve ritim gorunumu</div>
                      </div>
                      <Gauge size={18} className="text-cyan-300" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {[
                        ["12", "aktif proje"],
                        ["08", "riskli is"],
                        ["19", "bekleyen yorum"],
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-2xl bg-white/8 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
                          <div className="mt-2 text-2xl font-black">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <UsersRound size={15} className="text-indigo-600" />
                        Ekip ve roller
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          ["Urun Lideri", "Admin"],
                          ["Tasarim", "Uye"],
                          ["Musteri", "Izleyici"],
                        ].map(([name, role]) => (
                          <div key={name} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm">
                            <div>
                              <div className="font-semibold text-slate-900">{name}</div>
                              <div className="text-xs text-slate-500">erisimi tanimli</div>
                            </div>
                            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <MessageSquareMore size={15} className="text-amber-500" />
                        Gorev baglami
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Alt gorevler ve dosyalar tek baglamda tutulur.</div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Yorum ve aktivite izi karar gecmisini gorunur kilar.</div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Riskli teslimler erken fark edilir.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Synorq Projects nedir?</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Synorq platformunun proje yurutme ve teslim gorunurlugu modulu.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Daginik proje takibini okunabilir, rol bazli ve olceklenebilir bir calisma alanina donusturur.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {capabilities.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon size={18} />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[34px] bg-slate-950 p-8 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.8)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Nasil calisir?</div>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Workspace kur, ekipleri tanimla, yurutmeyi merkezilestir.</h2>
            <div className="mt-8 space-y-4">
              {workflow.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/6 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 font-black text-slate-950">
                    0{index + 1}
                  </div>
                  <div className="text-sm font-semibold text-white">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {useCases.map((item) => (
              <div key={item} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
                <div className="text-lg font-black text-slate-950">{item}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Synorq Projects bu senaryoda proje ritmini, gorev baglamini ve teslim kontrolunu ayni modulde toplar.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Synorq platformuyla iliskisi</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Projects, Synorq&apos;un moduler urun mimarisi icinde execution layer olarak konumlanir.
            </h2>
            <div className="mt-6 space-y-3">
              {[
                "Synorq Projects: proje yurutme ve teslim gorunurlugu",
                "Synorq Ops: operasyon standardizasyonu ve kontrol akislari",
                "Synorq CRM: iliski ve talep sureclerinin gorunurlugu",
                "AI Workflows: tekrarlayan is akislari icin otomasyon katmani",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <LockKeyhole size={16} className="text-emerald-600" />
              Guven ve kontrol katmani
            </div>
            <div className="mt-6 space-y-3">
              {[
                "Rol bazli erisim",
                "Merkezi gorunurluk",
                "Standartlasmis calisma yuzeyi",
                "Olceklenebilir takim yapisi",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="final-cta" className="mx-auto max-w-7xl px-6 pb-24 sm:px-8 lg:px-10">
        <div className="rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.8)]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Final CTA</div>
              <h2 className="mt-4 text-4xl font-black tracking-tight">
                Synorq Projects&apos;i ekibinize uygun bir operasyon senaryosuyla gorun.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Canli demo planlayin, modulu inceleyin ve proje yurutme katmanini Synorq platformu icinde nasil konumlayacaginizi birlikte netlestirelim.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
                <Link href="/auth/register">
                  Demo planla
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/15 bg-white/6 px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/projects">Uygulamayi kesfet</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] lg:px-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Blocks size={18} />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.28em] text-slate-950">SYNORQ</div>
                <div className="text-xs text-slate-500">Projects Module</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-slate-950">Modul</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {["Genel bakis", "Ozellikler", "Demo"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <ChevronRight size={14} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-slate-950">Platform</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {["Synorq Projects", "Synorq Ops", "AI Workflows"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <ChevronRight size={14} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-black text-slate-950">Kurumsal</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>Guvenlik</div>
              <div>KVKK ve Gizlilik</div>
              <div>Iletisim</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
