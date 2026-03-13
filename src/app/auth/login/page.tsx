"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Blocks, CheckCheck, LockKeyhole, UsersRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const proofPoints = [
  "Rol bazli workspace erisimi",
  "Proje ve teslim gorunurlugu",
  "Yorum, alt gorev ve dosya baglami",
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
      setError("E-posta veya sifre hatali.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#10203a_52%,#0f172a_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative flex items-center gap-3 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <Blocks size={20} />
            </div>
            <div>
              <div className="text-sm font-black tracking-[0.28em]">SYNORQ</div>
              <div className="text-xs text-slate-300">Projects Operating System</div>
            </div>
          </div>

          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <LockKeyhole size={14} />
              Secure Workspace Access
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[0.94] tracking-tight text-white">
              Operasyon gorunurlugunu kaldiginiz yerden devam ettirin.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Synorq Projects, ekip koordinasyonunu, proje yurutmesini ve teslim gorunurlugunu tek calisma yuzeyinde birlestirir.
            </p>

            <div className="mt-8 grid gap-3">
              {proofPoints.map((item, index) => {
                const icons = [UsersRound, CheckCheck, ArrowRight];
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
          </div>

          <div className="relative rounded-[28px] border border-white/10 bg-white/6 p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Use it for</div>
            <div className="mt-3 text-lg font-black">Ajans operasyonu, urun sprintleri, cok paydasli teslim akislari</div>
          </div>
        </section>

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
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Login</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Workspace hesabiniza girin</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Proje ritmini, ekip sinyallerini ve teslim gorunurlugunu kaldiginiz yerden yonetin.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <Input
                  name="email"
                  type="email"
                  label="E-posta"
                  placeholder="email@sirket.com"
                  required
                  autoComplete="email"
                />
                <Input
                  name="password"
                  type="password"
                  label="Sifre"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />

                {error && (
                  <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                )}

                <Button type="submit" className="mt-2 w-full" loading={loading}>
                  Giris Yap
                </Button>
              </form>

              <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Hesabiniz yoksa yeni bir workspace kurup ekibinizi davet ederek baslayabilirsiniz.
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                Hesabiniz yok mu?{" "}
                <Link href="/auth/register" className="font-semibold text-indigo-600 hover:underline">
                  Ucretsiz hesap olustur
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
