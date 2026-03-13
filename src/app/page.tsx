import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Blocks,
  ChartNoAxesColumnIncreasing,
  CheckCheck,
  ChevronRight,
  Gauge,
  LayoutPanelTop,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const audienceCards = [
  ["Yazilim ajanslari", "Cok paydasli teslim sureclerinde ekip akisini ve musteri beklentisini tek yerde toplayin."],
  ["Urun ekipleri", "Sprint ritmini, gorev sahipligini ve teslim riskini operasyon paneli uzerinden yonetin."],
  ["Operasyon liderleri", "Portfoyu ust seviyede okuyun, detay seviyesinde aksiyonu kacirmayin."],
];

const painPoints = [
  "Gorevler Slack, Notion, mesajlasma ve tablo dosyalari arasinda daginik kalir.",
  "Kimin neyi sahiplendigi gec netlesir ve gecikmeler son anda gorunur olur.",
  "Yonetici ve musteri gorunurlugu dusuk oldugu icin teslim riski buyuyerek fark edilir.",
];

const outcomes = [
  "Projeler, ekip sorumluluklari ve teslim riski tek operasyon panelinde gorunur olur.",
  "Rol bazli erisim ile workspace disiplini korunur, yorum ve aktivite izi kaybolmaz.",
  "Gorevten alt goreve ve dosyaya kadar tum akis ayni baglam icinde izlenir.",
];

const capabilities = [
  ["Portfolio Visibility", "Aktif, bekleyen ve riskli projeleri tek cercevede gorun."],
  ["Execution Control", "Alt gorev, yorum ve dosya akisini is baglamindan koparmayin."],
  ["Role Governance", "Admin, uye ve izleyici katmanlariyla workspace disiplinini koruyun."],
  ["Delivery Intelligence", "Teslim riskini gec degil, erken fark edin."],
];

const trustItems = [
  "Rol bazli erisim ve workspace izolasyonu",
  "Yorum, degisiklik ve aktivite iziyle denetlenebilir akis",
  "Ekip buyudukce bozulmayan operasyon disiplini",
];

