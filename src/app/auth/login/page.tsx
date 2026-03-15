"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: LayoutDashboard,
    title: "Delivery Dashboard",
    desc: "Tüm portföyü tek yüzeyde izle",
  },
  {
    icon: Users2,
    title: "Ekip Kapasitesi",
    desc: "Yük dengesini ve tıkanıklıkları görüntüle",
  },
  {
    icon: ShieldCheck,
    title: "Risk İstihbaratı",
    desc: "Gecikmeden önce riskleri tespit et",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-posta veya şifre hatalı.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden bg-[#0d1117] lg:flex lg:flex-col">
          {/* Grid bg */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
          {/* Glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />

          {/* Logo */}
          <div className="relative px-10 pt-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6">
                <Blocks size={18} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.22em] text-white">SYNORQ</div>
                <div className="text-[11px] text-slate-500">Projects OS</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative flex flex-1 flex-col justify-center px-10 py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <CheckCircle2 size={11} />
              Secure workspace access
            </div>
            <h1 className="mt-5 text-[2.6rem] font-black leading-[1.08] tracking-tight text-white">
              Ekip operasyonunuzu
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                tek yüzeyde yönetin.
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-slate-400">
              Proje yürütmesi, teslim görünürlüğü ve ekip koordinasyonu — Synorq ile hepsi bir arada.
            </p>

            <div className="mt-8 space-y-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex items-center gap-4 rounded-xl border border-white/6 bg-white/4 px-4 py-3.5"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-xs text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="relative mx-10 mb-10 rounded-xl border border-white/6 bg-white/4 px-5 py-4">
            <p className="text-sm font-medium text-slate-300">
              Ajans operasyonu, ürün sprintleri, çok paydaşlı teslim akışları için tasarlandı.
            </p>
          </div>
        </section>

        {/* Right panel - Form */}
        <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
          <div className="w-full max-w-[380px]">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
                <Blocks size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.22em] text-slate-950">SYNORQ</div>
                <div className="text-[11px] text-slate-400">Projects OS</div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Hoş geldiniz</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Workspace hesabınıza giriş yapın.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input
                name="email"
                type="email"
                label="E-posta"
                placeholder="email@sirket.com"
                required
                autoComplete="email"
              />
              <div>
                <Input
                  name="password"
                  type="password"
                  label="Şifre"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <div className="mt-1.5 text-right">
                  <Link href="#" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                    Şifremi unuttum
                  </Link>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Giriş Yap
                <ArrowRight size={14} />
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">ya da</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="mt-4 text-center text-sm text-slate-500">
                Hesabınız yok mu?{" "}
                <Link href="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Ücretsiz başla
                </Link>
              </p>
            </div>

            <p className="mt-8 text-center text-[11px] text-slate-400">
              Giriş yaparak{" "}
              <Link href="#" className="underline hover:text-slate-600">Kullanım Koşulları</Link>
              {"'nı ve "}
              <Link href="#" className="underline hover:text-slate-600">Gizlilik Politikası</Link>
              {"'nı kabul etmiş olursunuz."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
