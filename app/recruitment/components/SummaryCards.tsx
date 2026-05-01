"use client";

import { Candidate } from "../types";
import { ACTIVE_STATUSES } from "../constants";

type Props = { candidates: Candidate[] };

export default function SummaryCards({ candidates }: Props) {
  const total = candidates.length;
  const active = candidates.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;
  const offered = candidates.filter((c) => c.status === "内定").length;
  const pendingEval = candidates.filter(
    (c) => ACTIVE_STATUSES.includes(c.status) && c.interviewRecords.some((r) => r.result === null)
  ).length;

  const cards = [
    { label: "応募者数",  value: total,       unit: "名", text: "text-blue-600" },
    { label: "選考中",    value: active,      unit: "名", text: "text-blue-600" },
    { label: "内定",      value: offered,     unit: "名", text: "text-blue-700" },
    { label: "評価待ち",  value: pendingEval, unit: "名", text: "text-slate-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p className={`mt-2 tabular-nums text-3xl font-semibold ${card.text}`}>
            {card.value}
            <span className="ml-1 text-sm font-normal text-slate-400">{card.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
