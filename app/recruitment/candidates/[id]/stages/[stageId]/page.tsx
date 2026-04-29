"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRecruitment } from "../../../../context";
import {
  EvaluationGrade,
  EvaluationItem,
  InterviewFormat,
  InterviewRating,
  InterviewRecord,
  InterviewResult,
  InterviewStage,
  SlackNotification,
} from "../../../../types";
import { INTERVIEWER_OPTIONS, STAGE_TYPE_OPTIONS, getDocumentEvaluationItems, getInterviewEvaluationItems } from "../../../../constants";
import { deriveCandidateStatusFromFlow } from "../../../../statusUtils";

const RESULT_OPTIONS: InterviewResult[] = ["通過", "保留", "不採用"];

const RESULT_BUTTON: Record<InterviewResult, string> = {
  通過: "border-green-600 bg-green-600 text-white shadow-lg shadow-green-200 ring-2 ring-green-200",
  保留: "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-200 ring-2 ring-amber-200",
  不採用: "border-red-600 bg-red-600 text-white shadow-lg shadow-red-200 ring-2 ring-red-200",
};

const RESULT_IDLE: Record<InterviewResult, string> = {
  通過: "border-gray-300 bg-white text-gray-600 hover:border-green-400 hover:bg-green-50 hover:text-green-700",
  保留: "border-gray-300 bg-white text-gray-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700",
  不採用: "border-gray-300 bg-white text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700",
};

const RESULT_ICON: Record<InterviewResult, string> = {
  通過: "✓",
  保留: "△",
  不採用: "✕",
};

const GRADE_OPTIONS: EvaluationGrade[] = ["1", "2", "3", "4", "5"];

const GRADE_LABEL: Record<EvaluationGrade, string> = {
  "5": "秀",
  "4": "優",
  "3": "良",
  "2": "可",
  "1": "不可",
};

const GRADE_ACTIVE: Record<EvaluationGrade, string> = {
  "5": "bg-violet-600 text-white border-violet-600",
  "4": "bg-green-600 text-white border-green-600",
  "3": "bg-blue-600 text-white border-blue-600",
  "2": "bg-amber-500 text-white border-amber-500",
  "1": "bg-red-600 text-white border-red-600",
};

const GRADE_IDLE = "bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50";

