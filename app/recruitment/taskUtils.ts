import { Candidate, CandidateStatus, EmailHistory, InterviewStage } from "./types";
import { STAGE_TYPE_OPTIONS } from "./constants";

const TERMINAL_STATUSES: CandidateStatus[] = ["内定", "不採用", "辞退"];

export type CandidateTask = {
  candidateId: string;
  candidateName: string;
  position: string;
  stageName: string;
  stageId: string;
  label: string;
  detail: string;
  dueLabel: string;
  severity: "overdue" | "due_soon" | "normal";
  daysWaiting: number;
  kind: "stage" | "evaluation" | "interviewer" | "reply";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function recordMatchesStage(record: Candidate["interviewRecords"][number], stage: InterviewStage): boolean {
  return record.stageId ? record.stageId === stage.id : record.stageName === stage.name;
}

export function getTaskForCandidate(
  candidate: Candidate,
  interviewStages: InterviewStage[]
): CandidateTask | null {
  if (TERMINAL_STATUSES.includes(candidate.status)) return null;

  const sorted = [...interviewStages].sort((a, b) => a.order - b.order);

  // 面接記録を見て、最初に「通過」していないステージを次のタスクとする
  for (const stage of sorted) {
    const record = candidate.interviewRecords.find((r) => recordMatchesStage(r, stage));
    if (!record || record.result !== "通過") {
      const needsInterviewer = stageNeedsInterviewer(stage.name);
      const interviewers = record?.interviewers ?? [];
      const isEvaluationMissing = !!record && record.result === null;
      const baseDate = record?.date ?? getPreviousPassedDate(candidate, sorted, stage.name) ?? candidate.appliedAt;
      const dueDays = isEvaluationMissing ? 1 : stage.name.includes("書類") ? 3 : 5;
      const daysWaiting = getDaysWaiting(baseDate);
      const daysLeft = dueDays - daysWaiting;
      const isInterviewerMissing = needsInterviewer && interviewers.length === 0;
      const label = isInterviewerMissing
        ? `${stage.name}の面接官を設定する`
        : isEvaluationMissing
        ? `${stage.name}の評価を入力する`
        : `${stage.name}を対応する`;
      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        position: candidate.position,
        stageName: stage.name,
        stageId: stage.id,
        label,
        detail: isInterviewerMissing
          ? "面接官が未設定です。設定するとSlackにメンション通知されます。"
          : isEvaluationMissing
          ? "面接・選考後の評価が未入力です。"
          : `${baseDate}から${daysWaiting}日経過しています。`,
        dueLabel: formatDueLabel(daysLeft),
        severity: isInterviewerMissing ? "due_soon" : getSeverity(daysLeft),
        daysWaiting,
        kind: isInterviewerMissing ? "interviewer" : isEvaluationMissing ? "evaluation" : "stage",
      };
    }
  }

  return null;
}

function stageNeedsInterviewer(stageName: string): boolean {
  const def = STAGE_TYPE_OPTIONS.find((stage) => stage.name === stageName);
  return def?.hasInterviewers ?? true;
}

export function getAllTasks(
  candidates: Candidate[],
  interviewStages: InterviewStage[],
  emailHistories: EmailHistory[] = []
): CandidateTask[] {
  return candidates
    .flatMap((c) => {
      const tasks: CandidateTask[] = [];
      const stageTask = getTaskForCandidate(c, interviewStages);
      const replyTask = getReplyWaitingTask(c, emailHistories);
      if (stageTask) tasks.push(stageTask);
      if (replyTask) tasks.push(replyTask);
      return tasks;
    })
    .sort((a, b) => {
      const priority = { overdue: 0, due_soon: 1, normal: 2 };
      return priority[a.severity] - priority[b.severity] || b.daysWaiting - a.daysWaiting;
    });
}

function getReplyWaitingTask(candidate: Candidate, emailHistories: EmailHistory[]): CandidateTask | null {
  if (TERMINAL_STATUSES.includes(candidate.status)) return null;

  const histories = emailHistories
    .filter((email) => email.candidateId === candidate.id)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  const latest = histories[0];
  if (!latest || latest.direction !== "送信") return null;

  const daysWaiting = getDaysWaiting(latest.sentAt);
  const daysLeft = 3 - daysWaiting;

  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    position: candidate.position,
    stageName: "候補者返信",
    stageId: "",
    label: "候補者からの返信を確認する",
    detail: `最後の送信メール「${latest.subject}」から${daysWaiting}日経過しています。`,
    dueLabel: formatDueLabel(daysLeft),
    severity: getSeverity(daysLeft),
    daysWaiting,
    kind: "reply",
  };
}

function getPreviousPassedDate(candidate: Candidate, sorted: InterviewStage[], stageName: string): string | undefined {
  const currentIndex = sorted.findIndex((stage) => stage.name === stageName);
  if (currentIndex <= 0) return undefined;

  const previousStage = sorted[currentIndex - 1];
  return candidate.interviewRecords.find((record) => recordMatchesStage(record, previousStage) && record.result === "通過")?.date;
}

function getDaysWaiting(dateText: string): number {
  const date = parseDate(dateText);
  if (!date) return 0;
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.max(0, Math.floor((today.getTime() - target.getTime()) / DAY_MS));
}

function parseDate(dateText: string): Date | null {
  const normalized = dateText.split(" ")[0]?.replace(/\//g, "-");
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getSeverity(daysLeft: number): CandidateTask["severity"] {
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 1) return "due_soon";
  return "normal";
}

function formatDueLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}日超過`;
  if (daysLeft === 0) return "今日まで";
  if (daysLeft === 1) return "明日まで";
  return `あと${daysLeft}日`;
}
