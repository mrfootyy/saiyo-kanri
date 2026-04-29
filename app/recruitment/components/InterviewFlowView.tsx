"use client";

import { useState } from "react";
import { InterviewFormat, InterviewStage } from "../types";
import { STAGE_TYPE_OPTIONS } from "../constants";
import { useRecruitment } from "../context";

type Props = {
  stages: InterviewStage[];
  onUpdate: (stages: InterviewStage[]) => void;
};

type FormState = {
  name: string;
  interviewers: string[];
  format: InterviewFormat;
  description: string;
};

const emptyForm = (): FormState => ({
  name: "",
  interviewers: [],
  format: "オンライン",
  description: "",
});

function getStageDef(name: string) {
  return STAGE_TYPE_OPTIONS.find((s) => s.name === name) ?? null;
}

export default function InterviewFlowView({ stages, onUpdate }: Props) {
  const { interviewers: interviewerOptions } = useRecruitment();
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function openAdd() {
    setForm(emptyForm());
    setIsAdding(true);
    setEditingId(null);
  }

  function openEdit(stage: InterviewStage) {
    setForm({
      name: stage.name,
      interviewers: stage.interviewers,
      format: stage.format,
      description: stage.description,
    });
    setEditingId(stage.id);
    setIsAdding(false);
  }

  function closeForm() {
    setIsAdding(false);
    setEditingId(null);
  }

  function handleNameChange(name: string) {
    const def = getStageDef(name);
    setForm((f) => ({
      ...f,
      name,
      description: def?.defaultDescription ?? f.description,
      interviewers: def?.hasInterviewers ? f.interviewers : [],
      format: def?.hasFormat ? f.format : "オンライン",
    }));
  }

  function handleSave() {
    if (!form.name) return;
    const def = getStageDef(form.name);

    if (isAdding) {
      const newStage: InterviewStage = {
        id: `stage_${Date.now()}`,
        name: form.name,
        order: sorted.length + 1,
        interviewers: def?.hasInterviewers ? form.interviewers : [],
        format: def?.hasFormat ? form.format : "オンライン",
        durationMinutes: 0,
        description: form.description.trim(),
      };
      onUpdate([...stages, newStage]);
    } else if (editingId) {
      onUpdate(
        stages.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: form.name,
                interviewers: def?.hasInterviewers ? form.interviewers : [],
                format: def?.hasFormat ? form.format : "オンライン",
                description: form.description.trim(),
              }
            : s
        )
      );
    }
    closeForm();
  }

  function handleDelete(id: string) {
    const remaining = stages
      .filter((s) => s.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onUpdate(remaining);
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const items = [...sorted];
    const fromIdx = items.findIndex((s) => s.id === dragId);
    const toIdx = items.findIndex((s) => s.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const reordered = items.map((s, i) => ({ ...s, order: i + 1 }));
    onUpdate(reordered);
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  const showModal = isAdding || editingId !== null;
  const currentDef = getStageDef(form.name);

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">面接フロー管理</h1>
          <p className="mt-1 text-sm text-gray-500">選考ステージの順序・面接官・形式を定義します。ドラッグで並び替えができます。</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-100 hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          選考を追加
        </button>
      </div>

      {/* フロー全体像 */}
      {sorted.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">選考フロー全体像</p>
          <div className="flex flex-wrap items-center gap-2">
            {sorted.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {stage.order}
                  </span>
                  {stage.name}
                </div>
                {idx < sorted.length - 1 && (
                  <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ステージカード一覧（ドラッグ対応） */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-gray-400">
          <svg className="mb-4 h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-base font-semibold text-gray-500">選考ステージがありません</p>
          <p className="mt-1 text-sm text-gray-400">「選考を追加」から作成してください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((stage) => {
            const def = getStageDef(stage.name);
            const isDragging = dragId === stage.id;
            const isDragOver = dragOverId === stage.id && dragId !== stage.id;
            return (
              <div
                key={stage.id}
                className="flex items-center gap-3"
              >
                {/* 順番（カードの外） */}
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-200">
                  {stage.order}
                </span>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, stage.id)}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDrop={() => handleDrop(stage.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex-1 rounded-2xl border bg-white shadow-sm transition-all ${
                    isDragging ? "opacity-40 scale-95" : "opacity-100"
                  } ${isDragOver ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`}
                >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* ドラッグハンドル */}
                  <div className="flex flex-col items-center cursor-grab active:cursor-grabbing flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* ステージ情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-900">{stage.name}</h3>
                      {def?.hasFormat && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          stage.format === "オンライン" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        }`}>
                          {stage.format}
                        </span>
                      )}
                      {!def?.hasFormat && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">書類・テスト</span>
                      )}
                    </div>
                    {def?.hasInterviewers && stage.interviewers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {stage.interviewers.map((name) => (
                          <span key={name} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{name}</span>
                        ))}
                      </div>
                    )}
                    {stage.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{stage.description}</p>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(stage)}
                      className="rounded-xl border-2 border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(stage.id)}
                      className="rounded-xl border-2 border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-400"
                    >
                      削除
                    </button>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {isAdding ? "選考を追加" : "選考を編集"}
              </h2>
              <button onClick={closeForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* 選考名 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">選考の種類 *</label>
                <select
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">選考を選択してください</option>
                  {STAGE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {/* 面接官（面接系のみ） */}
              {currentDef?.hasInterviewers && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    担当面接官
                    {form.interviewers.length > 0 && (
                      <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400">({form.interviewers.length}名)</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 p-3">
                    {interviewerOptions.map((opt) => {
                      const checked = form.interviewers.includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              interviewers: checked
                                ? f.interviewers.filter((i) => i !== opt)
                                : [...f.interviewers, opt],
                            }))
                          }
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            checked
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 面接形式（面接系のみ） */}
              {currentDef?.hasFormat && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">面接形式</label>
                  <div className="flex gap-3">
                    {(["オンライン", "対面"] as InterviewFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setForm((f) => ({ ...f, format: fmt }))}
                        className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                          form.format === fmt
                            ? fmt === "オンライン"
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-green-500 bg-green-500 text-white"
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          {fmt === "オンライン" ? (
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          )}
                          {fmt === "オンライン" ? "オンライン" : "対面"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 説明 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">説明・評価ポイント</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="このステージで確認すること・評価基準など"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
