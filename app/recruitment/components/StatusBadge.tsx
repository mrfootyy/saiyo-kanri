"use client";

import { CandidateStatus } from "../types";

const STATUS_CONFIG: Record<CandidateStatus, { cls: string; dotCls: string }> = {
  応募受付: { cls: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60",    dotCls: "bg-slate-400" },
  書類選考: { cls: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",            dotCls: "bg-blue-500" },
  一次面接: { cls: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",            dotCls: "bg-blue-500" },
  最終面接: { cls: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200",           dotCls: "bg-blue-600" },
  内定:     { cls: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300",           dotCls: "bg-blue-700" },
  不採用:   { cls: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/60",     dotCls: "bg-slate-500" },
  辞退:     { cls: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60",     dotCls: "bg-slate-400" },
};

type Props = { status: CandidateStatus };

export default function StatusBadge({ status }: Props) {
  const { cls, dotCls } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotCls}`} aria-hidden="true" />
      {status}
    </span>
  );
}
