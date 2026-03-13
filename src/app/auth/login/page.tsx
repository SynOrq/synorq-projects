"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-500 items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <svg width="26" height="26" viewBox="0 0 176 176" fill="none">
              <path d="M88 54L122 88L88 122L54 88L88 54Z" stroke="white" strokeWidth="8" strokeLinejoin="round" fill="none"/>
              <circle cx="88" cy="88" r="11" fill="white"/>
              <path d="M88 54V69" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <path d="M122 88H107" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <path d="M88 122V107" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <path d="M54 88H69" stroke="white" strokeWidth="8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Synorq <span className="text-indigo-600">Projects</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Hesabınıza giriş yapın</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              label="Şifre"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Giriş Yap
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Hesabınız yok mu?{" "}
            <Link href="/auth/register" className="text-indigo-600 font-semibold hover:underline">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