function StarRating({
  value,
  onChange,
}: {
  value: InterviewRating | null;
  onChange?: (v: InterviewRating) => void;
}) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3, 4, 5] as InterviewRating[]).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={`${n}点`}
          className={`text-3xl leading-none transition-colors ${
            value !== null && n <= value ? "text-yellow-400" : "text-gray-300"
          } ${onChange ? "cursor-pointer hover:text-yellow-300" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function isStageAccessible(
  stage: InterviewStage,
  allStages: InterviewStage[],
  records: InterviewRecord[]
): boolean {
  const sorted = [...allStages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === stage.id);
  for (let i = 0; i < idx; i++) {
    const rec = records.find((r) => r.stageName === sorted[i].name);
    if (!rec || rec.result !== "通過") return false;
  }
  return true;
}


export default function StageDetailPage() {
  const params = useParams();
  const { candidates, interviewStages, updateCandidate, addSlackNotifications, interviewers: interviewerOptions, getInterviewerMention } = useRecruitment();

  const candidate = candidates.find((c) => c.id === params.id);
  const stage = interviewStages.find((s) => s.id === params.stageId);

  if (!candidate || !stage) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
        <p className="text-base">ページが見つかりません。</p>
        <Link href="/recruitment/candidates" className="mt-3 text-sm text-blue-600 hover:underline">
          ← 応募者一覧に戻る
        </Link>
      </div>
    );
  }

  const accessible = isStageAccessible(stage, interviewStages, candidate.interviewRecords);
  const sorted = [...interviewStages].sort((a, b) => a.order - b.order);
  const sortedIdx = sorted.findIndex((s) => s.id === stage.id);
  const prevStage = sortedIdx > 0 ? sorted[sortedIdx - 1] : null;
  const nextStage = sortedIdx < sorted.length - 1 ? sorted[sortedIdx + 1] : null;
  const nextAccessible = nextStage
    ? isStageAccessible(nextStage, interviewStages, candidate.interviewRecords)
    : false;

  function handleSave(updatedRecords: InterviewRecord[], notifications: SlackNotification[]) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const ts = `${today} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const newStatus = deriveCandidateStatusFromFlow(updatedRecords, interviewStages, candidate!.status);
    const visibleNotifications = notifications.filter((notification) => notification.channel !== "面接官DM");

    if (newStatus !== candidate!.status) {
      const statusLine = `ステータスも「${candidate!.status}」から「${newStatus}」に更新されました。`;
      const channelNotification = visibleNotifications.find((notification) => notification.channel === "#採用チャンネル");

      if (channelNotification) {
        channelNotification.message = `${channelNotification.message}\n${statusLine}`;
      } else {
        const statusEmoji = newStatus === "内定" ? "🎉" : newStatus === "不採用" ? "❌" : "🔄";
        visibleNotifications.push({
          id: crypto.randomUUID(),
          candidateId: candidate!.id,
          candidateName: candidate!.name,
          sentAt: ts,
          channel: "#採用チャンネル",
          message: `${statusEmoji} ${candidate!.name}さんの${statusLine}`,
        });
      }
    }

    updateCandidate({ ...candidate!, status: newStatus, updatedAt: today, interviewRecords: updatedRecords });
    if (visibleNotifications.length > 0) addSlackNotifications(visibleNotifications);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <Link
          href={`/recruitment/candidates/${candidate.id}`}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {candidate.name}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200">
              <span className="text-[9px] font-bold leading-none tracking-wider">STEP</span>
              <span className="text-xl font-bold leading-none mt-0.5">
                {String(sortedIdx + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{stage.name}</h1>
              <p className="text-sm text-gray-600">{candidate.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prevStage && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${prevStage.id}`}
                className="flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {prevStage.name}
              </Link>
            )}
            {nextStage && (
              nextAccessible ? (
                <Link
                  href={`/recruitment/candidates/${candidate.id}/stages/${nextStage.id}`}
                  className="flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {nextStage.name}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed">
                  {nextStage.name}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!accessible ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-800">このステージはまだ開始できません</p>
            <p className="mt-2 text-sm text-gray-600">
              {prevStage ? (
                <>「{prevStage.name}」の判定を<span className="font-semibold text-green-700">通過</span>にすると開放されます。</>
              ) : (
                "前のステージを完了させてください。"
              )}
            </p>
            {prevStage && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${prevStage.id}`}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                {prevStage.name} を確認する
              </Link>
            )}
          </div>
        ) : (
          <StageForm
            candidateId={candidate.id}
            candidateName={candidate.name}
            candidatePosition={candidate.position}
            stage={stage}
            sortedIdx={sortedIdx}
            allStages={sorted}
            records={candidate.interviewRecords}
            interviewerOptions={interviewerOptions}
            getInterviewerMention={getInterviewerMention}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

function StageForm({
  candidateId,
  candidateName,
  candidatePosition,
  stage,
  sortedIdx,
  allStages,
  records,
  interviewerOptions,
  getInterviewerMention,
  onSave,
}: {
  candidateId: string;
  candidateName: string;
  candidatePosition: string;
  stage: InterviewStage;
  sortedIdx: number;
  allStages: InterviewStage[];
  records: InterviewRecord[];
  interviewerOptions: string[];
  getInterviewerMention: (name: string) => string;
  onSave: (records: InterviewRecord[], notifications: SlackNotification[]) => void;
}) {
  const existing = records.find((r) => r.stageName === stage.name) ?? null;

  const stageDef = STAGE_TYPE_OPTIONS.find((s) => s.name === stage.name);
  const showInterviewers = stageDef?.hasInterviewers ?? true;
  const showFormat = stageDef?.hasFormat ?? true;
  const isDocumentStage = !stageDef?.hasInterviewers && !stageDef?.hasFormat;

  // 書類選考の場合は職種別評価項目、それ以外はデフォルト
  function makeInitialEvaluations(): EvaluationItem[] {
    if (existing?.evaluations) return existing.evaluations;
    const items = isDocumentStage
      ? getDocumentEvaluationItems(candidatePosition)
      : getInterviewEvaluationItems(candidatePosition);
    return items.map((name) => ({ name, grade: null, episode: "" }));
  }

  const [result, setResult] = useState<InterviewResult | null>(existing?.result ?? null);
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<InterviewFormat>(existing?.format ?? stage.format);
  const [zoomUrl, setZoomUrl] = useState(existing?.zoomUrl ?? "");
  const [interviewers, setInterviewers] = useState<string[]>(existing?.interviewers ?? []);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>(makeInitialEvaluations);
  const [decisionReason, setDecisionReason] = useState(existing?.decisionReason ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [rating, setRating] = useState<InterviewRating | null>(existing?.rating ?? null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const firstAutoSave = useRef(true);

  const evaluationReady = useMemo(() => {
    const gradesReady = evaluations.every((item) => item.grade !== null);
    const episodesReady = evaluations.every((item) => item.episode.trim().length > 0);
    const reasonReady = decisionReason.trim().length > 0;
    const ratingReady = isDocumentStage || rating !== null;
    return gradesReady && episodesReady && reasonReady && ratingReady;
  }, [decisionReason, evaluations, isDocumentStage, rating]);

  const evaluationHelpText = isDocumentStage
    ? "すべての評点、具体的なエピソード、合否判断の理由を入力すると、判定を選べます。"
    : "総合評価、すべての評点、具体的なエピソード、合否判断の理由を入力すると、判定を選べます。";

  function updateEval(i: number, patch: Partial<EvaluationItem>) {
    setEvaluations((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function buildRecord(): InterviewRecord {
    return {
      id: existing?.id ?? crypto.randomUUID(),
      stageName: stage.name,
      date,
      interviewers,
      notes,
      rating,
      result,
      evaluations,
      decisionReason,
      format: showFormat ? format : undefined,
      zoomUrl: showFormat && format === "オンライン" && zoomUrl.trim() ? zoomUrl.trim() : undefined,
    };
  }

  function persistRecord(record: InterviewRecord) {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const updated = existing
      ? records.map((r) => (r.id === existing.id ? record : r))
      : [...records, record];

    const notifications: SlackNotification[] = [];

    // 合否結果が変わったらSlack通知
    if (record.result !== null && record.result !== existing?.result) {
      const resultEmoji = record.result === "通過" ? "✅" : record.result === "保留" ? "⚠️" : "❌";
      notifications.push({
        id: crypto.randomUUID(),
        candidateId,
        candidateName,
        sentAt: timestamp,
        channel: "#採用チャンネル",
        message: `${resultEmoji} ${candidateName}さんの【${stage.name}】の判定が「${record.result}」になりました。`,
      });
    }

    const prevInterviewers = new Set(existing?.interviewers ?? []);
    const addedInterviewers = record.interviewers.filter((name) => !prevInterviewers.has(name));
    if (addedInterviewers.length > 0) {
      const mentions = addedInterviewers.map((name) => getInterviewerMention(name)).join(" ");
      notifications.push({
        id: crypto.randomUUID(),
        candidateId,
        candidateName,
        sentAt: timestamp,
        channel: "#採用チャンネル",
        message: `${mentions} ${candidateName}さんの【${stage.name}】を担当してください。日程: ${date}`,
      });
    }

    onSave(updated, notifications);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  useEffect(() => {
    if (firstAutoSave.current) {
      firstAutoSave.current = false;
      return;
    }

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      persistRecord(buildRecord());
    }, 700);

    return () => window.clearTimeout(timer);
  }, [date, decisionReason, evaluations, format, interviewers, notes, rating, result, zoomUrl]);

  return (
    <div className="space-y-5">
      {/* ① 判定 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">判定</p>
        <p className="mb-5 text-xl font-bold text-gray-900">この選考の合否を選択してください</p>
        {!evaluationReady && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {evaluationHelpText}
          </div>
        )}
        <div className="flex gap-3">
          {RESULT_OPTIONS.map((r) => (
            <button
              key={r}
              disabled={!evaluationReady}
              onClick={() => {
                if (!evaluationReady) return;
                setResult(result === r ? null : r);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-5 text-xl font-bold transition-all ${
                !evaluationReady
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                  : result === r ? RESULT_BUTTON[r] : `${RESULT_IDLE[r]}`
              }`}
            >
              <span className="text-2xl">{RESULT_ICON[r]}</span>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 書類選考・テスト系: 評価表＋メモ */}
      {isDocumentStage ? (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">実施日</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 px-3 py-2.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 書類選考 評価表 */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">書類評価項目</p>
              <p className="mt-1 text-xs text-gray-500">職種：{candidatePosition}　／　5=秀、4=優、3=良、2=可、1=不可</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 w-48">評価項目</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 w-44">評点</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">
                    コメント・根拠
                    <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">必須</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((item, i) => (
                  <tr key={item.name} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 align-top">{item.name}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-center gap-1">
                        {GRADE_OPTIONS.map((g) => (
                          <button
                            key={g}
                            onClick={() => updateEval(i, { grade: item.grade === g ? null : g })}
                            title={GRADE_LABEL[g]}
                            className={`h-10 w-10 rounded-lg border-2 text-base font-bold transition-all ${
                              item.grade === g ? GRADE_ACTIVE[g] : GRADE_IDLE
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <textarea
                        value={item.episode}
                        onChange={(e) => updateEval(i, { episode: e.target.value })}
                        rows={2}
                        placeholder="評価の根拠を具体的に記載してください。"
                        className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-gray-800 align-top">
                    合否判断の理由
                    <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">必須</span>
                  </td>
                  <td />
                  <td className="px-4 py-3 align-top">
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      rows={3}
                      placeholder="合否の判断理由を記載してください。"
                      className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">メモ</p>
            <p className="mb-3 text-sm font-semibold text-gray-700">選考に関する補足・コメント</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="書類・テストの総合所感、気になった点など自由に記載してください。"
              className="w-full resize-none rounded-xl border-2 border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </>
      ) : (
        <>
          {/* ② 実施概要（面接系） */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">実施概要</p>
            <div className={`grid gap-6 ${showFormat ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"}`}>
              <div>
                <p className="mb-2 text-sm font-bold text-gray-700">実施日</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-300 px-3 py-2.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {showFormat && (
                <div>
                  <p className="mb-2 text-sm font-bold text-gray-700">形式</p>
                  <div className="flex gap-2">
                    {(["オンライン", "対面"] as InterviewFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                          format === fmt
                            ? fmt === "オンライン"
                              ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200"
                              : "border-green-600 bg-green-600 text-white shadow-md shadow-green-200"
                            : "border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          {fmt === "オンライン" ? (
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                          {fmt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-bold text-gray-700">総合評価</p>
                <div className="pt-1">
                  <StarRating value={rating} onChange={setRating} />
                </div>
              </div>
            </div>

            {/* Zoom URL */}
            {showFormat && format === "オンライン" && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="mb-2 text-sm font-bold text-gray-700">Zoom ミーティング URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={zoomUrl}
                    onChange={(e) => setZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="flex-1 rounded-xl border-2 border-gray-300 px-3 py-2.5 text-base font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={() => {
                      const id = Math.floor(Math.random() * 9000000000) + 1000000000;
                      const pw = Math.random().toString(36).substring(2, 8);
                      setZoomUrl(`https://zoom.us/j/${id}?pwd=${pw}`);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    URL を発行
                  </button>
                  {zoomUrl && (
                    <a
                      href={zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-xl border-2 border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      開く
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 面接官 */}
            {showInterviewers && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="mb-2 text-sm font-bold text-gray-700">
                  面接官
                  {interviewers.length > 0 && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{interviewers.length}名</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {interviewerOptions.map((opt) => {
                    const checked = interviewers.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() =>
                          setInterviewers((prev) =>
                            checked ? prev.filter((i) => i !== opt) : [...prev, opt]
                          )
                        }
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                          checked
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ③ 評価表 */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">職種別評価項目</p>
              <p className="mt-1 text-xs text-gray-500">職種：{candidatePosition}　／　5=秀、4=優、3=良、2=可、1=不可</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 w-48">評価項目</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 w-44">評点</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">
                    具体的なエピソード・根拠（事実ベース）
                    <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">必須</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((item, i) => (
                  <tr key={item.name} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 align-top">{item.name}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-center gap-1">
                        {GRADE_OPTIONS.map((g) => (
                          <button
                            key={g}
                            onClick={() => updateEval(i, { grade: item.grade === g ? null : g })}
                            title={GRADE_LABEL[g]}
                            className={`h-10 w-10 rounded-lg border-2 text-base font-bold transition-all ${
                              item.grade === g ? GRADE_ACTIVE[g] : GRADE_IDLE
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <textarea
                        value={item.episode}
                        onChange={(e) => updateEval(i, { episode: e.target.value })}
                        rows={2}
                        placeholder="評価の根拠を具体的に記載してください。"
                        className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-gray-800 align-top">
                    合否判断の理由
                    <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">必須</span>
                  </td>
                  <td />
                  <td className="px-4 py-3 align-top">
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      rows={3}
                      placeholder="合否の判断理由を詳細に記載してください。"
                      className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ④ 面接主観メモ */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">面接主観メモ</p>
            <p className="mb-3 text-sm font-bold text-gray-700">自由記述</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="印象・雰囲気・気になった点など、数値化しにくい観察を自由に記載してください。"
              className="w-full resize-none rounded-xl border-2 border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
            saveState === "saved"
              ? "border-green-200 bg-green-50 text-green-700"
              : saveState === "saving"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          {saveState === "saved" ? "✓ 自動保存しました" : saveState === "saving" ? "自動保存中..." : "入力内容は自動保存されます"}
        </div>
      </div>
    </div>
  );
}
