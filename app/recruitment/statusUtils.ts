import { CandidateStatus, InterviewRecord, InterviewStage } from "./types";

const TERMINAL_STATUSES: CandidateStatus[] = ["内定", "不採用", "辞退"];

export function getStatusForStageName(stageName: string): CandidateStatus {
  if (stageName.includes("書類") || stageName.includes("適性") || stageName.includes("テスト")) {
    return "書類選考";
  }

  if (stageName.includes("最終") || stageName.includes("オファー")) {
    return "最終面接";
  }

  if (stageName.includes("面接") || stageName.includes("面談")) {
    return "一次面接";
  }

  return "書類選考";
}

export function recordMatchesStage(record: InterviewRecord, stage: InterviewStage): boolean {
  return record.stageId ? record.stageId === stage.id : record.stageName === stage.name;
}

export function getStageIndexForStatus(status: CandidateStatus, stages: InterviewStage[]): number {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  if (status === "応募受付") return sorted.length > 0 ? 0 : -1;
  if (status === "書類選考") {
    const idx = sorted.findIndex((stage) => getStatusForStageName(stage.name) === "書類選考");
    return idx >= 0 ? idx : 0;
  }
  if (status === "一次面接") {
    const idx = sorted.findIndex((stage) => getStatusForStageName(stage.name) === "一次面接");
    return idx >= 0 ? idx : Math.min(1, sorted.length - 1);
  }
  if (status === "最終面接") {
    const idx = sorted.findIndex((stage) => getStatusForStageName(stage.name) === "最終面接");
    return idx >= 0 ? idx : sorted.length - 1;
  }

  return -1;
}

export function deriveCandidateStatusFromFlow(
  records: InterviewRecord[],
  stages: InterviewStage[],
  currentStatus: CandidateStatus
): CandidateStatus {
  if (currentStatus === "辞退") return "辞退";
  if (records.some((record) => record.result === "不採用")) return "不採用";
  if (currentStatus === "内定" || currentStatus === "不採用") return currentStatus;
  if (stages.length === 0) return currentStatus;

  const sorted = [...stages].sort((a, b) => a.order - b.order);

  for (const stage of sorted) {
    const record = records.find((r) => recordMatchesStage(r, stage));
    if (!record || record.result !== "通過") {
      return getStatusForStageName(stage.name);
    }
  }

  return "内定";
}

export function isTerminalStatus(status: CandidateStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
