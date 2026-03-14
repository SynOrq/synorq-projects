"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RiskRecord = {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "critical";
  recommendation: string;
  status: string;
  ownerName: string;
  ownerId: string | null;
  dueDate: Date | null;
  taskTitle: string | null;
  taskId: string | null;
  impact: string;
  likelihood: string;
};

type Option = {
  value: string;
  label: string;
};

type Props = {
  projectId: string;
  items: RiskRecord[];
  ownerOptions: Option[];
  taskOptions: Option[];
};

const statusOptions: Option[] = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATING", label: "Mitigating" },
  { value: "WATCH", label: "Watch" },
  { value: "CLOSED", label: "Closed" },
];

const levelOptions: Option[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function toDateInput(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function RiskManager({ projectId, items, ownerOptions, taskOptions }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [impact, setImpact] = useState("MEDIUM");
  const [likelihood, setLikelihood] = useState("MEDIUM");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRisk = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  function resetForm() {
    setSelectedId(null);
    setTitle("");
    setDescription("");
    setStatus("OPEN");
    setImpact("MEDIUM");
    setLikelihood("MEDIUM");
    setMitigationPlan("");
    setOwnerId("");
    setTaskId("");
    setDueDate("");
  }

  function startEdit(item: RiskRecord) {
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.detail);
    setStatus(item.status);
    setImpact(item.impact);
    setLikelihood(item.likelihood);
    setMitigationPlan(item.recommendation);
    setOwnerId(item.ownerId ?? "");
    setTaskId(item.taskId ?? "");
    setDueDate(toDateInput(item.dueDate));
    setError(null);
    setMessage(null);
  }

  function saveRisk() {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const endpoint = selectedId ? `/api/projects/${projectId}/risks/${selectedId}` : `/api/projects/${projectId}/risks`;
        const res = await fetch(endpoint, {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            status,
            impact,
            likelihood,
            mitigationPlan,
            ownerId,
            taskId,
            dueDate,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Risk kaydedilemedi.");

        setMessage(selectedId ? "Risk guncellendi." : "Risk kaydi olusturuldu.");
        resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Risk kaydedilemedi.");
      }
    });
  }

  function deleteRisk(id: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/projects/${projectId}/risks/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Risk silinemedi.");

        setMessage("Risk silindi.");
        if (selectedId === id) resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Risk silinemedi.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <ShieldAlert size={18} className="text-red-500" />
            Risk register
          </div>
          <Button type="button" size="sm" variant="outline" onClick={resetForm}>
            <Plus size={14} />
            Yeni risk
          </Button>
        </div>
        <div className="mt-5 space-y-3">
          {items.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Bu proje icin kritik risk sinyali algilanmadi.
            </div>
          )}
          {items.map((risk) => (
            <div key={risk.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-black text-slate-950">{risk.title}</div>
                <Badge variant={risk.severity === "critical" ? "danger" : "warning"}>{risk.severity}</Badge>
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{risk.detail}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white px-2.5 py-1">{risk.status}</span>
                <span className="rounded-full bg-white px-2.5 py-1">Impact {risk.impact}</span>
                <span className="rounded-full bg-white px-2.5 py-1">Likelihood {risk.likelihood}</span>
                <span className="rounded-full bg-white px-2.5 py-1">{risk.ownerName}</span>
                {risk.taskTitle && <span className="rounded-full bg-white px-2.5 py-1">{risk.taskTitle}</span>}
                {risk.dueDate && <span className="rounded-full bg-white px-2.5 py-1">{toDateInput(risk.dueDate)}</span>}
              </div>
              <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">{risk.recommendation}</div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(risk)}>
                  <Pencil size={14} />
                  Duzenle
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => deleteRisk(risk.id)}>
                  <Trash2 size={14} />
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-black text-slate-950">{selectedRisk ? "Risk duzenle" : "Risk olustur"}</div>
        <div className="mt-5 space-y-4">
          <Field label="Title" value={title} onChange={setTitle} disabled={isPending} />
          <TextAreaField label="Description" value={description} onChange={setDescription} disabled={isPending} rows={4} />
          <TextAreaField label="Mitigation plan" value={mitigationPlan} onChange={setMitigationPlan} disabled={isPending} rows={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Status" value={status} onChange={setStatus} options={statusOptions} disabled={isPending} />
            <SelectField label="Owner" value={ownerId} onChange={setOwnerId} options={[{ value: "", label: "Unassigned" }, ...ownerOptions]} disabled={isPending} />
            <SelectField label="Impact" value={impact} onChange={setImpact} options={levelOptions} disabled={isPending} />
            <SelectField label="Likelihood" value={likelihood} onChange={setLikelihood} options={levelOptions} disabled={isPending} />
            <SelectField label="Linked task" value={taskId} onChange={setTaskId} options={[{ value: "", label: "No linked task" }, ...taskOptions]} disabled={isPending} />
            <Field label="Due date" type="date" value={dueDate} onChange={setDueDate} disabled={isPending} />
          </div>
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={saveRisk} loading={isPending}>
              {selectedRisk ? "Risk guncelle" : "Risk olustur"}
            </Button>
            {selectedRisk && <Button type="button" variant="ghost" onClick={resetForm}>Iptal</Button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Option[]; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, disabled, rows }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; rows: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} disabled={disabled} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" />
    </div>
  );
}
