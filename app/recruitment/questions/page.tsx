"use client";

import { useMemo, useState } from "react";
import { useRecruitment } from "../context";
import { InterviewQuestion } from "../types";

const STAGES = ["一次面接", "二次面接", "最終面接", "その他"];
const TAGS = ["志望動機", "経歴・スキル", "思考・問題解決", "カルチャーフィット", "将来・キャリア", "逆質問対策", "その他"];

const STAGE_COLORS: Record<string, string> = {
  "一次面接": "bg-blue-600",
  "二次面接": "bg-violet-600",
  "最終面接": "bg-green-600",
  "その他": "bg-gray-500",
};

const TAG_COLORS: Record<string, string> = {
  "志望動機": "bg-orange-100 text-orange-700 border-orange-200",
  "経歴・スキル": "bg-blue-100 text-blue-700 border-blue-200",
  "思考・問題解決": "bg-purple-100 text-purple-700 border-purple-200",
  "カルチャーフィット": "bg-green-100 text-green-700 border-green-200",
  "将来・キャリア": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "逆質問対策": "bg-pink-100 text-pink-700 border-pink-200",
  "その他": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function QuestionsPage() {
  const { interviewQuestions, addInterviewQuestion, deleteInterviewQuestion } = useRecruitment();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openAnswerId, setOpenAnswerId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>("一次面接");
  const [activeTag, setActiveTag] = useState<string>("すべて");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newModelAnswer, setNewModelAnswer] = useState("");
  const [newStage, setNewStage] = useState(STAGES[0]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCopied, setBulkCopied] = useState(false);

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

  // アクティブなステージで使われているタグのみ表示
  const tagsInStage = useMemo(() => {
    const set = new Set(
      interviewQuestions.filter((q) => q.stage === activeStage).flatMap((q) => q.tags)
    );
    return TAGS.filter((t) => set.has(t));
  }, [interviewQuestions, activeStage]);

  function handleCopy(q: InterviewQuestion) {
    navigator.clipboard.writeText(q.text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

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

  function handleBulkCopy() {
    const texts = interviewQuestions
      .filter((q) => selected.has(q.id))
      .map((q) => q.text)
      .join("\n\n");
    navigator.clipboard.writeText(texts);
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  }

  function handleBulkDelete() {
    selected.forEach((id) => deleteInterviewQuestion(id));
    setSelected(new Set());
  }

  function toggleTag(tag: string) {
    setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function handleAdd() {
    if (!newText.trim()) return;
    addInterviewQuestion({
      id: `q_${Date.now()}`,
      stage: newStage,
      tags: newTags.length > 0 ? newTags : ["その他"],
      text: newText.trim(),
      modelAnswer: newModelAnswer.trim(),
    });
    setNewText("");
    setNewModelAnswer("");
    setNewTags([]);
    setShowForm(false);
    setActiveStage(newStage);
  }

  const stageCount = (stage: string) =>
    interviewQuestions.filter((q) => q.stage === stage).length;

  return (
    <div className="flex flex-col h-full">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">面接質問バンク</h1>
            <p className="mt-1 text-sm text-gray-600">面接ステージ別に質問をストック。ホバーでコピーボタンが表示されます。</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            質問を追加
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* サイド: ステージタブ */}
        <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-4 space-y-1">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">面接ステージ</p>
          {STAGES.map((stage) => {
            const count = stageCount(stage);
            const isActive = activeStage === stage;
            const dot = STAGE_COLORS[stage] ?? "bg-gray-400";
            return (
              <button
                key={stage}
                onClick={() => { setActiveStage(stage); setActiveTag("すべて"); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "bg-white shadow-sm text-gray-900 border border-gray-200" : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  {stage}
                </div>
                <span className={`text-xs font-bold ${isActive ? "text-blue-600" : "text-gray-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* メイン */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 追加フォーム */}
          {showForm && (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
              <p className="mb-4 text-sm font-bold text-blue-900">新しい質問を追加</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">面接ステージ</label>
                  <div className="flex gap-2 flex-wrap">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewStage(s)}
                        className={`rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors ${
                          newStage === s
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 text-gray-600 hover:border-blue-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">タグ（複数選択可）</label>
                  <div className="flex gap-2 flex-wrap">
                    {TAGS.map((tag) => {
                      const checked = newTags.includes(tag);
                      const color = TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600 border-gray-200";
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                            checked ? color + " ring-2 ring-offset-1 ring-blue-400" : "border-gray-300 text-gray-500 bg-white hover:border-gray-400"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">質問文</label>
                  <textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    rows={2}
                    placeholder="例：これまでの仕事で最も苦労した経験を教えてください。"
                    autoFocus
                    className="w-full resize-none rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">模範解答・評価ガイド <span className="text-xs font-normal text-gray-400">（任意）</span></label>
                  <textarea
                    value={newModelAnswer}
                    onChange={(e) => setNewModelAnswer(e.target.value)}
                    rows={3}
                    placeholder="良い回答のポイント・評価基準・避けるべき回答など"
                    className="w-full resize-none rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowForm(false); setNewText(""); setNewModelAnswer(""); setNewTags([]); }}
                    className="rounded-xl border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newText.trim()}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    追加する
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ステージヘッダー */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${STAGE_COLORS[activeStage] ?? "bg-gray-400"}`} />
              <h2 className="text-lg font-bold text-gray-900">{activeStage}</h2>
              <span className="text-sm text-gray-400">{filtered.length}件</span>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">{selected.size}件選択中</span>
                <button
                  onClick={handleBulkCopy}
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                    bulkCopied
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {bulkCopied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      コピー済み
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      まとめてコピー
                    </>
                  )}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 rounded-lg border-2 border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  まとめて削除
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded-lg border-2 border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  選択解除
                </button>
              </div>
            )}
          </div>

          {/* タグフィルター */}
          {tagsInStage.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag("すべて")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activeTag === "すべて"
                    ? "border-gray-700 bg-gray-700 text-white"
                    : "border-gray-300 text-gray-600 bg-white hover:border-gray-400"
                }`}
              >
                すべて
              </button>
              {tagsInStage.map((tag) => {
                const color = TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600 border-gray-200";
                const isActive = activeTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(isActive ? "すべて" : tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      isActive ? color + " ring-2 ring-offset-1 ring-blue-400" : "border-gray-300 text-gray-500 bg-white hover:border-gray-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* 検索 */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${activeStage}の質問を検索...`}
              className="w-full rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 全選択チェックボックス */}
          {filtered.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 hover:text-gray-700 select-none w-fit">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              すべて選択
            </label>
          )}

          {/* 質問リスト */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-gray-400">
              <svg className="mb-4 h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-gray-500">質問がありません</p>
              <button
                onClick={() => { setNewStage(activeStage); setShowForm(true); }}
                className="mt-3 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {activeStage}の質問を追加する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <div
                  key={q.id}
                  className={`group flex items-start gap-4 rounded-2xl border bg-white px-5 py-4 hover:shadow-sm transition-all ${
                    selected.has(q.id) ? "border-blue-400 bg-blue-50/40 shadow-sm" : "border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-blue-600 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-relaxed">{q.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {q.modelAnswer && (
                      <div className="mt-3">
                        <button
                          onClick={() => setOpenAnswerId(openAnswerId === q.id ? null : q.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${openAnswerId === q.id ? "rotate-90" : ""}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          模範解答・評価ガイドを見る
                        </button>
                        {openAnswerId === q.id && (
                          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-xs font-bold text-amber-800 mb-1.5">評価ガイド</p>
                            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(q)}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                        copiedId === q.id
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {copiedId === q.id ? (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          コピー済み
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          コピー
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteInterviewQuestion(q.id)}
                      className="rounded-lg border-2 border-gray-200 p-1.5 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
