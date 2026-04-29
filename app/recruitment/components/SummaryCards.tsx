"use client";

import { Candidate } from "../types";

type Props = {
  candidates: Candidate[];
};

export default function SummaryCards({ candidates }: Props) {
  const total = candidates.length;

  const active = candidates.filter(
    (c) => c.status !== "不採用" && c.status !== "辞退" && c.status !== "内定"
  ).length;

  const offered = candidates.filter((c) => c.status === "内定").length;

  const pendingEval = candidates.filter(
    (c) => c.interviewers.length > 0 && c.memo === ""
  ).length;

  const cards = [
    { label: "応募者数", value: total, color: "bg-blue-50 border-blue-200", textColor: "text-blue-700" },
    { label: "選考中", value: active, color: "bg-yellow-50 border-yellow-200", textColor: "text-yellow-700" },
    { label: "内定", value: offered, color: "bg-green-50 border-green-200", textColor: "text-green-700" },
    { label: "評価待ち", value: pendingEval, color: "bg-orange-50 border-orange-200", textColor: "text-orange-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-4 ${card.color}`}
        >
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`mt-1 flex items-baseline gap-1 text-3xl font-bold ${card.textColor}`}>
            {card.value}
            <span className="text-xs font-normal text-gray-400">件</span>
          </p>
        </div>
      ))}
    </div>
  );
}
