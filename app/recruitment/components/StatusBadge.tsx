"use client";

import { CandidateStatus } from "../types";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  応募受付: "bg-gray-100 text-gray-500",
  書類選考: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  一次面接: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  最終面接: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  内定: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  不採用: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
  辞退: "bg-gray-100 text-gray-500",
};

type Props = {
  status: CandidateStatus;
};

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
