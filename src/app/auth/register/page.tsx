"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Blocks, FolderKanban, ShieldCheck, UsersRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const setupSteps = [
  "Workspace olusturun",
  "Ekip rollerini tanimlayin",
  "Projeleri ve gorev akisini baslatin",
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
      setError(json.error ?? "Kayit basarisiz.");
    } else {
      router.push("/auth/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="grid min-h-screen lg:grid-cols-[0.96fr_1.04fr]">
        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
                  <Blocks size={20} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-[0.28em] text-slate-950">SYNORQ</div>
                  <div className="text-xs text-slate-500">Projects Module</div>
                </div>
              </Link>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.45)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Get Started</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Yeni bir Synorq workspace olusturun</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Ekip koordinasyonunu, proje yurutmesini ve teslim gorunurlugunu tek calisma alaninda toplamaya bugun baslayin.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <Input name="name" label="Ad Soyad" placeholder="Adiniz Soyadiniz" required />
                <Input name="workspaceName" label="Sirket / Ekip Adi" placeholder="Ornek: North Studio" required />
                <Input name="email" type="email" label="E-posta" placeholder="email@sirket.com" required />
                <Input name="password" type="password" label="Sifre" placeholder="En az 8 karakter" required minLength={8} />

                {error && (
                  <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                )}

                <Button type="submit" className="mt-2 w-full" loading={loading}>
                  Hesap Olustur
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Zaten hesabiniz var mi?{" "}
                <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">
                  Giris yapin
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#10203a_52%,#0f172a_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative max-w-xl self-end rounded-[32px] border border-white/10 bg-white/8 p-8 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Why Synorq Projects</div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white">
              Proje yurutme katmanini ekibinize dakikalar icinde kurun.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Workspace kuruldugunda ilk proje yapisi, temel workflow kolonlari ve ekip operasyonunu tasiyacak isletim yuzeyi hazir olur.
            </p>

            <div className="mt-8 space-y-3">
              {setupSteps.map((item, index) => {
                const icons = [FolderKanban, UsersRound, ShieldCheck];
                const Icon = icons[index];
                return (
                  <div key={item} className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-medium text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                      <Icon size={16} />
                    </div>
                    {item}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/6 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Outcome</div>
              <div className="mt-3 text-lg font-black text-white">
                Dağinik proje takibi yerine okunabilir, rol bazli ve olceklenebilir bir SaaS workspace.
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <ArrowRight size={14} />
                Ilk kurulumdan sonra login ekranina yonlendirilirsiniz.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
