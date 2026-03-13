"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Flag, History, MessageSquare, Save, User2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/types";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import type {
  TaskActivityData,
  TaskActivityMetadata,
  TaskCardData,
  TaskDetailResponse,
} from "@/lib/task-detail";
import type { User } from "@prisma/client";

interface Props {
  task: TaskCardData;
  members: Pick<User, "id" | "name" | "image" | "email">[];
  onClose: () => void;
  onUpdate: (task: TaskCardData) => void;
  onCommentAdded: (taskId: string) => void;
}

function readMetadata(value: unknown): TaskActivityMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as TaskActivityMetadata;
}

function describeActivity(activity: TaskActivityData) {
  const metadata = readMetadata(activity.metadata);

  switch (activity.action) {
    case "task.created":
      return {
        title: "Görev oluşturuldu",
        detail: "Yeni görev kartı sisteme eklendi.",
      };
    case "task.commented":
      return {
        title: "Yorum eklendi",
        detail: "Görev üzerine yeni bir ekip notu bırakıldı.",
      };
    case "task.moved":
      return {
        title: "Kolon değişti",
        detail: `${metadata?.fromSectionName ?? "Bilinmiyor"} -> ${metadata?.toSectionName ?? "Bilinmiyor"}`,
      };
    case "task.updated":
      return {
        title: "Görev güncellendi",
        detail: metadata?.changes?.length
          ? metadata.changes
              .map((change) => `${change.label}: ${change.from ?? "-"} -> ${change.to ?? "-"}`)
              .join(" | ")
          : "Alanlar güncellendi.",
      };
    default:
      return {
        title: "Görev aktivitesi",
        detail: "Görev üzerinde bir işlem gerçekleştirildi.",
      };
  }
}

export default function TaskModal({ task, members, onClose, onUpdate, onCommentAdded }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  const [commentContent, setCommentContent] = useState("");
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId ?? "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setCommentContent("");
  }, [task]);

  const loadTaskDetail = useCallback(async () => {
    setLoadingDetail(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Görev yüklenemedi.");
      }

      setDetail(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Görev yüklenemedi.";
      setError(message);
    } finally {
      setLoadingDetail(false);
    }
  }, [task.id]);

  useEffect(() => {
    void loadTaskDetail();
  }, [loadTaskDetail]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Görev kaydedilemedi.");
      }

      onUpdate(data);
      await loadTaskDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Görev kaydedilemedi.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!commentContent.trim()) {
      return;
    }

    setCommenting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Yorum eklenemedi.");
      }

      setCommentContent("");
      onCommentAdded(task.id);
      await loadTaskDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Yorum eklenemedi.";
      setError(message);
    } finally {
      setCommenting(false);
    }
  }

  const currentStatus = STATUS_CONFIG[status];
  const currentPriority = PRIORITY_CONFIG[priority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Task Workspace</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${currentStatus.bg} ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${currentPriority.bg} ${currentPriority.color}`}>
                {currentPriority.label}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_400px]">
          <div className="overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border-b border-transparent bg-transparent pb-2 text-2xl font-black text-slate-900 outline-none transition-colors hover:border-slate-200 focus:border-indigo-400"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Görev sahibi, öncelik ve teslim tarihi dahil temel yaşam döngüsü bilgilerini bu panelden yönetebilirsiniz.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 p-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Açıklama
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  placeholder="Görev kapsamı, teslim beklentileri veya teknik notlar..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Flag size={14} />
                    Durum
                  </div>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as typeof status)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Flag size={14} />
                    Öncelik
                  </div>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as typeof priority)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <User2 size={14} />
                    Atanan
                  </div>
                  <select
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Atanmadı</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name ?? member.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Calendar size={14} />
                    Bitiş Tarihi
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Oluşturan</div>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar name={detail?.creator.name ?? task.creator.name} size="sm" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {detail?.creator.name ?? task.creator.name}
                      </div>
                      <div className="text-xs text-slate-500">Görev sahibi</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Teslim</div>
                  <div className="mt-3 text-sm font-semibold text-slate-800">
                    {dueDate ? formatDate(dueDate) : "Planlanmadı"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Tarih alanı sprint ve portfoy planlamasında kullanılır.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">İletişim</div>
                  <div className="mt-3 text-sm font-semibold text-slate-800">
                    {detail?._count.comments ?? task._count.comments} yorum
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {detail?._count.subTasks ?? task._count.subTasks} alt görev bağlantısı mevcut.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="border-l border-slate-100 bg-slate-50/70">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MessageSquare size={16} />
                  Yorumlar ve Aktivite
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Karar geçmişi ve ekip iletişimi aynı görev üzerinde tutulur.
                </p>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Yeni Yorum
                  </label>
                  <textarea
                    value={commentContent}
                    onChange={(event) => setCommentContent(event.target.value)}
                    rows={3}
                    placeholder="Ekiple paylaşılacak kısa bir not yazın..."
                    className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={addComment} loading={commenting}>
                      Yorum Ekle
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MessageSquare size={15} />
                    Yorum Akışı
                  </div>

                  {loadingDetail ? (
                    <p className="text-sm text-slate-500">Yorumlar yükleniyor...</p>
                  ) : detail && detail.comments.length > 0 ? (
                    <div className="space-y-3">
                      {detail.comments.map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={comment.author.name ?? comment.author.email ?? "Kullanıcı"}
                              image={comment.author.image}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-800">
                                {comment.author.name ?? comment.author.email}
                              </div>
                              <div className="text-xs text-slate-500" title={formatDateTime(comment.createdAt)}>
                                {formatRelative(comment.createdAt)}
                              </div>
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Bu görev için henüz yorum yok.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <History size={15} />
                    Aktivite Zaman Çizelgesi
                  </div>

                  {loadingDetail ? (
                    <p className="text-sm text-slate-500">Aktivite yükleniyor...</p>
                  ) : detail && detail.activity.length > 0 ? (
                    <div className="space-y-3">
                      {detail.activity.map((activity) => {
                        const summary = describeActivity(activity);
                        return (
                          <div key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                            <div className="flex items-start gap-3">
                              <Avatar
                                name={activity.user.name ?? activity.user.email ?? "Kullanıcı"}
                                image={activity.user.image}
                                size="xs"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-slate-800">{summary.title}</div>
                                  <div className="text-xs text-slate-500" title={formatDateTime(activity.createdAt)}>
                                    {formatRelative(activity.createdAt)}
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {activity.user.name ?? activity.user.email}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{summary.detail}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Bu görev için kaydedilmiş aktivite bulunmuyor.</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="text-xs text-slate-500">
            Değişiklikler kaydedildiğinde görev geçmişine işlenir.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button onClick={save} loading={saving}>
              <Save size={14} />
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
