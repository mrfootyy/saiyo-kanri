"use client";

import { CandidateStatus, StatusFilterValue } from "../types";

const STATUS_OPTIONS: (StatusFilterValue | "選考中")[] = [
  "すべて",
  "選考中",
  "応募受付",
  "書類選考",
  "一次面接",
  "最終面接",
  "内定",
  "不採用",
  "辞退",
];

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilterValue | "選考中";
  onStatusFilterChange: (value: StatusFilterValue | "選考中") => void;
};

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="氏名・職種・メール・面接官・タグで検索"
          aria-label="応募者を検索"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="ステータスフィルター">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilterChange(status)}
            aria-pressed={statusFilter === status}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}
