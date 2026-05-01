"use client";

import { CandidateStatus } from "../types";

const STATUS_CONFIG: Record<CandidateStatus, { cls: string }> = {
  応募受付: { cls: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60" },
  書類選考: { cls: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200" },
  一次面接: { cls: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200" },
  最終面接: { cls: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200" },
  内定:     { cls: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300" },
  不採用:   { cls: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/60" },
  辞退:     { cls: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60" },
};

type Props = { status: CandidateStatus };

export default function StatusBadge({ status }: Props) {
  const { cls } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
