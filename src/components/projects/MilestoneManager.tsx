"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MilestoneRecord = {
  id: string;
  title: string;
  description: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
  dueDate: Date | null;
  ownerId: string | null;
  ownerName: string;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  taskIds: string[];
};

type Option = {
  value: string;
  label: string;
};

type Props = {
  projectId: string;
  items: MilestoneRecord[];
  ownerOptions: Option[];
  taskOptions: Option[];
};

const statusOptions: Option[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "AT_RISK", label: "At risk" },
  { value: "COMPLETED", label: "Completed" },
];

function toDateInput(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function milestoneBadge(status: MilestoneRecord["status"]) {
  if (status === "AT_RISK") return "danger" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "COMPLETED") return "success" as const;
  return "secondary" as const;
}

export default function MilestoneManager({ projectId, items, ownerOptions, taskOptions }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<MilestoneRecord["status"]>("PLANNED");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedMilestone = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  function resetForm() {
    setSelectedId(null);
    setTitle("");
    setDescription("");
    setStatus("PLANNED");
    setDueDate("");
    setOwnerId("");
    setTaskIds([]);
  }

  function startEdit(item: MilestoneRecord) {
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStatus(item.status);
    setDueDate(toDateInput(item.dueDate));
    setOwnerId(item.ownerId ?? "");
    setTaskIds(item.taskIds);
    setError(null);
    setMessage(null);
  }

  function toggleTask(taskId: string) {
    setTaskIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
  }

  function saveMilestone() {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const endpoint = selectedId ? `/api/projects/${projectId}/milestones/${selectedId}` : `/api/projects/${projectId}/milestones`;
        const res = await fetch(endpoint, {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, status, dueDate, ownerId, taskIds }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Milestone kaydedilemedi.");

        setMessage(selectedId ? "Milestone guncellendi." : "Milestone olusturuldu.");
        resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Milestone kaydedilemedi.");
      }
    });
  }

  function deleteMilestone(id: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Milestone silinemedi.");

        setMessage("Milestone silindi.");
        if (selectedId === id) resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Milestone silinemedi.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <CalendarRange size={18} className="text-indigo-600" />
            Milestone timeline
          </div>
          <Button type="button" size="sm" variant="outline" onClick={resetForm}>
            <Plus size={14} />
            Yeni milestone
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {items.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Bu proje icin milestone tanimi bulunmuyor.
            </div>
          )}
          {items.map((milestone) => (
            <div key={milestone.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-950">{milestone.title}</div>
                    <Badge variant={milestoneBadge(milestone.status)}>{milestone.status}</Badge>
                  </div>
                  {milestone.description && <div className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</div>}
                </div>
                <div className="text-xs text-slate-500">{milestone.dueDate ? toDateInput(milestone.dueDate) : "Plansiz"}</div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-xs text-slate-400">Owner</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{milestone.ownerName}</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-xs text-slate-400">Linked tasks</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {milestone.completedTaskCount} / {milestone.taskCount}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-xs text-slate-400">Progress</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">%{milestone.progress}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(milestone)}>
                  <Pencil size={14} />
                  Duzenle
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => deleteMilestone(milestone.id)}>
                  <Trash2 size={14} />
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-black text-slate-950">{selectedMilestone ? "Milestone duzenle" : "Milestone olustur"}</div>
        <div className="mt-5 space-y-4">
          <Field label="Title" value={title} onChange={setTitle} disabled={isPending} />
          <TextAreaField label="Description" value={description} onChange={setDescription} disabled={isPending} rows={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Status" value={status} onChange={(value) => setStatus(value as MilestoneRecord["status"])} options={statusOptions} disabled={isPending} />
            <SelectField label="Owner" value={ownerId} onChange={setOwnerId} options={[{ value: "", label: "Unassigned" }, ...ownerOptions]} disabled={isPending} />
            <Field label="Due date" type="date" value={dueDate} onChange={setDueDate} disabled={isPending} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">Linked tasks</div>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-[24px] border border-slate-200 bg-slate-50 p-3">
              {taskOptions.map((task) => (
                <label key={task.value} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={taskIds.includes(task.value)} onChange={() => toggleTask(task.value)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>{task.label}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={saveMilestone} loading={isPending}>
              {selectedMilestone ? "Milestone guncelle" : "Milestone olustur"}
            </Button>
            {selectedMilestone && <Button type="button" variant="ghost" onClick={resetForm}>Iptal</Button>}
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
