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
  projectStartDate: Date | null;
  projectDueDate: Date | null;
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

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function milestoneBadge(status: MilestoneRecord["status"]) {
  if (status === "AT_RISK") return "danger" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "COMPLETED") return "success" as const;
  return "secondary" as const;
}

export default function MilestoneManager({
  projectId,
  items,
  ownerOptions,
  taskOptions,
  projectStartDate,
  projectDueDate,
}: Props) {
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
  const timelineModel = useMemo(() => {
    const datedMilestones = items
      .filter((item) => item.dueDate)
      .map((item) => ({ ...item, dueDate: startOfDay(new Date(item.dueDate!)) }))
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

    if (datedMilestones.length === 0) return null;

    const today = startOfDay(new Date());
    const startCandidates = [
      projectStartDate ? startOfDay(new Date(projectStartDate)) : null,
      datedMilestones[0].dueDate,
      today,
    ].filter((value): value is Date => Boolean(value));
    const endCandidates = [
      projectDueDate ? startOfDay(new Date(projectDueDate)) : null,
      datedMilestones[datedMilestones.length - 1].dueDate,
      today,
    ].filter((value): value is Date => Boolean(value));

    let start = new Date(Math.min(...startCandidates.map((value) => value.getTime())));
    let end = new Date(Math.max(...endCandidates.map((value) => value.getTime())));
    if (start.getTime() === end.getTime()) {
      start = new Date(start.getTime() - 3 * 86400000);
      end = new Date(end.getTime() + 3 * 86400000);
    }

    const totalRange = end.getTime() - start.getTime();
    const points = datedMilestones.map((item, index) => ({
      ...item,
      lane: index % 3,
      offset: ((item.dueDate.getTime() - start.getTime()) / totalRange) * 100,
      isLate: item.dueDate.getTime() < today.getTime() && item.status !== "COMPLETED",
      isSelected: item.id === selectedId,
    }));

    return {
      start,
      end,
      totalDays: Math.max(1, Math.round(totalRange / 86400000)),
      todayOffset: ((today.getTime() - start.getTime()) / totalRange) * 100,
      overdueCount: points.filter((item) => item.isLate).length,
      points,
    };
  }, [items, projectDueDate, projectStartDate, selectedId]);

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
        <div className="mt-5 rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_42%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-white px-2.5 py-1">Start {projectStartDate ? formatShortDate(new Date(projectStartDate)) : "not set"}</span>
            <span className="rounded-full bg-white px-2.5 py-1">Target {projectDueDate ? formatShortDate(new Date(projectDueDate)) : "not set"}</span>
            <span className="rounded-full bg-white px-2.5 py-1">{timelineModel ? `${timelineModel.totalDays} gunluk pencere` : "Tarih bekleniyor"}</span>
            <span className="rounded-full bg-white px-2.5 py-1">{timelineModel ? `${timelineModel.overdueCount} geciken milestone` : "Timeline cizimi icin due date ekleyin"}</span>
          </div>
          {timelineModel ? (
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[720px] rounded-[24px] border border-white/60 bg-white/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{formatShortDate(timelineModel.start)}</span>
                  <span>Today</span>
                  <span>{formatShortDate(timelineModel.end)}</span>
                </div>
                <div className="relative h-52">
                  <div className="absolute inset-x-0 top-24 h-[2px] rounded-full bg-slate-200" />
                  <div
                    className="absolute bottom-6 top-10 w-px border-l border-dashed border-slate-300"
                    style={{ left: `${Math.min(100, Math.max(0, timelineModel.todayOffset))}%` }}
                  />
                  {timelineModel.points.map((milestone) => (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => startEdit(milestone)}
                      className={`absolute w-44 -translate-x-1/2 rounded-[20px] border px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                        milestone.isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : milestone.isLate
                            ? "border-red-200 bg-red-50"
                            : "border-slate-200 bg-white"
                      }`}
                      style={{ left: `${milestone.offset}%`, top: `${12 + milestone.lane * 56}px` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500">{formatShortDate(milestone.dueDate)}</div>
                        <Badge variant={milestoneBadge(milestone.status)}>{milestone.status}</Badge>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm font-black text-slate-950">{milestone.title}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {milestone.completedTaskCount} / {milestone.taskCount} task • %{milestone.progress}
                      </div>
                    </button>
                  ))}
                  {timelineModel.points.map((milestone) => (
                    <div key={`${milestone.id}-node`} className="absolute top-[92px] h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white shadow-sm" style={{ left: `${milestone.offset}%`, backgroundColor: milestone.status === "COMPLETED" ? "#10b981" : milestone.status === "AT_RISK" ? "#ef4444" : milestone.status === "IN_PROGRESS" ? "#f59e0b" : "#6366f1" }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
              Timeline gorsellestirmesi icin en az bir milestone due date&apos;i tanimlayin.
            </div>
          )}
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
