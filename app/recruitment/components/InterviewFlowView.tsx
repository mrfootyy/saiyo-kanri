"use client";

import { useState } from "react";
import { FlowTemplate, InterviewFormat, InterviewStage } from "../types";
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
  format: "対面",
  description: "",
});

function getStageDef(name: string) {
  return STAGE_TYPE_OPTIONS.find((s) => s.name === name) ?? null;
}

export default function InterviewFlowView({ stages, onUpdate }: Props) {
  const { interviewers: interviewerOptions, flowTemplates, addFlowTemplate, deleteFlowTemplate } = useRecruitment();
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const [templateName, setTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

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
      format: def?.hasFormat ? f.format : "対面",
    }));
  }

  function saveAsTemplate() {
    if (!templateName.trim() || sorted.length === 0) return;
    const template: FlowTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      stages: sorted.map(({ id: _id, ...s }) => s),
    };
    addFlowTemplate(template);
    setTemplateName("");
  }

  function applyTemplate(t: FlowTemplate) {
    const newStages: InterviewStage[] = t.stages.map((s, i) => ({
      ...s,
      id: crypto.randomUUID(),
      order: i + 1,
    }));
    onUpdate(newStages);
    setShowTemplates(false);
  }

  function handleSave() {
    if (!form.name) return;
    const def = getStageDef(form.name);

    if (isAdding) {
      const newStage: InterviewStage = {
        id: crypto.randomUUID(),
        name: form.name,
        order: sorted.length + 1,
        interviewers: def?.hasInterviewers ? form.interviewers : [],
        format: def?.hasFormat ? form.format : "対面",
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
                format: def?.hasFormat ? form.format : "対面",
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
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">面接フロー管理</h1>
          <p className="mt-0.5 text-sm text-slate-500">選考ステージの順序・面接官・形式を定義します。ドラッグで並び替えができます。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            テンプレート
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            選考を追加
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-sm font-semibold text-blue-900">フローテンプレート</h2>
          {flowTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-700">保存済みテンプレートを適用</p>
              {flowTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{t.stages.length}ステージ: {t.stages.map((s) => s.name).join(" → ")}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyTemplate(t)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    >
                      適用
                    </button>
                    <button
                      onClick={() => deleteFlowTemplate(t.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {sorted.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-blue-700">現在のフローをテンプレートとして保存</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()}
                  placeholder="テンプレート名（例：標準エンジニア採用フロー）"
                  className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={saveAsTemplate}
                  disabled={!templateName.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">選考フロー全体像</p>
          <div className="flex flex-wrap items-center gap-2">
            {sorted.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white" aria-hidden="true">
                    {stage.order}
                  </span>
                  {stage.name}
                </div>
                {idx < sorted.length - 1 && (
                  <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-slate-400">
          <svg className="mb-4 h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-base font-semibold text-slate-500">選考ステージがありません</p>
          <p className="mt-1 text-sm text-slate-400">「選考を追加」から作成してください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((stage) => {
            const def = getStageDef(stage.name);
            const isDragging = dragId === stage.id;
            const isDragOver = dragOverId === stage.id && dragId !== stage.id;
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white" aria-hidden="true">
                  {stage.order}
                </span>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, stage.id)}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDrop={() => handleDrop(stage.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex-1 rounded-xl border bg-white shadow-sm transition-all ${
                    isDragging ? "scale-95 opacity-40" : "opacity-100"
                  } ${isDragOver ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex flex-shrink-0 cursor-grab flex-col items-center active:cursor-grabbing" aria-hidden="true">
                      <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{stage.name}</h3>
                        {def?.hasFormat && (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            stage.format === "オンライン"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60"
                          }`}>
                            {stage.format}
                          </span>
                        )}
                        {!def?.hasFormat && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-300/60">書類・テスト</span>
                        )}
                      </div>
                      {def?.hasInterviewers && stage.interviewers.length > 0 && (
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {stage.interviewers.map((name) => (
                            <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{name}</span>
                          ))}
                        </div>
                      )}
                      {stage.description && (
                        <p className="text-xs leading-relaxed text-slate-500">{stage.description}</p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        onClick={() => openEdit(stage)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(stage.id)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-modal-title"
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 id="flow-modal-title" className="text-base font-semibold text-slate-900">
                {isAdding ? "選考を追加" : "選考を編集"}
              </h2>
              <button
                onClick={closeForm}
                aria-label="閉じる"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div>
                <label htmlFor="flow-stage-name" className="mb-1.5 block text-xs font-medium text-slate-500">
                  選考の種類 <span aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="flow-stage-name"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-9 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">選考を選択してください</option>
                    {STAGE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {currentDef?.hasInterviewers && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">
                    担当面接官
                    {form.interviewers.length > 0 && (
                      <span className="ml-1.5 text-slate-400">({form.interviewers.length}名)</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                    {interviewerOptions.map((opt) => {
                      const checked = form.interviewers.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={checked}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              interviewers: checked
                                ? f.interviewers.filter((i) => i !== opt)
                                : [...f.interviewers, opt],
                            }))
                          }
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            checked
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentDef?.hasFormat && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">面接形式</p>
                  <div className="flex gap-3">
                    {(["オンライン", "対面"] as InterviewFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        aria-pressed={form.format === fmt}
                        onClick={() => setForm((f) => ({ ...f, format: fmt }))}
                        className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          form.format === fmt
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          {fmt === "オンライン" ? (
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          )}
                          {fmt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="flow-stage-desc" className="mb-1.5 block text-xs font-medium text-slate-500">説明・評価ポイント</label>
                <textarea
                  id="flow-stage-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="このステージで確認すること・評価基準など"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
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
