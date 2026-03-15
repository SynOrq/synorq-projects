"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Blocks, CheckCircle2, FolderKanban, ShieldCheck, UsersRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: FolderKanban,  title: "Workspace oluşturun", desc: "Ekibinizi ve projelerinizi tek çatı altında toplayın" },
  { icon: UsersRound,    title: "Ekip rollerini tanımlayın", desc: "Admin, üye ve görüntüleyici erişim seviyeleri" },
  { icon: ShieldCheck,   title: "Teslim akışını başlatın", desc: "Görevler, riskler ve milestone takibi hazır" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      workspaceName: fd.get("workspaceName"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Kayıt başarısız.");
    } else {
      router.push("/auth/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left - Form */}
        <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
          <div className="w-full max-w-[380px]">
            <Link href="/" className="mb-8 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
                <Blocks size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.22em] text-slate-950">SYNORQ</div>
                <div className="text-[11px] text-slate-400">Projects OS</div>
              </div>
            </Link>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Workspace oluşturun</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Ücretsiz başlayın, ekibinizi dakikalar içinde kurun.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input name="name" label="Ad Soyad" placeholder="Adınız Soyadınız" required />
              <Input name="workspaceName" label="Şirket / Ekip Adı" placeholder="Örnek: North Studio" required />
              <Input name="email" type="email" label="E-posta" placeholder="email@sirket.com" required autoComplete="email" />
              <Input
                name="password"
                type="password"
                label="Şifre"
                placeholder="En az 8 karakter"
                required
                minLength={8}
                hint="En az 8 karakter, harf ve rakam içermeli"
              />

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Hesap Oluştur
                <ArrowRight size={14} />
              </Button>
            </form>

            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                <p className="text-xs text-slate-500">
                  Kredi kartı gerekmez. Ücretsiz plan ile sınırsız proje oluşturabilirsiniz.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              Zaten hesabınız var mı?{" "}
              <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                Giriş yapın
              </Link>
            </p>
          </div>
        </section>

        {/* Right - Feature panel */}
        <section className="relative hidden overflow-hidden bg-[#0d1117] lg:flex lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-indigo-500/8 blur-3xl" />

          <div className="relative flex flex-1 flex-col justify-center px-12 py-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400 w-fit">
              <CheckCircle2 size={11} />
              Dakikalar içinde hazır
            </div>

            <h2 className="mt-5 text-[2.4rem] font-black leading-[1.1] tracking-tight text-white">
              Dağınık proje takibi yerine{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                okunabilir workspace.
              </span>
            </h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-slate-400">
              Workspace kurulduğunda temel workflow, risk takibi ve ekip operasyon yüzeyi hazır olur.
            </p>

            <div className="mt-8 space-y-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex items-center gap-4 rounded-xl border border-white/6 bg-white/4 px-4 py-3.5"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="text-xs text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-xl border border-white/6 bg-white/4 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outcome</p>
              <p className="mt-2 text-base font-semibold text-slate-200">
                Ajans operasyonu, ürün sprintleri, çok paydaşlı teslim akışları için tasarlandı.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-indigo-400">
                <ArrowRight size={13} />
                İlk kurulumdan sonra login ekranına yönlendirilirsiniz.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