const faqs = [
  ["Synorq kimler icin uygundur?", "Ajanslar, urun ekipleri ve cok paydasli teslim surecleri olan yapilar icin tasarlanir."],
  ["Jira veya Trello yerine mi gecer?", "Amaç yalnizca kart yonetimi degil; operasyon gorunurlugu ve governance katmani sunmaktir."],
  ["Rol bazli yetkilendirme var mi?", "Evet. Workspace duzeyinde admin, uye ve izleyici rolleri desteklenir."],
];

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#0f1d34_42%,#edf3fb_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/8 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Blocks size={18} />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.28em]">SYNORQ</div>
                <div className="text-xs text-slate-300">Projects Operating System</div>
              </div>
            </div>

            <nav className="hidden items-center gap-6 lg:flex">
              {[
                ["Urun", "#urun"],
                ["Cozumler", "#cozumler"],
                ["Fiyatlandirma", "#fiyatlandirma"],
                ["Kaynaklar", "#sss"],
                ["Demo", "#demo"],
              ].map(([label, href]) => (
                <a key={href} href={href} className="text-sm font-medium text-slate-200 transition hover:text-white">
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/login">Giris Yap</Link>
              </Button>
              <Button asChild className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                <Link href="/auth/register">Ucretsiz Dene</Link>
              </Button>
            </div>
          </header>

          <section className="grid gap-14 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                <LayoutPanelTop size={14} />
                Operasyon gorunurlugu odakli
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl">
                Projeleri, ekip ritmini ve teslim risklerini tek ekranda yonetin.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
                Ajanslar ve urun ekipleri icin proje gorunurlugunu, ekip koordinasyonunu, rol bazli calisma alanini
                ve gorevten dosyaya kadar izlenebilirligi tek operasyon yuzeyinde birlestirin.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300">
                  <Link href="/auth/register">
                    Ucretsiz Dene
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/15 bg-white/6 px-6 text-white hover:bg-white/10 hover:text-white">
                  <a href="#demo">Canli Demo Talep Et</a>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white">
                  <Link href="/auth/login">Ornek Workspace Gor</Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {["Proje gorunurlugu", "Rol bazli ekip koordinasyonu", "Teslim riski kontrolu"].map((item) => (
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
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Urun gorunumu</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">Portfolio control panel</div>
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
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Dashboard</div>
                        <div className="mt-2 text-lg font-black">Portfoy ve risk gorunurlugu</div>
                      </div>
                      <Gauge size={18} className="text-cyan-300" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {[
                        ["12", "aktif"],
                        ["08", "risk"],
                        ["19", "yorum"],
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-2xl bg-white/8 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
                          <div className="mt-2 text-2xl font-black">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 space-y-3 rounded-2xl bg-white/6 p-4">
                      {[
                        ["Website Replatform", "Incelemede"],
                        ["CRM Rollout", "Devam ediyor"],
                        ["Mobile Sprint", "Tamamlandi"],
                      ].map(([title, status]) => (
                        <div key={title} className="flex items-center justify-between rounded-2xl bg-white/8 px-3 py-3">
                          <div>
                            <div className="font-semibold">{title}</div>
                            <div className="text-xs text-slate-300">teslim ve ekip takibi aktif</div>
                          </div>
                          <div className="text-xs font-semibold text-cyan-200">{status}</div>
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
                          ["Frontend", "Uye"],
                          ["Musteri Temsilcisi", "Izleyici"],
                        ].map(([name, role]) => (
                          <div key={name} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm">
                            <div>
                              <div className="font-semibold text-slate-900">{name}</div>
                              <div className="text-xs text-slate-500">workspace erisimi tanimli</div>
                            </div>
                            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CheckCheck size={15} className="text-emerald-600" />
                        Gorev baglami
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Alt gorevler ve dosyalar ayni akis icinde tutulur.</div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Yorum ve aktivite izi karar gecmisini gorunur kilar.</div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">Teslim riski ekip seviyesinde erken okunur.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section id="cozumler" className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kimin icin?</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Her ekip icin degil. Operasyon netligi arayan ekipler icin.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Synorq, sadece kart tasiyan ekipler icin degil; gorunurluk, sahiplik ve teslim disiplini isteyen yapilar icin tasarlanir.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {audienceCards.map(([title, description]) => (
            <div key={title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
              <div className="text-lg font-black text-slate-950">{title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[34px] border border-red-100 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Bugun</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Daginik arac akisi teslim kalitesini dusurur.</h2>
            <div className="mt-6 space-y-3">
              {painPoints.map((item) => (
                <div key={item} className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-7 text-slate-700">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-emerald-100 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Synorq ile</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Operasyon gorunurlugu karar kalitesine donusur.</h2>
            <div className="mt-6 space-y-3">
              {outcomes.map((item) => (
                <div key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-7 text-slate-700">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="urun" className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Operating System yaklasimi</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Gorev yonetiminden fazlasi: gorunurluk, governance ve teslim zekasi.</h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {capabilities.map(([eyebrow, text], index) => {
            const icons = [ChartNoAxesColumnIncreasing, CheckCheck, ShieldCheck, Gauge];
            const Icon = icons[index];
            return (
              <div key={eyebrow} className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon size={18} />
                </div>
                <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>
                <p className="mt-3 text-lg font-black text-slate-950">{text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Neden farkli?</div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Kart takibi yerine operasyon gorunurlugu ve yonetim katmani.
            </h2>
          </div>
          <div className="mt-8 space-y-4">
            {[
              ["Daginik arac seti", "Notlar, mesajlar ve gorevler farkli yerlerde kalir.", "Synorq proje, rol, yorum ve teslim gorunurlugunu tek panelde birlestirir."],
              ["Kart bazli takip", "Gorev vardir ama yonetim katmani sinyali zayiftir.", "Portfoy gorunurlugu ile uygulama akisi ayni urun yapisinda tutulur."],
              ["Belirsiz sahiplik", "Risk buyudugunde fark edilir.", "Rol disiplini ve gorev sahipligi erken netlesir."],
            ].map(([title, oldWay, synorqWay]) => (
              <div key={title} className="grid gap-4 rounded-[28px] bg-slate-50 p-5 lg:grid-cols-[0.8fr_1fr_1fr]">
                <div className="text-sm font-black text-slate-950">{title}</div>
                <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">{oldWay}</div>
                <div className="rounded-2xl bg-slate-950 px-4 py-4 text-sm leading-7 text-slate-200">{synorqWay}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <LockKeyhole size={16} className="text-emerald-600" />
              Trust and Security
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">B2B ekiplerin baktigi guven katmani urune gomulu gelir.</h2>
            <div className="mt-6 space-y-3">
              {trustItems.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">{item}</div>
              ))}
            </div>
          </div>
          <div id="demo" className="rounded-[34px] bg-slate-950 p-8 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.8)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Demo akisi</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Kendi ekibinize uygun kullanim senaryosunu gorun.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">Canli demo veya ucretsiz deneme ile ekibinize uygun operasyon akisini hizla kurun.</p>
            <div className="mt-6 space-y-3">
              <Button asChild size="lg" className="w-full rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <Link href="/auth/register">Canli Demo Talep Et</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-full border-white/15 bg-white/6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/register">14 Gun Ucretsiz Basla</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full rounded-full text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/login">Ornek Workspace Gor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="fiyatlandirma" className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Plan cercevesi</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Starter, Growth ve Enterprise yapisi demo ile netlesir.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">Fiyatlari uydurmak yerine plan mantigini acik gosteriyoruz: kucuk ekipler, buyuyen ekipler ve kurumsal yapilar icin farkli onboarding akislari.</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            ["Starter", "Temel proje gorunurlugu ve ekip akisi."],
            ["Growth", "Rol yonetimi, raporlama ve teslim sinyalleri."],
            ["Enterprise", "Cok paydasli operasyon ve yonetim gorunurlugu."],
          ].map(([title, text], index) => (
            <div key={title} className={`rounded-[32px] border p-7 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)] ${index === 1 ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${index === 1 ? "text-cyan-300" : "text-slate-400"}`}>{title}</div>
              <div className="mt-4 text-3xl font-black">{title}</div>
              <p className={`mt-4 text-sm leading-7 ${index === 1 ? "text-slate-300" : "text-slate-600"}`}>{text}</p>
              <Button asChild className={`mt-6 w-full rounded-full ${index === 1 ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : ""}`} variant={index === 1 ? "default" : "outline"}>
                <a href="#demo">{index === 1 ? "Canli Demo Talep Et" : "Detaylari Gor"}</a>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section id="sss" className="mx-auto max-w-7xl px-6 pb-24 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">FAQ</div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Karar friksiyonunu dusuren temel sorular.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
                <div className="text-lg font-black text-slate-950">{question}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
              </div>
            ))}
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
                <div className="text-xs text-slate-500">Projects Operating System</div>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">Proje gorunurlugu, ekip koordinasyonu ve teslim riskini ayni operasyon katmaninda birlestiren modern calisma yuzeyi.</p>
          </div>
          <div>
            <div className="text-sm font-black text-slate-950">Urun</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {["Ozellikler", "Fiyatlandirma", "Demo"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <ChevronRight size={14} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-950">Cozumler</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {["Ajanslar", "Urun ekipleri", "Operasyon liderleri"].map((item) => (
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
              <div>Kullanim Sartlari</div>
              <div>Iletisim</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
