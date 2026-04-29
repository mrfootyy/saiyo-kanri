"use client";

import Link from "next/link";
import { CandidateStatus, InterviewRecord, InterviewStage } from "../types";
import { getStageIndexForStatus, isTerminalStatus } from "../statusUtils";

type StageState = "passed" | "active" | "pending" | "rejected_here" | "locked";

function getStageState(
  stage: InterviewStage,
  index: number,
  sorted: InterviewStage[],
  records: InterviewRecord[],
  manualStatus: CandidateStatus
): StageState {
  if (manualStatus === "不採用" || manualStatus === "辞退") {
    const record = records.find((r) => r.stageName === stage.name);
    if (record?.result === "通過") return "passed";
    if (record?.result === "不採用") return "rejected_here";
    if (record?.result === "保留") return "pending";
    return "locked";
  }
  if (manualStatus === "内定") return "passed";

  // 記録の中で最も後ろのステージのインデックスを求め、それより前は通過扱い
  const lastRecordedIndex = sorted.reduce((max, s, i) => {
    return records.some((r) => r.stageName === s.name) ? i : max;
  }, -1);

  // このステージの記録
  const record = records.find((r) => r.stageName === stage.name);

  if (record) {
    if (record.result === "通過") return "passed";
    if (record.result === "不採用") return "rejected_here";
    if (record.result === "保留") return "pending";
    // 記録はあるが結果未入力 → active
    return "active";
  }

  // 記録なし: より後のステージに記録がある → 通過済みとみなす
  if (index < lastRecordedIndex) return "passed";

  const manualStageIndex = getStageIndexForStatus(manualStatus, sorted);
  if (!isTerminalStatus(manualStatus) && lastRecordedIndex === -1 && manualStageIndex >= 0) {
    if (index < manualStageIndex) return "passed";
    if (index === manualStageIndex) return "active";
    return "locked";
  }

  // 前のステージが通過していなければ locked
  for (let i = 0; i < index; i++) {
    const prevRecord = records.find((r) => r.stageName === sorted[i].name);
    if (!prevRecord || prevRecord.result !== "通過") {
      return "locked";
    }
  }

  return "active";
}

const STATE_CIRCLE: Record<StageState, string> = {
  passed: "border-gray-500 bg-gray-500 text-white",
  active: "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200",
  pending: "border-amber-500 bg-amber-500 text-white",
  rejected_here: "border-red-600 bg-red-600 text-white",
  locked: "border-gray-300 bg-gray-100 text-gray-400",
};

const STATE_LABEL: Record<StageState, string> = {
  passed: "text-gray-600",
  active: "text-blue-700",
  pending: "text-amber-700",
  rejected_here: "text-red-700",
  locked: "text-gray-400",
};

export default function StepFlowBar({
  stages,
  records,
  manualStatus,
  candidateId,
}: {
  stages: InterviewStage[];
  records: InterviewRecord[];
  manualStatus: CandidateStatus;
  candidateId?: string;
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-8">
      <div className="flex items-start justify-center gap-0">
        {sorted.map((stage, i) => {
          const state = getStageState(stage, i, sorted, records, manualStatus);
          const isAccessible =
            state === "passed" || state === "active" || state === "pending" || state === "rejected_here";

          const circleContent = (
            <>
              {state === "passed" ? (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : state === "rejected_here" ? (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : state === "locked" ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <>
                  <span className="text-[10px] font-bold leading-none tracking-wider">STEP</span>
                  <span className="mt-0.5 text-xl font-bold leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </>
              )}
            </>
          );

          return (
            <div key={stage.id} className="flex items-start">
              <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
                {/* 円はクリック不可 — 詳細を見るボタンで遷移 */}
                <div className={`flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border-2 transition-all ${STATE_CIRCLE[state]}`}>
                  {circleContent}
                </div>

                <span className={`mt-2 max-w-[96px] text-center text-sm font-semibold leading-tight ${STATE_LABEL[state]}`}>
                  {stage.name}
                </span>

                {state === "pending" && (
                  <span className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">保留</span>
                )}

                {candidateId && isAccessible && (
                  <Link
                    href={`/recruitment/candidates/${candidateId}/stages/${stage.id}`}
                    className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap"
                  >
                    詳細を見る
                  </Link>
                )}
              </div>

              {i < sorted.length - 1 && (
                <div
                  className={`mt-9 h-0.5 w-12 flex-shrink-0 transition-colors ${
                    state === "passed" ? "bg-gray-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
