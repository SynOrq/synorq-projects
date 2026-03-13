"use client";

import { useState } from "react";
import { X, Calendar, Flag, User2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/types";
import type { Task, User } from "@prisma/client";

type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "image"> | null;
  creator: Pick<User, "id" | "name">;
  _count: { comments: number; subTasks: number };
};

interface Props {
  task: TaskWithRelations;
  members: Pick<User, "id" | "name" | "image" | "email">[];
  onClose: () => void;
  onUpdate: (task: TaskWithRelations) => void;
}

export default function TaskModal({ task, members, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, status, priority, assigneeId: assigneeId || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      const assignee = members.find((m) => m.id === updated.assigneeId) ?? null;
      onUpdate({ ...task, ...updated, assignee });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Görev Detayı</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-gray-900 outline-none border-b border-transparent hover:border-gray-200 focus:border-indigo-400 pb-1 transition-colors"
          />

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Görev hakkında notlar..."
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Durum
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Atanan
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Atanmadı</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                ))}
              </select>
            </div>

            {/* Creator */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Oluşturan
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <Avatar name={task.creator.name} size="xs" />
                <span className="text-sm text-gray-600">{task.creator.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={save} loading={saving}>
            <Save size={14} /> Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
