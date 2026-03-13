import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Blocks,
  ChartNoAxesCombined,
  FolderGit2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const valueProps = [
  {
    icon: FolderGit2,
    title: "Net proje görünürlüğü",
    description: "Sprint, teslim tarihi ve blokajları aynı ekran üzerinde yönetin.",
  },
  {
    icon: UsersRound,
    title: "Ekibi bağlayan iş akışı",
    description: "Rol bazlı erişim, görev sahipliği ve karar geçmişi kopmadan ilerler.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Canlı operasyon raporu",
    description: "Durum dağılımı, tamamlama eğilimi ve iş yükünü anında okuyun.",
  },
  {
    icon: BellRing,
    title: "Aksiyon odaklı takip",
    description: "Görev hareketleri, yorumlar ve teslim riskleri bağlamıyla görünür kalır.",
  },
];

const featureRows = [
  {
    eyebrow: "Delivery Control",
    title: "Kanban, raporlama ve görev detayı tek akışta.",
    body: "Synorq Projects; proje kartları, ekip erişimi, alt görevler ve ek dosyaları tek bir operasyon katmanında toplar.",
    bullets: ["Durum ve öncelik tabanlı izleme", "Görev içi yorum, aktivite ve teslim geçmişi", "Workspace bazlı ekip organizasyonu"],
  },
  {
    eyebrow: "Execution Rhythm",
    title: "Toplantıda konuşulanlar doğrudan uygulamaya dönsün.",
    body: "Yönetici kararları ile ekip uygulaması arasında boşluk bırakmayan, hızlı ve okunabilir bir çalışma yüzeyi.",
    bullets: ["Görev sahibi ve teslim tarihi netliği", "Projeler için filtrelenebilir görünüm", "Büyüyen ekipler için rol kurgusu"],
  },
];

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-100" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-gradient-to-b from-cyan-200/30 to-transparent" />

        <header className="flex items-center justify-between rounded-full border border-white/60 bg-white/80 px-5 py-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/25">
              <Blocks size={18} />
            </div>
            <div>
              <div className="text-sm font-black tracking-[0.28em] text-slate-900">SYNORQ</div>
              <div className="text-xs text-slate-500">Projects Operating System</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Giriş Yap</Link>
            </Button>
            <Button asChild className="rounded-full px-5">
              <Link href="/auth/register">
                Workspace Kur
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-10 pb-10 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              <Sparkles size={14} />
              İş Takibini Yönetim Kararına Çevirin
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl">
              Ekip, proje ve görev trafiğini tek landing’den yönetin.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Synorq Projects; modern ekipler için proje görünürlüğü, rol kontrollü işbirliği ve karar geçmişini aynı ürün akışında birleştirir.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/auth/register">
                  Ücretsiz Başla
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/70 bg-white/80 px-6 backdrop-blur">
                <Link href="/auth/login">Demo Workspace&apos;e Gir</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
                <div className="text-3xl font-black text-slate-950">4x</div>
                <div className="mt-1 text-sm text-slate-600">daha okunabilir proje durumu</div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
                <div className="text-3xl font-black text-slate-950">1 panel</div>
                <div className="mt-1 text-sm text-slate-600">alt görev, dosya ve yorum geçmişi</div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
                <div className="text-3xl font-black text-slate-950">Rol bazlı</div>
                <div className="mt-1 text-sm text-slate-600">ekip kontrolü ve erişim mantığı</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 top-12 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="absolute -left-10 bottom-8 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />

            <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">Mission Control</div>
                    <div className="mt-2 text-2xl font-black">Haftalık teslim ritmi</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                    <div className="text-xs text-slate-300">Tamamlanan</div>
                    <div className="text-xl font-black">76%</div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="text-xs text-slate-300">Aktif Proje</div>
                    <div className="mt-2 text-3xl font-black">12</div>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="text-xs text-slate-300">Riskli Görev</div>
                    <div className="mt-2 text-3xl font-black text-amber-300">08</div>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="text-xs text-slate-300">Bekleyen Yorum</div>
                    <div className="mt-2 text-3xl font-black text-cyan-300">19</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Team Flow</div>
                  <div className="mt-4 space-y-3">
                    {[
                      ["Ürün Lansmanı", "İncelemede", "bg-amber-100 text-amber-700"],
                      ["Müşteri Portalı", "Devam ediyor", "bg-sky-100 text-sky-700"],
                      ["Mobil Revizyon", "Tamamlandı", "bg-emerald-100 text-emerald-700"],
                    ].map(([title, status, tone]) => (
                      <div key={title} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div>
                          <div className="font-semibold text-slate-900">{title}</div>
                          <div className="text-xs text-slate-500">Ekip koordinasyonu aktif</div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      Rol Kontrollü Ekip
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Admin, üye ve izleyici erişimleriyle workspace sınırlarını korunmuş halde tutun.
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Task Insight</div>
                    <div className="mt-3 text-2xl font-black text-slate-950">Alt görev + ek dosya</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Dağınık görev açıklamaları yerine parçalanmış yapılacaklar ve bağlanmış kaynaklar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {valueProps.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon size={18} />
              </div>
              <h2 className="mt-5 text-lg font-black text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 sm:px-8 lg:grid-cols-2 lg:px-10">
        {featureRows.map((row) => (
          <div key={row.title} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{row.eyebrow}</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{row.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{row.body}</p>
            <div className="mt-6 space-y-3">
              {row.bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  {bullet}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
