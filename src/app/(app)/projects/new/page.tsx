"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PROJECT_COLORS } from "@/types";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        color,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Proje oluşturulamadı.");
    } else {
      router.push(`/projects/${json.id}`);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Yeni Proje</h1>
        <p className="text-sm text-gray-500 mt-1">Proje bilgilerini girin</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input name="name" label="Proje Adı" placeholder="Proje adı" required />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Açıklama</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Projeyi kısaca açıklayın..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Renk</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color === c && "ring-2 ring-offset-2 ring-gray-400 scale-110"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              İptal
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Proje Oluştur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
