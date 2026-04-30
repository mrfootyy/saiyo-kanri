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
    <svg className={`ml-1 h-3.5 w-3.5 flex-shrink-0 transition-colors ${active ? "text-blue-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="mb-4 h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-base font-semibold text-gray-500">該当する応募者がいません</p>
        <p className="mt-1 text-sm text-gray-400">検索条件を変更してみてください</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            {onToggleSelectAll && (
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected ?? false}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </th>
            )}
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <button onClick={() => onSort?.("name")} className="inline-flex items-center hover:text-gray-800 transition-colors">
                氏名<SortIcon active={sortKey === "name"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">応募職種</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <button onClick={() => onSort?.("status")} className="inline-flex items-center hover:text-gray-800 transition-colors">
                ステータス<SortIcon active={sortKey === "status"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">次のタスク</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <button onClick={() => onSort?.("appliedAt")} className="inline-flex items-center hover:text-gray-800 transition-colors">
                応募日<SortIcon active={sortKey === "appliedAt"} order={sortOrder} />
              </button>
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <button onClick={() => onSort?.("updatedAt")} className="inline-flex items-center hover:text-gray-800 transition-colors">
                最終更新<SortIcon active={sortKey === "updatedAt"} order={sortOrder} />
              </button>
            </th>
            {hasActions && <th className="w-28 px-3 py-3.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {candidates.map((candidate) => {
            const task = getTaskForCandidate(candidate, interviewStages);
            const isSelected = selectedIds?.has(candidate.id) ?? false;
            return (
              <tr
                key={candidate.id}
                className={`transition-colors hover:bg-blue-50/60 ${isSelected ? "bg-blue-50/40" : ""}`}
              >
                {onToggleSelect && (
                  <td className="w-10 px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(candidate.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                )}
                <td className="cursor-pointer px-5 py-4" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>
                  <div>
                    <span className="text-sm font-bold text-blue-700">{candidate.name}</span>
                    {candidate.tags && candidate.tags.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="cursor-pointer px-5 py-4 text-sm text-gray-700" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>
                  <div>
                    {candidate.position}
                    {candidate.source && (
                      <p className="mt-0.5 text-xs text-gray-400">{candidate.source}</p>
                    )}
                  </div>
                </td>
                <td className="cursor-pointer px-5 py-4" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>
                  <StatusBadge status={candidate.status} />
                </td>
                <td className="cursor-pointer px-5 py-4" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>
                  {task ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="cursor-pointer px-5 py-4 text-sm text-gray-500" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>{candidate.appliedAt}</td>
                <td className="cursor-pointer px-5 py-4 text-sm text-gray-500" onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}>{candidate.updatedAt}</td>
                {hasActions && (
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {onDuplicate && (
                        <button onClick={() => onDuplicate(candidate.id)} title="複製"
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      {onArchive && (
                        <button onClick={() => onArchive(candidate.id)} title="アーカイブ"
                          className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
                          </svg>
                        </button>
                      )}
                      {onUnarchive && (
                        <button onClick={() => onUnarchive(candidate.id)} title="アーカイブ解除"
                          className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          title="削除"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
