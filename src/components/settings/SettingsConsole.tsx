"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building, LogOut, Palette, Settings as SettingsIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

type Props = {
  initialWorkspace: {
    name: string;
    description: string | null;
    logoUrl: string | null;
  };
  initialUser: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  canManageWorkspace: boolean;
  logoutAction: () => Promise<void>;
};

export default function SettingsConsole({
  initialWorkspace,
  initialUser,
  canManageWorkspace,
  logoutAction,
}: Props) {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.name);
  const [workspaceDescription, setWorkspaceDescription] = useState(initialWorkspace.description ?? "");
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState(initialWorkspace.logoUrl ?? "");
  const [profileName, setProfileName] = useState(initialUser.name ?? "");
  const [profileImage, setProfileImage] = useState(initialUser.image ?? "");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();

  function saveWorkspace() {
    startWorkspaceTransition(async () => {
      setWorkspaceMessage(null);
      setWorkspaceError(null);

      try {
        const res = await fetch("/api/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workspaceName,
            description: workspaceDescription,
            logoUrl: workspaceLogoUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Workspace ayarlari kaydedilemedi.");
        }

        setWorkspaceName(data.workspace.name);
        setWorkspaceDescription(data.workspace.description ?? "");
        setWorkspaceLogoUrl(data.workspace.logoUrl ?? "");
        setWorkspaceMessage("Workspace kimligi guncellendi.");
        router.refresh();
      } catch (err) {
        setWorkspaceError(err instanceof Error ? err.message : "Workspace ayarlari kaydedilemedi.");
      }
    });
  }

  function saveProfile() {
    startProfileTransition(async () => {
      setProfileMessage(null);
      setProfileError(null);

      try {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: profileName, image: profileImage }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Profil guncellenemedi.");
        }

        setProfileName(data.user.name ?? "");
        setProfileImage(data.user.image ?? "");
        setProfileMessage("Profil kimligi guncellendi.");
        router.refresh();
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Profil guncellenemedi.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-950">
          <SettingsIcon className="text-slate-500" />
          Ayarlar
        </h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Hesap, workspace ve oturum tercihlerinizi tek SaaS kontrol paneli uzerinden yonetin.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
            <Building size={20} className="text-indigo-600" />
            Calisma Alani
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {workspaceLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={workspaceLogoUrl} alt={workspaceName} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
                  >
                    {workspaceName[0]?.toUpperCase() ?? "S"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Workspace kimligi</div>
                <div className="mt-1 text-xs leading-6 text-slate-500">
                  Sidebar ve shell icinde gosterilen marka yuzeyi. PNG/JPG veya public URL kullanabilirsiniz.
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Alan adi</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                disabled={!canManageWorkspace || isWorkspacePending}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Alan aciklamasi</label>
              <textarea
                value={workspaceDescription}
                onChange={(event) => setWorkspaceDescription(event.target.value)}
                rows={4}
                disabled={!canManageWorkspace || isWorkspacePending}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="Calisma alaninizin neyi yonettigini kisaca aciklayin..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Logo URL</label>
              <input
                type="url"
                value={workspaceLogoUrl}
                onChange={(event) => setWorkspaceLogoUrl(event.target.value)}
                disabled={!canManageWorkspace || isWorkspacePending}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="https://cdn.example.com/workspace-logo.png"
              />
            </div>
            {!canManageWorkspace && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Workspace ayarlari sadece owner veya admin tarafindan guncellenebilir.
              </div>
            )}
            {workspaceError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{workspaceError}</div>}
            {workspaceMessage && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{workspaceMessage}</div>}
            <Button onClick={saveWorkspace} loading={isWorkspacePending} disabled={!canManageWorkspace}>
              Degisiklikleri Kaydet
            </Button>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
            <User size={20} className="text-emerald-600" />
            Profil
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <Avatar name={profileName || initialUser.email} image={profileImage} size="lg" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Profil gorunumu</div>
                <div className="mt-1 text-xs leading-6 text-slate-500">
                  Avatar gorseli ekip listeleri, yorumlar ve uygulama ici kimlik alanlarinda kullanilir.
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Adiniz</label>
              <input
                type="text"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                disabled={isProfilePending}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Avatar URL</label>
              <input
                type="url"
                value={profileImage}
                onChange={(event) => setProfileImage(event.target.value)}
                disabled={isProfilePending}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="https://cdn.example.com/avatar.png"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">E-posta</label>
              <input
                type="email"
                value={initialUser.email ?? ""}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500"
              />
            </div>
            {profileError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{profileError}</div>}
            {profileMessage && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{profileMessage}</div>}
            <Button onClick={saveProfile} loading={isProfilePending} className="bg-emerald-600 hover:bg-emerald-700">
              Profili Guncelle
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-950">
            <Palette size={20} className="text-orange-600" />
            Gorunum
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Tema secenekleri ve kiyaslamali layout tercihleri sonraki surumde bu ekrana eklenecek. Su an urun,
            Synorq platformunun light-first SaaS tasarim sistemiyle calisiyor.
          </p>
        </section>

        <section className="rounded-[30px] border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-slate-950">
            <LogOut size={20} className="text-red-600" />
            Oturum
          </h2>
          <p className="mb-4 text-sm leading-7 text-slate-600">
            Mevcut oturumu guvenli sekilde kapatip giris ekranina donebilirsiniz.
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="danger">
              <LogOut size={15} />
              Cikis Yap
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
