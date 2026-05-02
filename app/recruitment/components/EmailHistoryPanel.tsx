"use client";

import { useMemo, useState } from "react";
import { EmailHistory } from "../types";

type Props = {
  histories: EmailHistory[];
  fullPage?: boolean;
  onClearHistories?: () => void;
};

export default function EmailHistoryPanel({ histories, fullPage, onClearHistories }: Props) {
  const [query, setQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("すべて");
  const [directionFilter, setDirectionFilter] = useState("すべて");
  const [dateFilter, setDateFilter] = useState("すべて");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const candidates = useMemo(() => {
    return ["すべて", ...Array.from(new Set(histories.map((item) => item.candidateName))).sort()];
  }, [histories]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rangeStart = getDateRangeStart(dateFilter);
    return histories
      .filter((item) => {
        const sentAt = parseDate(item.sentAt);
        const matchesQuery =
          keyword === "" ||
          item.subject.toLowerCase().includes(keyword) ||
          item.summary.toLowerCase().includes(keyword) ||
          item.candidateName.toLowerCase().includes(keyword);
        const matchesCandidate = candidateFilter === "すべて" || item.candidateName === candidateFilter;
        const matchesDirection = directionFilter === "すべて" || item.direction === directionFilter;
        const matchesDate = !rangeStart || (sentAt && sentAt >= rangeStart);
        return matchesQuery && matchesCandidate && matchesDirection && matchesDate;
      })
      .sort((a, b) => {
        const diff = getTime(b.sentAt) - getTime(a.sentAt);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [candidateFilter, dateFilter, directionFilter, histories, query, sortOrder]);

  const visibleItems = fullPage ? filtered : [...histories].sort((a, b) => getTime(b.sentAt) - getTime(a.sentAt));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-700">メール履歴</h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{fullPage ? `${filtered.length} / ${histories.length}件` : `${visibleItems.length}件`}</span>
          {onClearHistories && histories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("メール履歴を全て削除しますか？")) onClearHistories();
              }}
              className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            >
              全て削除
            </button>
          )}
        </div>
      </div>
      {fullPage && (
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-500">検索</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="候補者名・件名・概要"
                className={controlClass}
              />
            </label>
            <HistorySelect label="候補者" value={candidateFilter} onChange={setCandidateFilter} options={candidates} />
            <HistorySelect label="方向" value={directionFilter} onChange={setDirectionFilter} options={["すべて", "送信", "受信"]} />
            <HistorySelect
              label="期間"
              value={dateFilter}
              onChange={setDateFilter}
              options={["すべて", "今日", "7日以内", "30日以内", "90日以内"]}
            />
            <HistorySelect
              label="並び順"
              value={sortOrder}
              onChange={(value) => setSortOrder(value as "newest" | "oldest")}
              options={[
                { label: "新しい順", value: "newest" },
                { label: "古い順", value: "oldest" },
              ]}
            />
          </div>
        </div>
      )}
      <div className={`divide-y divide-slate-50 overflow-y-auto ${fullPage ? "" : "max-h-72"}`}>
        {visibleItems.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            条件に一致するメール履歴がありません。
          </p>
        ) : (
          visibleItems.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    e.direction === "送信"
                      ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                      : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60"
                  }`}
                >
                  {e.direction}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{e.sentAt}</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{e.subject}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{e.summary}</p>
              <p className="mt-0.5 text-xs text-slate-400">対象: {e.candidateName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const controlClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

function HistorySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>
        {options.map((option) => {
          const labelText = typeof option === "string" ? option : option.label;
          const valueText = typeof option === "string" ? option : option.value;
          return <option key={valueText} value={valueText}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}

function getDateRangeStart(value: string) {
  if (value === "すべて") return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (value === "今日") return start;
  const days = value === "7日以内" ? 7 : value === "30日以内" ? 30 : 90;
  start.setDate(start.getDate() - days);
  return start;
}

function getTime(value: string) {
  return parseDate(value)?.getTime() ?? 0;
}

function parseDate(value: string) {
  const normalized = value.replace(/\//g, "-").replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
