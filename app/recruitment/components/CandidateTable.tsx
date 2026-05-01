"use client";

import { useRouter } from "next/navigation";
import { Candidate } from "../types";
import { useRecruitment } from "../context";
import { getTaskForCandidate } from "../taskUtils";
import StatusBadge from "./StatusBadge";
import type { SortKey, SortOrder } from "../candidates/page";

type Props = {
  candidates: Candidate[];
  sortKey?: SortKey;
  sortOrder?: SortOrder;
  onSort?: (key: SortKey) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  showArchived?: boolean;
};

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg
      className={`ml-1 h-3 w-3 flex-shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-300"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {active && order === "asc"
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />}
    </svg>
  );
}

export default function CandidateTable({
  candidates, sortKey, sortOrder = "desc", onSort,
  selectedIds, onToggleSelect, onToggleSelectAll, allSelected,
  onDuplicate, onArchive, onUnarchive, onDelete,
}: Props) {
  const router = useRouter();
  const { interviewStages } = useRecruitment();
  const hasActions = !!(onDuplicate || onArchive || onUnarchive || onDelete);

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg className="mb-4 h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">該当する応募者がいません</p>
        <p className="mt-1 text-xs text-slate-400">検索条件を変更してみてください</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            {onToggleSelectAll && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected ?? false}
                  onChange={onToggleSelectAll}
                  aria-label="すべて選択"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                />
              </th>
            )}
            <th className="px-5 py-3 text-left">
              <button
                onClick={() => onSort?.("name")}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              >
                氏名<SortIcon active={sortKey === "name"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">応募職種</th>
            <th className="px-5 py-3 text-left">
              <button
                onClick={() => onSort?.("status")}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              >
                ステータス<SortIcon active={sortKey === "status"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">次のタスク</th>
            <th className="px-5 py-3 text-left">
              <button
                onClick={() => onSort?.("appliedAt")}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              >
                応募日<SortIcon active={sortKey === "appliedAt"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3 text-left">
              <button
                onClick={() => onSort?.("updatedAt")}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              >
                最終更新<SortIcon active={sortKey === "updatedAt"} order={sortOrder} />
              </button>
            </th>
            {hasActions && <th className="w-28 px-3 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {candidates.map((candidate) => {
            const task = getTaskForCandidate(candidate, interviewStages);
            const isSelected = selectedIds?.has(candidate.id) ?? false;
            return (
              <tr
                key={candidate.id}
                className={`transition-colors hover:bg-slate-50 ${isSelected ? "bg-blue-50/40" : ""}`}
              >
                {onToggleSelect && (
                  <td className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(candidate.id)}
                      aria-label={`${candidate.name}を選択`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    />
                  </td>
                )}
                <td
                  className="cursor-pointer px-5 py-4"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  <div>
                    <span className="text-sm font-semibold text-blue-700 hover:text-blue-900">{candidate.name}</span>
                    {candidate.nameKana && (
                      <p className="text-[11px] text-slate-400">{candidate.nameKana}</p>
                    )}
                    {candidate.tags && candidate.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td
                  className="cursor-pointer px-5 py-4"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  <div>
                    <span className="text-sm text-slate-700">{candidate.position}</span>
                    {candidate.source && (
                      <p className="mt-0.5 text-xs text-slate-400">{candidate.source}</p>
                    )}
                  </div>
                </td>
                <td
                  className="cursor-pointer px-5 py-4"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  <StatusBadge status={candidate.status} />
                </td>
                <td
                  className="cursor-pointer px-5 py-4"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  {task ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td
                  className="cursor-pointer px-5 py-4 text-sm text-slate-500"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  {candidate.appliedAt}
                </td>
                <td
                  className="cursor-pointer px-5 py-4 text-sm text-slate-500"
                  onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                >
                  {candidate.updatedAt}
                </td>
                {hasActions && (
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      {onDuplicate && (
                        <button
                          onClick={() => onDuplicate(candidate.id)}
                          aria-label={`${candidate.name}を複製`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      {onArchive && (
                        <button
                          onClick={() => onArchive(candidate.id)}
                          aria-label={`${candidate.name}をアーカイブ`}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
                          </svg>
                        </button>
                      )}
                      {onUnarchive && (
                        <button
                          onClick={() => onUnarchive(candidate.id)}
                          aria-label={`${candidate.name}のアーカイブを解除`}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(`「${candidate.name}」を削除します。この操作は元に戻せません。`)) {
                              onDelete(candidate.id);
                            }
                          }}
                          aria-label={`${candidate.name}を削除`}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
