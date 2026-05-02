"use client";

import Link from "next/link";
import { CandidateStatus, InterviewRecord, InterviewStage } from "../types";
import { getStageIndexForStatus, isTerminalStatus, recordMatchesStage } from "../statusUtils";

type StageState = "passed" | "active" | "pending" | "rejected_here" | "locked";

function getStageState(
  stage: InterviewStage,
  index: number,
  sorted: InterviewStage[],
  records: InterviewRecord[],
  manualStatus: CandidateStatus
): StageState {
  const findRecordForStage = (target: InterviewStage) =>
    records.find((record) => recordMatchesStage(record, target));

  if (manualStatus === "不採用" || manualStatus === "辞退") {
    const record = findRecordForStage(stage);
    if (record?.result === "通過") return "passed";
    if (record?.result === "不採用") return "rejected_here";
    if (record?.result === "保留") return "pending";
    return "locked";
  }
  if (manualStatus === "内定") return "passed";

  const lastRecordedIndex = sorted.reduce((max, s, i) => {
    return records.some((r) => recordMatchesStage(r, s)) ? i : max;
  }, -1);

  const record = findRecordForStage(stage);

  if (record) {
    if (record.result === "通過") return "passed";
    if (record.result === "不採用") return "rejected_here";
    if (record.result === "保留") return "pending";
    return "active";
  }

  if (index < lastRecordedIndex) return "passed";

  const manualStageIndex = getStageIndexForStatus(manualStatus, sorted);
  if (!isTerminalStatus(manualStatus) && lastRecordedIndex === -1 && manualStageIndex >= 0) {
    if (index < manualStageIndex) return "passed";
    if (index === manualStageIndex) return "active";
    return "locked";
  }

  for (let i = 0; i < index; i++) {
    const prevRecord = findRecordForStage(sorted[i]);
    if (!prevRecord || prevRecord.result !== "通過") {
      return "locked";
    }
  }

  return "active";
}

const STATE_CIRCLE: Record<StageState, string> = {
  passed:        "border-slate-400 bg-slate-400 text-white",
  active:        "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200",
  pending:       "border-blue-400 bg-blue-400 text-white",
  rejected_here: "border-slate-600 bg-slate-600 text-white",
  locked:        "border-slate-200 bg-slate-100 text-slate-400",
};

const STATE_LABEL: Record<StageState, string> = {
  passed:        "text-slate-500",
  active:        "text-blue-700",
  pending:       "text-blue-700",
  rejected_here: "text-slate-700",
  locked:        "text-slate-400",
};

const STATE_CONNECTOR: Record<StageState, string> = {
  passed:        "bg-slate-400",
  active:        "bg-slate-200",
  pending:       "bg-slate-200",
  rejected_here: "bg-slate-200",
  locked:        "bg-slate-200",
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
    <div className="border-b border-slate-100 bg-white px-6 py-8">
      <nav aria-label="選考ステップ">
        <ol className="flex items-start justify-center gap-0">
          {sorted.map((stage, i) => {
            const state = getStageState(stage, i, sorted, records, manualStatus);
            const isAccessible = state === "passed" || state === "active" || state === "pending" || state === "rejected_here";

            return (
              <li key={stage.id} className="flex items-start">
                <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
                  <div
                    className={`flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full border-2 transition-all ${STATE_CIRCLE[state]}`}
                    aria-label={`${stage.name}: ${state === "passed" ? "通過" : state === "active" ? "進行中" : state === "pending" ? "保留" : state === "rejected_here" ? "不採用" : "未到達"}`}
                  >
                    {state === "passed" ? (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : state === "rejected_here" ? (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : state === "locked" ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">STEP</span>
                        <span className="mt-0.5 text-xl font-bold leading-none">{String(i + 1).padStart(2, "0")}</span>
                      </>
                    )}
                  </div>

                  <span className={`mt-2 max-w-[88px] text-center text-xs font-semibold leading-tight ${STATE_LABEL[state]}`}>
                    {stage.name}
                  </span>

                  {state === "pending" && (
                    <span className="mt-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                      保留
                    </span>
                  )}

                  {candidateId && isAccessible && (
                    <Link
                      href={`/recruitment/candidates/${candidateId}/stages/${stage.id}`}
                      className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 whitespace-nowrap"
                    >
                      詳細を見る
                    </Link>
                  )}
                </div>

                {i < sorted.length - 1 && (
                  <div
                    className={`mt-[34px] h-0.5 w-10 flex-shrink-0 transition-colors ${STATE_CONNECTOR[state]}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
