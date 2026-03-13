import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Building, Palette, LogOut } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
  });

  if (!workspace) redirect("/auth/login");

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/auth/login" });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <SettingsIcon className="text-gray-500" />
          Ayarlar
        </h1>
        <p className="text-gray-500 text-sm mt-1">Hesap ve çalışma alanı tercihlerinizi yönetin.</p>
      </div>

      <div className="space-y-6">
        {/* Workspace Ayarları */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building size={20} className="text-indigo-600" /> Çalışma Alanı
          </h2>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Alan Adı</label>
              <input
                type="text"
                defaultValue={workspace.name}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Alan Açıklaması</label>
              <textarea
                defaultValue={workspace.description || ""}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Çalışma alanı hakkında detay ekleyin..."
              />
            </div>
            <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Değişiklikleri Kaydet
            </button>
          </div>
        </section>

        {/* Profil Ayarları */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-emerald-600" /> Profil
          </h2>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adınız</label>
              <input
                type="text"
                defaultValue={session.user?.name || ""}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                defaultValue={session.user?.email || ""}
                disabled
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">E-posta adresiniz hesabınız için oluşturulmuş olduğundan değiştirilemez.</p>
            </div>
            <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
              Profili Güncelle
            </button>
          </div>
        </section>

        {/* Görünüm */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Palette size={20} className="text-orange-600" /> Görünüm (Yakında)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Uygulamanın temasını ve arayüz seçeneklerinizi buradan yapılandırabileceksiniz.</p>
          <div className="flex items-center gap-3">
            <button disabled className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 cursor-not-allowed">Açık Tema</button>
            <button disabled className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 cursor-not-allowed">Koyu Tema</button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <LogOut size={20} className="text-red-600" /> Oturum
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Mevcut oturumu güvenli şekilde kapatıp giriş ekranına dönebilirsiniz.
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="danger">
              <LogOut size={15} />
              Çıkış Yap
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
