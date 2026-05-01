"use client";

import { useMemo, useState } from "react";
import { SlackNotification } from "../types";

type Props = {
  notifications: SlackNotification[];
  fullPage?: boolean;
};

export default function SlackHistoryPanel({ notifications, fullPage }: Props) {
  const [query, setQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("すべて");
  const [channelFilter, setChannelFilter] = useState("すべて");
  const [dateFilter, setDateFilter] = useState("すべて");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const candidates = useMemo(() => {
    return ["すべて", ...Array.from(new Set(notifications.map((item) => item.candidateName))).sort()];
  }, [notifications]);

  const channels = useMemo(() => {
    return ["すべて", ...Array.from(new Set(notifications.map((item) => item.channel))).sort()];
  }, [notifications]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rangeStart = getDateRangeStart(dateFilter);
    return notifications
      .filter((item) => {
        const sentAt = parseDate(item.sentAt);
        const matchesQuery =
          keyword === "" ||
          item.message.toLowerCase().includes(keyword) ||
          item.candidateName.toLowerCase().includes(keyword) ||
          item.channel.toLowerCase().includes(keyword);
        const matchesCandidate = candidateFilter === "すべて" || item.candidateName === candidateFilter;
        const matchesChannel = channelFilter === "すべて" || item.channel === channelFilter;
        const matchesDate = !rangeStart || (sentAt && sentAt >= rangeStart);
        return matchesQuery && matchesCandidate && matchesChannel && matchesDate;
      })
      .sort((a, b) => {
        const diff = getTime(b.sentAt) - getTime(a.sentAt);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [candidateFilter, channelFilter, dateFilter, notifications, query, sortOrder]);

  const visibleItems = fullPage ? filtered : [...notifications].sort((a, b) => getTime(b.sentAt) - getTime(a.sentAt));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#4A154B]">
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-700">Slack通知履歴</h3>
        <span className="ml-auto text-xs text-slate-400">{fullPage ? `${filtered.length} / ${notifications.length}件` : `${visibleItems.length}件`}</span>
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
                placeholder="候補者名・チャンネル・本文"
                className={controlClass}
              />
            </label>
            <HistorySelect label="候補者" value={candidateFilter} onChange={setCandidateFilter} options={candidates} />
            <HistorySelect label="チャンネル" value={channelFilter} onChange={setChannelFilter} options={channels} />
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
            条件に一致する通知履歴がありません。
          </p>
        ) : (
          visibleItems.map((n) => (
            <div key={n.id} className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">
                  {n.channel}
                </span>
                <span className="text-xs text-slate-400">{n.sentAt}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">{n.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">対象: {n.candidateName}</p>
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
