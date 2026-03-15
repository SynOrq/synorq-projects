"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarRange, Check, Flag, Layers3, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, PROJECT_TYPE_OPTIONS, PROJECT_VISIBILITY_OPTIONS, type Priority, type ProjectType, type ProjectVisibility } from "@/types";

type MemberOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ClientOption = {
  id: string;
  name: string;
  health: "STABLE" | "WATCH" | "AT_RISK";
};

type ProjectCreateWizardProps = {
  members: MemberOption[];
  clients: ClientOption[];
};

const STEP_META = [
  { title: "Temel bilgiler", icon: BriefcaseBusiness },
  { title: "Ekip ve template", icon: UsersRound },
  { title: "Hedefler ve teslim", icon: CalendarRange },
] as const;

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "LOW", label: "Dusuk" },
  { value: "MEDIUM", label: "Orta" },
  { value: "HIGH", label: "Yuksek" },
  { value: "URGENT", label: "Acil" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "ON_HOLD", label: "Beklemede" },
  { value: "COMPLETED", label: "Tamamlandi" },
] as const;

export default function ProjectCreateWizard({ members, clients }: ProjectCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [ownerId, setOwnerId] = useState(members[0]?.id ?? "");
  const [type, setType] = useState<ProjectType>("INTERNAL");
  const [visibility, setVisibility] = useState<ProjectVisibility>("WORKSPACE");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>(members.slice(0, 2).map((member) => member.id));
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("ACTIVE");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [tagsInput, setTagsInput] = useState("delivery, visibility");

  const tags = useMemo(
    () => tagsInput.split(",").map((item) => item.trim()).filter(Boolean),
    [tagsInput]
  );

  function toggleTeamMember(memberId: string) {
    setTeamMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  }

  function nextStep() {
    if (step === 0) {
      if (!name.trim()) {
        setError("Proje adi zorunludur.");
        return;
      }
      if (!ownerId) {
        setError("Bir proje owner secin.");
        return;
      }
    }

    if (step === 2 && dueDate && startDate && new Date(dueDate) < new Date(startDate)) {
      setError("Teslim tarihi baslangic tarihinden once olamaz.");
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, STEP_META.length - 1));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        clientId: clientId || null,
        ownerId,
        type,
        visibility,
        priority,
        teamMemberIds,
        startDate: startDate || null,
        dueDate: dueDate || null,
        status,
        color,
        tags,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Proje olusturulamadi.");
      return;
    }

    router.push(`/projects/${json.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Layers3 size={13} />
              Project Setup Wizard
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Yeni proje akisini operasyonel kurulumla baslatin.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Bu wizard proje owner, client, template, ekip ve teslim tarihlerini ilk kurulumda netlestirir. Wizard sonunda
              Synorq baslangic gorevlerini otomatik olusturur.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {STEP_META.map((item, index) => {
              const Icon = item.icon;
              const active = index === step;
              const done = index < step;
              return (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    active ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    {done ? <Check size={14} className="text-emerald-600" /> : <Icon size={14} className={active ? "text-indigo-600" : "text-slate-500"} />}
                    {item.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <Input label="Proje adi" value={name} onChange={(event) => setName(event.target.value)} placeholder="Northstar Website Relaunch" required />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Aciklama</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Teslim kapsamı, ekip ritmi ve hedefleri ozetleyin..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Client / organizasyon</label>
                  <select
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Internal / client baglama</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Proje owner</label>
                  <select
                    value={ownerId}
                    onChange={(event) => setOwnerId(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} • {member.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div>
                <div className="text-sm font-semibold text-slate-900">Proje tipi</div>
                <div className="mt-1 text-xs text-slate-500">Template ve baslangic gorev seti bu secime gore kurulacak.</div>
              </div>
              <div className="space-y-2">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      type === option.value ? "border-indigo-200 bg-white" : "border-slate-200 bg-slate-50 hover:bg-white"
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{option.description}</div>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Proje onceligi</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        priority === option.value ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck size={15} className="text-indigo-600" />
                  Visibility strategy
                </div>
                <div className="mt-3 space-y-2">
                  {PROJECT_VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        "w-full rounded-2xl border px-3 py-3 text-left transition",
                        visibility === option.value ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="text-lg font-black text-slate-950">Ekip kapsami</div>
              <p className="mt-2 text-sm text-slate-600">Baslangic gorevlerinde kullanilacak ana ekip uyelerini secin.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {members.map((member) => {
                  const selected = teamMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleTeamMember(member.id)}
                      className={cn(
                        "rounded-[24px] border px-4 py-4 text-left transition",
                        selected ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{member.email}</div>
                        </div>
                        {selected && <Check size={16} className="text-indigo-600" />}
                      </div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{member.role}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-lg font-black text-slate-950">Template kurulumu</div>
              <p className="mt-2 text-sm text-slate-600">
                Secili proje tipi icin otomatik starter task seti acilacak. Bu gorevler backlog kolonu icine dustukten sonra
                owner ve ekip tarafindan ilerletilir.
              </p>
              <div className="mt-5 space-y-3">
                {PROJECT_TYPE_OPTIONS.filter((option) => option.value === type).map((option) => (
                  <div key={option.value} className="rounded-[24px] border border-indigo-200 bg-white px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">{option.label} starter</div>
                    <div className="mt-2 text-xs text-slate-500">{option.description}</div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-indigo-700">
                      <Flag size={13} />
                      3 baslangic gorevi otomatik uretilecek
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Baslangic tarihi</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Hedef teslim tarihi</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Durum</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number]["value"])}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Etiketler</label>
                  <Input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="delivery, launch, client" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-lg font-black text-slate-950">Gorsel kimlik</div>
              <p className="mt-2 text-sm text-slate-600">Renk tek basina ana alan degil; ama proje listelerinde hizli tarama icin faydali.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PROJECT_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={cn(
                      "h-8 w-8 rounded-full border border-white transition",
                      color === swatch && "ring-2 ring-slate-400 ring-offset-2"
                    )}
                    style={{ background: swatch }}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Kurulum ozeti</div>
                <div className="mt-3 text-lg font-black text-slate-950">{name || "Yeni proje"}</div>
                <div className="mt-2 text-sm text-slate-600">
                  {PROJECT_TYPE_OPTIONS.find((option) => option.value === type)?.label} • {PRIORITY_OPTIONS.find((option) => option.value === priority)?.label} oncelik
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {PROJECT_VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label} access strategy
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => (step === 0 ? router.back() : setStep((current) => current - 1))}>
            <ArrowLeft size={14} />
            {step === 0 ? "Geri" : "Onceki adim"}
          </Button>

          {step < STEP_META.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Sonraki adim
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button type="button" loading={loading} onClick={handleSubmit}>
              Projeyi olustur
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
