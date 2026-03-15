"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROJECT_VISIBILITY_OPTIONS } from "@/lib/project-access";

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: string;
    type: string;
    visibility: string;
    priority: string;
    startDate: Date | null;
    dueDate: Date | null;
    tags: string[];
    ownerId: string | null;
    clientId: string | null;
  };
  ownerOptions: SelectOption[];
  clientOptions: SelectOption[];
};

const typeOptions: SelectOption[] = [
  { value: "WEBSITE", label: "Website" },
  { value: "MOBILE_APP", label: "Mobile app" },
  { value: "RETAINER", label: "Retainer" },
  { value: "INTERNAL", label: "Internal" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const statusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const priorityOptions: SelectOption[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

function toDateInput(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function ProjectSettingsPanel({ project, ownerOptions, clientOptions }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [status, setStatus] = useState(project.status);
  const [type, setType] = useState(project.type);
  const [visibility, setVisibility] = useState(project.visibility);
  const [priority, setPriority] = useState(project.priority);
  const [ownerId, setOwnerId] = useState(project.ownerId ?? "");
  const [clientId, setClientId] = useState(project.clientId ?? "");
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(project.dueDate));
  const [tags, setTags] = useState(project.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveProjectSettings() {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            color,
            status,
            type,
            visibility,
            priority,
            ownerId,
            clientId,
            startDate,
            dueDate,
            tags: tags
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Proje ayarlari guncellenemedi.");
        }

        setName(data.project.name);
        setDescription(data.project.description ?? "");
        setColor(data.project.color);
        setStatus(data.project.status);
        setType(data.project.type);
        setVisibility(data.project.visibility);
        setPriority(data.project.priority);
        setOwnerId(data.project.ownerId ?? "");
        setClientId(data.project.clientId ?? "");
        setStartDate(toDateInput(data.project.startDate ? new Date(data.project.startDate) : null));
        setDueDate(toDateInput(data.project.dueDate ? new Date(data.project.dueDate) : null));
        setTags((data.project.tags ?? []).join(", "));
        setMessage("Proje ayarlari guncellendi.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Proje ayarlari guncellenemedi.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Settings2 size={13} />
          Project settings
        </div>
        <h2 className="mt-3 text-xl font-black text-slate-950">Delivery setup</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Proje owner, client, timeline ve delivery metadata&apos;sini bu yuzeyden guncelleyin.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Project name" value={name} onChange={setName} disabled={isPending} />
          <Field label="Color" value={color} onChange={setColor} disabled={isPending} />
          <SelectField label="Status" value={status} onChange={setStatus} options={statusOptions} disabled={isPending} />
          <SelectField label="Type" value={type} onChange={setType} options={typeOptions} disabled={isPending} />
          <SelectField label="Visibility" value={visibility} onChange={setVisibility} options={PROJECT_VISIBILITY_OPTIONS} disabled={isPending} />
          <SelectField label="Priority" value={priority} onChange={setPriority} options={priorityOptions} disabled={isPending} />
          <SelectField label="Owner" value={ownerId} onChange={setOwnerId} options={ownerOptions} disabled={isPending} />
          <SelectField label="Client" value={clientId} onChange={setClientId} options={clientOptions} disabled={isPending} />
          <Field label="Start date" type="date" value={startDate} onChange={setStartDate} disabled={isPending} />
          <Field label="Due date" type="date" value={dueDate} onChange={setDueDate} disabled={isPending} />
          <div className="md:col-span-2">
            <Field label="Tags" value={tags} onChange={setTags} disabled={isPending} placeholder="website, launch, qa" />
          </div>
          <div className="md:col-span-2">
            <TextAreaField label="Description" value={description} onChange={setDescription} disabled={isPending} rows={5} />
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <div className="mt-5">
          <Button type="button" variant="outline" loading={isPending} onClick={saveProjectSettings}>
            Degisiklikleri kaydet
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-black text-slate-950">Governance posture</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Current status" value={statusOptions.find((item) => item.value === status)?.label ?? status} note="Delivery posture" />
            <MetricCard label="Priority" value={priorityOptions.find((item) => item.value === priority)?.label ?? priority} note="Execution pressure" />
            <MetricCard label="Visibility" value={PROJECT_VISIBILITY_OPTIONS.find((item) => item.value === visibility)?.label ?? visibility} note="Read access strategy" />
            <MetricCard label="Client binding" value={clientOptions.find((item) => item.value === clientId)?.label ?? "Internal"} note="Commercial context" />
            <MetricCard label="Ownership" value={ownerOptions.find((item) => item.value === ownerId)?.label ?? "Unassigned"} note="Single accountable owner" />
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
            <ShieldCheck size={13} />
            Delivery control
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-200">
            <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Owner ve client degisikligi audit timeline icine duser.</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Status ve priority delivery risk sinyallerini dogrudan etkiler.</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Visibility policy viewer, member ve leadership access patikalarini netlestirir.</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Timeline alanlari dashboard ve report yuzeyleriyle ayni veri modelini kullanir.</li>
          </ul>
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Eye size={18} className="text-cyan-600" />
            Visibility notes
          </div>
          <div className="mt-4 space-y-3">
            {PROJECT_VISIBILITY_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`rounded-2xl border px-4 py-4 ${
                  option.value === visibility ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-950">{option.label}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{option.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">Seciniz</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </div>
  );
}
