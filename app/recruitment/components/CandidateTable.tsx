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

export default function CandidateTable({ candidates, sortKey, sortOrder = "desc", onSort }: Props) {
  const router = useRouter();
  const { interviewStages } = useRecruitment();

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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {candidates.map((candidate) => {
            const task = getTaskForCandidate(candidate, interviewStages);
            return (
              <tr
                key={candidate.id}
                onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
                className="cursor-pointer transition-colors hover:bg-blue-50/60"
              >
                <td className="px-5 py-4">
                  <span className="text-sm font-bold text-blue-700">{candidate.name}</span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">{candidate.position}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={candidate.status} />
                </td>
                <td className="px-5 py-4">
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
                <td className="px-5 py-4 text-sm text-gray-500">{candidate.appliedAt}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{candidate.updatedAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
