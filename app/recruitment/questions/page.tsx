"use client";

import { useMemo, useState } from "react";
import { useRecruitment } from "../context";
import { InterviewQuestion } from "../types";

const STAGES = ["一次面接", "二次面接", "最終面接", "その他"];
const TAGS = ["志望動機", "経歴・スキル", "思考・問題解決", "カルチャーフィット", "将来・キャリア", "逆質問対策", "その他"];

const STAGE_DOT: Record<string, string> = {
  "一次面接": "bg-blue-500",
  "二次面接": "bg-blue-600",
  "最終面接": "bg-blue-700",
  "その他":   "bg-slate-400",
};

const TAG_COLORS: Record<string, string> = {
  "志望動機":       "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  "経歴・スキル":   "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  "思考・問題解決": "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200",
  "カルチャーフィット": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  "将来・キャリア": "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200",
  "逆質問対策":     "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  "その他":         "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60",
};

export default function QuestionsPage() {
  const { interviewQuestions, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion } = useRecruitment();

  const [openAnswerId, setOpenAnswerId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>("一次面接");
  const [activeTag, setActiveTag] = useState<string>("すべて");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newModelAnswer, setNewModelAnswer] = useState("");
  const [newStage, setNewStage] = useState(STAGES[0]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newRequired, setNewRequired] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editModelAnswer, setEditModelAnswer] = useState("");
  const [editStage, setEditStage] = useState(STAGES[0]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editRequired, setEditRequired] = useState(false);

  const stagesInUse = useMemo(() => {
    const set = new Set(interviewQuestions.map((q) => q.stage));
    return STAGES.filter((s) => set.has(s));
  }, [interviewQuestions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return interviewQuestions.filter((item) => {
      const matchStage = item.stage === activeStage;
      const matchTag = activeTag === "すべて" || item.tags.includes(activeTag);
      const matchSearch = q === "" || item.text.toLowerCase().includes(q);
      return matchStage && matchTag && matchSearch;
    });
  }, [interviewQuestions, activeStage, activeTag, search]);

  const tagsInStage = useMemo(() => {
    const set = new Set(
      interviewQuestions.filter((q) => q.stage === activeStage).flatMap((q) => q.tags)
    );
    return TAGS.filter((t) => set.has(t));
  }, [interviewQuestions, activeStage]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((q) => q.id)));
    }
  }

  function handleBulkDelete() {
    if (!window.confirm(`選択した${selected.size}件を削除します。`)) return;
    selected.forEach((id) => deleteInterviewQuestion(id));
    setSelected(new Set());
  }

  function toggleTag(tag: string) {
    setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function toggleEditTag(tag: string) {
    setEditTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function handleAdd() {
    if (!newText.trim()) return;
    addInterviewQuestion({
      id: crypto.randomUUID(),
      stage: newStage,
      tags: newTags.length > 0 ? newTags : ["その他"],
      text: newText.trim(),
      modelAnswer: newModelAnswer.trim(),
      required: newRequired,
    });
    setNewText("");
    setNewModelAnswer("");
    setNewTags([]);
    setNewRequired(false);
    setShowForm(false);
    setActiveStage(newStage);
  }

  function startEdit(q: InterviewQuestion) {
    setEditingId(q.id);
    setEditText(q.text);
    setEditModelAnswer(q.modelAnswer);
    setEditStage(q.stage);
    setEditTags(q.tags);
    setEditRequired(!!q.required);
    setOpenAnswerId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditModelAnswer("");
    setEditStage(STAGES[0]);
    setEditTags([]);
    setEditRequired(false);
  }

  function handleSaveEdit(q: InterviewQuestion) {
    if (!editText.trim()) return;
    updateInterviewQuestion({
      ...q,
      stage: editStage,
      tags: editTags.length > 0 ? editTags : ["その他"],
      text: editText.trim(),
      modelAnswer: editModelAnswer.trim(),
      required: editRequired,
    });
    if (activeStage !== editStage) {
      setActiveStage(editStage);
      setActiveTag("すべて");
    }
    cancelEdit();
  }

  const stageCount = (stage: string) =>
    interviewQuestions.filter((q) => q.stage === stage).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">面接質問リスト</h1>
            <p className="mt-0.5 text-sm text-slate-500">面接ステージ別に質問をストック。必須質問は候補者ごとの質問リストに自動表示されます。</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            質問を追加
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="面接ステージ" className="w-44 flex-shrink-0 border-r border-slate-200 bg-white p-3 space-y-0.5">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">ステージ</p>
          {STAGES.map((stage) => {
            const count = stageCount(stage);
            const isActive = activeStage === stage;
            return (
              <button
                key={stage}
                onClick={() => { setActiveStage(stage); setActiveTag("すべて"); }}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {stage}
                </div>
                <span className={`text-xs font-semibold tabular-nums ${isActive ? "text-blue-600" : "text-slate-400"}`}>{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-5">
          {showForm && (
            <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-900">新しい質問を追加</p>
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">面接ステージ</p>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewStage(s)}
                        aria-pressed={newStage === s}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                          newStage === s
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">タグ（複数選択可）</p>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map((tag) => {
                      const checked = newTags.includes(tag);
                      const color = TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60";
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          aria-pressed={checked}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                            checked
                              ? `${color} outline outline-2 outline-blue-500 outline-offset-1`
                              : "border border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-blue-800">この選考フローの必須質問にする</span>
                    <span className="mt-0.5 block text-xs text-blue-700">同じステージの候補者用質問リストに、選択しなくても表示されます。</span>
                  </span>
                </label>
                <div>
                  <label htmlFor="new-question-text" className="mb-1.5 block text-xs font-medium text-slate-600">質問文</label>
                  <textarea
                    id="new-question-text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    rows={2}
                    placeholder="例：これまでの仕事で最も苦労した経験を教えてください。"
                    autoFocus
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="new-question-answer" className="mb-1.5 block text-xs font-medium text-slate-600">
                    模範解答・評価ガイド <span className="font-normal text-slate-400">（任意）</span>
                  </label>
                  <textarea
                    id="new-question-answer"
                    value={newModelAnswer}
                    onChange={(e) => setNewModelAnswer(e.target.value)}
                    rows={3}
                    placeholder="良い回答のポイント・評価基準・避けるべき回答など"
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowForm(false); setNewText(""); setNewModelAnswer(""); setNewTags([]); setNewRequired(false); }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newText.trim()}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  >
                    追加する
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-slate-900">{activeStage}</h2>
              <span className="text-sm text-slate-400 tabular-nums">{filtered.length}件</span>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">{selected.size}件選択中</span>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                >
                  まとめて削除
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                >
                  選択解除
                </button>
              </div>
            )}
          </div>

          {tagsInStage.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="タグフィルター">
              <button
                onClick={() => setActiveTag("すべて")}
                aria-pressed={activeTag === "すべて"}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                  activeTag === "すべて"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                すべて
              </button>
              {tagsInStage.map((tag) => {
                const color = TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60";
                const isActive = activeTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    aria-pressed={isActive}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                      isActive
                        ? `${color} outline outline-2 outline-blue-500 outline-offset-1`
                        : "border border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${activeStage}の質問を検索...`}
              aria-label="質問を検索"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>

          {filtered.length > 0 && (
            <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                aria-label="すべて選択"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              />
              すべて選択
            </label>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 text-slate-400">
              <svg className="mb-4 h-10 w-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-500">質問がありません</p>
              <button
                onClick={() => { setNewStage(activeStage); setShowForm(true); }}
                className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                {activeStage}の質問を追加する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <div
                  key={q.id}
                  className={`group rounded-xl border bg-white px-5 py-4 transition-all hover:shadow-sm ${
                    selected.has(q.id) ? "border-blue-300 bg-blue-50/40 shadow-sm" : "border-slate-200"
                  }`}
                >
                  {editingId === q.id ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {STAGES.map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => setEditStage(stage)}
                            aria-pressed={editStage === stage}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                              editStage === stage ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TAGS.map((tag) => {
                          const checked = editTags.includes(tag);
                          const color = TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60";
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEditTag(tag)}
                              aria-pressed={checked}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                                checked ? `${color} outline outline-2 outline-blue-500 outline-offset-1` : "border border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={editRequired}
                          onChange={(e) => setEditRequired(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                        />
                        <span>
                          <span className="block text-xs font-semibold text-blue-800">この選考フローの必須質問にする</span>
                          <span className="mt-0.5 block text-xs text-blue-700">同じステージの候補者用質問リストに、選択しなくても表示されます。</span>
                        </span>
                      </label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        aria-label="質問文を編集"
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <textarea
                        value={editModelAnswer}
                        onChange={(e) => setEditModelAnswer(e.target.value)}
                        rows={3}
                        aria-label="模範解答・評価ガイドを編集"
                        placeholder="良い回答のポイント・評価基準・避けるべき回答など"
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(q)}
                          disabled={!editText.trim()}
                          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                        >
                          保存する
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selected.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                          aria-label={`質問を選択: ${q.text.slice(0, 30)}...`}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed text-slate-800">{q.text}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {q.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60"}`}
                              >
                                {tag}
                              </span>
                            ))}
                            {q.required && (
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-200">
                                必須
                              </span>
                            )}
                          </div>
                          {q.modelAnswer && (
                            <div className="mt-3">
                              <button
                                onClick={() => setOpenAnswerId(openAnswerId === q.id ? null : q.id)}
                                aria-expanded={openAnswerId === q.id}
                                className="flex items-center gap-1.5 rounded text-sm font-medium text-blue-700 transition-colors hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
                              >
                                <svg
                                  className={`h-3.5 w-3.5 transition-transform ${openAnswerId === q.id ? "rotate-90" : ""}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                模範解答・評価ガイドを見る
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => updateInterviewQuestion({ ...q, required: !q.required })}
                            aria-pressed={!!q.required}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                              q.required
                                ? "border-blue-300 bg-blue-50 text-blue-700 focus-visible:ring-blue-400"
                                : "border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-slate-400"
                            }`}
                          >
                            {q.required ? "必須" : "必須にする"}
                          </button>
                          <button
                            onClick={() => startEdit(q)}
                            aria-label="質問を編集"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deleteInterviewQuestion(q.id)}
                            aria-label="質問を削除"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {q.modelAnswer && openAnswerId === q.id && (
                        <div className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                          <p className="mb-1.5 text-sm font-semibold text-blue-800">評価ガイド</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">{q.modelAnswer}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
