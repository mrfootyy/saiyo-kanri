"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRecruitment } from "../../../../context";
import {
  EvaluationGrade,
  EvaluationItem,
  InterviewAudioSummary,
  InterviewFormat,
  InterviewQuestion,
  InterviewRecord,
  InterviewResult,
  InterviewStage,
  SlackNotification,
  SlackChannelConfig,
} from "../../../../types";
import { STAGE_TYPE_OPTIONS, getDocumentEvaluationItems, getInterviewEvaluationItems } from "../../../../constants";
import { deriveCandidateStatusFromFlow } from "../../../../statusUtils";
import { authFetch } from "../../../../../../lib/authFetch";

const RESULT_OPTIONS: InterviewResult[] = ["通過", "保留", "不採用"];

const GRADE_OPTIONS: EvaluationGrade[] = ["1", "2", "3", "4", "5"];

const GRADE_LABEL: Record<EvaluationGrade, string> = {
  "5": "秀",
  "4": "優",
  "3": "良",
  "2": "可",
  "1": "不可",
};

const GRADE_ACTIVE: Record<EvaluationGrade, string> = {
  "5": "bg-blue-700 text-white border-blue-700",
  "4": "bg-blue-600 text-white border-blue-600",
  "3": "bg-blue-500 text-white border-blue-500",
  "2": "bg-blue-400 text-white border-blue-400",
  "1": "bg-slate-500 text-white border-slate-500",
};

const GRADE_IDLE = "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const textareaCls = "w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";

function ResultIcon({ result }: { result: InterviewResult }) {
  if (result === "通過") return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
  if (result === "保留") return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function isStageAccessible(stage: InterviewStage, allStages: InterviewStage[], records: InterviewRecord[]): boolean {
  const sorted = [...allStages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === stage.id);
  for (let i = 0; i < idx; i++) {
    const rec = records.find((r) => r.stageId ? r.stageId === sorted[i].id : r.stageName === sorted[i].name);
    if (!rec || rec.result !== "通過") return false;
  }
  return true;
}

export default function StageDetailPage() {
  const params = useParams();
  const { candidates, interviewStages, updateCandidate, addSlackNotifications, interviewers: interviewerOptions, interviewQuestions, getInterviewerMention, slackChannelConfig } = useRecruitment();

  const candidate = candidates.find((c) => c.id === params.id);
  const stage = interviewStages.find((s) => s.id === params.stageId);

  if (!candidate || !stage) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-slate-500">
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
  const nextAccessible = nextStage ? isStageAccessible(nextStage, interviewStages, candidate.interviewRecords) : false;

  function handleSave(updatedRecords: InterviewRecord[], notifications: SlackNotification[]) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const ts = `${today} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newStatus = deriveCandidateStatusFromFlow(updatedRecords, interviewStages, candidate!.status);
    const visibleNotifications = notifications.filter((n) => n.channel !== "面接官DM");

    if (newStatus !== candidate!.status) {
      const statusLine = `ステータスも「${candidate!.status}」から「${newStatus}」に更新されました。`;
      const ch = visibleNotifications.find((n) => n.channel === "#採用チャンネル");
      if (ch) {
        ch.message = `${ch.message}\n${statusLine}`;
      } else {
        visibleNotifications.push({
          id: crypto.randomUUID(),
          candidateId: candidate!.id,
          candidateName: candidate!.name,
          sentAt: ts,
          channel: slackChannelConfig.statusChange,
          message: `${candidate!.name}さんの${statusLine}`,
        });
      }
    }

    updateCandidate({ ...candidate!, status: newStatus, updatedAt: today, interviewRecords: updatedRecords });
    if (visibleNotifications.length > 0) addSlackNotifications(visibleNotifications);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ページヘッダー */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <Link
          href={`/recruitment/candidates/${candidate.id}`}
          className="mb-3 flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
          {candidate.name}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white" aria-hidden="true">
              {sortedIdx + 1}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{stage.name}</h1>
              <p className="text-xs text-slate-400">{candidate.name} · {candidate.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accessible && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${stage.id}/interview`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                面接モード
              </Link>
            )}
            {prevStage && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${prevStage.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
                </svg>
                {prevStage.name}
              </Link>
            )}
            {nextStage && (
              nextAccessible ? (
                <Link
                  href={`/recruitment/candidates/${candidate.id}/stages/${nextStage.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  {nextStage.name}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-400">
                  {nextStage.name}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
        {!accessible ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">このステージはまだ開始できません</p>
            <p className="mt-1.5 text-sm text-slate-500">
              {prevStage ? (
                <>「{prevStage.name}」の判定を<span className="font-semibold text-blue-600">通過</span>にすると開放されます。</>
              ) : "前のステージを完了させてください。"}
            </p>
            {prevStage && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${prevStage.id}`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
            records={candidate.interviewRecords}
            assignedQuestionIds={candidate.assignedQuestions ?? []}
            interviewQuestions={interviewQuestions}
            interviewerOptions={interviewerOptions}
            getInterviewerMention={getInterviewerMention}
            slackChannelConfig={slackChannelConfig}
            addSlackNotifications={addSlackNotifications}
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
  records,
  assignedQuestionIds,
  interviewQuestions,
  interviewerOptions,
  getInterviewerMention,
  slackChannelConfig,
  addSlackNotifications,
  onSave,
}: {
  candidateId: string;
  candidateName: string;
  candidatePosition: string;
  stage: InterviewStage;
  records: InterviewRecord[];
  assignedQuestionIds: string[];
  interviewQuestions: InterviewQuestion[];
  interviewerOptions: string[];
  getInterviewerMention: (name: string) => string;
  slackChannelConfig: SlackChannelConfig;
  addSlackNotifications: (notifications: SlackNotification[]) => void;
  onSave: (records: InterviewRecord[], notifications: SlackNotification[]) => void;
}) {
  const existing = records.find((r) => r.stageId ? r.stageId === stage.id : r.stageName === stage.name) ?? null;
  const recordIdRef = useRef(existing?.id ?? crypto.randomUUID());

  const stageDef = STAGE_TYPE_OPTIONS.find((s) => s.name === stage.name);
  const showInterviewers = stageDef?.hasInterviewers ?? true;
  const showFormat = stageDef?.hasFormat ?? true;
  const isDocumentStage = !stageDef?.hasInterviewers && !stageDef?.hasFormat;

  function makeInitialEvaluations(): EvaluationItem[] {
    if (existing?.evaluations) return existing.evaluations;
    const items = isDocumentStage
      ? getDocumentEvaluationItems(candidatePosition)
      : getInterviewEvaluationItems(candidatePosition);
    return items.map((name) => ({ name, grade: null, episode: "" }));
  }

  const [result, setResult] = useState<InterviewResult | null>(existing?.result ?? null);
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(existing?.time ?? "");
  const [format, setFormat] = useState<InterviewFormat>(existing?.format ?? stage.format);
  const [zoomUrl, setZoomUrl] = useState(existing?.zoomUrl ?? "");
  const [zoomCreating, setZoomCreating] = useState(false);
  const [zoomError, setZoomError] = useState("");
  const [interviewers, setInterviewers] = useState<string[]>(existing?.interviewers ?? []);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>(makeInitialEvaluations);
  const [decisionReason, setDecisionReason] = useState(existing?.decisionReason ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [audioSummary, setAudioSummary] = useState<InterviewAudioSummary | null>(existing?.audioSummary ?? null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "stopped">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(existing?.audioSummary?.durationSeconds ?? 0);
  const [audioError, setAudioError] = useState("");
  const [micPermission, setMicPermission] = useState<PermissionState | "unsupported" | "unknown">("unknown");
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [shareState, setShareState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const firstAutoSave = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(recordingSeconds);

  const completedCount = useMemo(() => {
    let n = 0;
    if (evaluations.every((e) => e.grade !== null)) n++;
    if (evaluations.every((e) => e.episode.trim())) n++;
    if (decisionReason.trim()) n++;
    return n;
  }, [decisionReason, evaluations]);
  const totalRequired = 3;
  const evaluationReady = completedCount === totalRequired;
  const stageQuestionItems = useMemo(() => {
    const assigned = new Set(assignedQuestionIds);
    return interviewQuestions.filter((question) => {
      if (question.stage !== stage.name) return false;
      return question.required || assigned.has(question.id);
    });
  }, [assignedQuestionIds, interviewQuestions, stage.name]);

  function updateEval(i: number, patch: Partial<EvaluationItem>) {
    setEvaluations((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function buildRecord(): InterviewRecord {
    return {
      id: recordIdRef.current,
      stageId: stage.id,
      stageName: stage.name,
      date,
      time: time.trim() || undefined,
      interviewers,
      notes,
      rating: null,
      result,
      evaluations,
      decisionReason,
      format: showFormat ? format : undefined,
      zoomUrl: showFormat && format === "オンライン" && zoomUrl.trim() ? zoomUrl.trim() : undefined,
      audioSummary: audioSummary ?? undefined,
    };
  }

  function persistRecord(record: InterviewRecord) {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const currentRecord = records.find((r) =>
      r.id === record.id || (r.stageId ? r.stageId === stage.id : r.stageName === stage.name)
    );
    const updated = currentRecord
      ? records.map((r) => (r.id === currentRecord.id ? { ...record, id: currentRecord.id } : r))
      : [...records, record];

    const notifications: SlackNotification[] = [];

    if (record.result !== null && record.result !== existing?.result) {
      notifications.push({
        id: crypto.randomUUID(),
        candidateId,
        candidateName,
        sentAt: timestamp,
        channel: slackChannelConfig.offerDecision,
        message: `${candidateName}さんの【${stage.name}】の判定が「${record.result}」になりました。`,
      });
    }

    const prevInterviewers = new Set(currentRecord?.interviewers ?? []);
    const addedInterviewers = record.interviewers.filter((name) => !prevInterviewers.has(name));
    if (addedInterviewers.length > 0) {
      const mentions = addedInterviewers.map((name) => getInterviewerMention(name)).join(" ");
      notifications.push({
        id: crypto.randomUUID(),
        candidateId,
        candidateName,
        sentAt: timestamp,
        channel: slackChannelConfig.interviewAssign,
        message: `${mentions} ${candidateName}さんの【${stage.name}】を担当してください。日程: ${date}`,
      });
    }

    onSave(updated, notifications);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  async function shareSchedule() {
    if (interviewers.length === 0) return;
    setShareState("sending");
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const mentions = interviewers.map((name) => getInterviewerMention(name)).join(" ");
    const dateTime = [date, time].filter(Boolean).join(" ");
    const zoomLine = zoomUrl ? `\nZoom URL: ${zoomUrl}` : "";
    const notification: SlackNotification = {
      id: crypto.randomUUID(),
      candidateId,
      candidateName,
      sentAt: timestamp,
      channel: slackChannelConfig.interviewAssign,
      message: `${mentions} 【面接予定のご共有】\n候補者: ${candidateName}（${stage.name}）\n日時: ${dateTime || "未設定"}${zoomLine}`,
    };
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          addSlackNotifications([notification]);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      setShareState("sent");
    } catch {
      setShareState("error");
    }
    setTimeout(() => setShareState("idle"), 3000);
  }

  async function createZoomMeeting() {
    if (!date || !time) {
      setZoomError("Zoom URLを発行する前に、実施日時の日付と開始時刻を指定してください。");
      return;
    }

    setZoomCreating(true);
    setZoomError("");

    try {
      const startTime = `${date}T${time}:00`;
      const response = await authFetch("/api/zoom/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${candidateName}さん ${stage.name}`,
          startTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
          durationMinutes: stage.durationMinutes || 60,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Zoom URL の発行に失敗しました。");
      setZoomUrl(result.joinUrl);
    } catch (error) {
      setZoomError(error instanceof Error ? error.message : "Zoom URL の発行に失敗しました。");
    } finally {
      setZoomCreating(false);
    }
  }

  useEffect(() => {
    if (firstAutoSave.current) { firstAutoSave.current = false; return; }
    setSaveState("saving");
    const timer = window.setTimeout(() => persistRecord(buildRecord()), 700);
    return () => window.clearTimeout(timer);
  }, [audioSummary, date, time, decisionReason, evaluations, format, interviewers, notes, result, zoomUrl]);

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    async function loadMicrophonePermission() {
      if (!navigator.permissions?.query) {
        setMicPermission("unsupported");
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setMicPermission(permissionStatus.state);
        permissionStatus.onchange = () => setMicPermission(permissionStatus?.state ?? "unknown");
      } catch {
        setMicPermission("unsupported");
      }
    }

    loadMicrophonePermission();
    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  async function startRecording() {
    setAudioError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("このブラウザでは録音に対応していません。Chromeなどで試してください。");
      return;
    }

    if (micPermission === "denied") {
      setAudioError("マイクがブラウザ側でブロックされています。アドレスバー左のサイト設定からマイクを「許可」に変更してから、もう一度録音開始を押してください。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setAudioError("録音データを作成できませんでした。もう一度試してください。");
          return;
        }
        const dataUrl = await blobToDataUrl(blob);
        setAudioSummary((prev) => ({
          id: prev?.id ?? crypto.randomUUID(),
          recordedAt: formatTimestamp(new Date()),
          fileName: `interview-${stage.id}-${Date.now()}.webm`,
          mimeType: blob.type || "audio/webm",
          size: blob.size,
          durationSeconds: recordingSecondsRef.current,
          dataUrl,
          transcript: prev?.transcript ?? "",
          summary: prev?.summary ?? "",
          highlights: prev?.highlights ?? [],
          concerns: prev?.concerns ?? [],
          nextActions: prev?.nextActions ?? [],
        }));
        setRecordingState("stopped");
      };

      recorder.start();
      setRecordingState("recording");
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      setRecordingState("idle");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setMicPermission("denied");
        setAudioError("マイクの使用が許可されませんでした。ブロックした場合は、アドレスバー左のサイト設定からマイクを許可に変更してください。");
        return;
      }

      setAudioError("マイクを開始できませんでした。別のマイクが使用中でないか確認してください。");
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function summarizeRecording() {
    if (!audioSummary?.dataUrl) {
      setAudioError("録音データがこのブラウザに残っていません。もう一度録音してください。");
      return;
    }

    setAudioProcessing(true);
    setAudioError("");
    try {
      const blob = await dataUrlToBlob(audioSummary.dataUrl);
      const formData = new FormData();
      formData.append("audio", blob, audioSummary.fileName);
      formData.append("candidateName", candidateName);
      formData.append("candidatePosition", candidatePosition);
      formData.append("stageName", stage.name);
      formData.append("notes", notes);
      formData.append("questions", stageQuestionItems.map((question, index) => `Q${index + 1}. ${question.text}`).join("\n"));

      const response = await authFetch("/api/ai/interview-audio-summary", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "録音の要約に失敗しました。");

      setAudioSummary((prev) => prev ? {
        ...prev,
        transcript: result.transcript ?? "",
        summary: result.summary ?? "",
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        concerns: Array.isArray(result.concerns) ? result.concerns : [],
        nextActions: Array.isArray(result.nextActions) ? result.nextActions : [],
      } : prev);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "録音の要約に失敗しました。");
    } finally {
      setAudioProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* 合否判定 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">合否判定</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {evaluationReady
                ? "評価が完了しました。判定を選択してください。"
                : `評価を完了すると判定を選択できます（${completedCount}/${totalRequired} 完了）`}
            </p>
          </div>
          {result && (
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
              result === "通過" ? "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200" :
              result === "保留" ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200" :
              "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300/60"
            }`}>
              <ResultIcon result={result} />
              {result}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          {!evaluationReady && (
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(completedCount / totalRequired) * 100}%` }}
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={totalRequired}
                aria-label="評価進捗"
              />
            </div>
          )}
          <div className="flex gap-2">
            {RESULT_OPTIONS.map((r) => (
              <button
                key={r}
                disabled={!evaluationReady}
                onClick={() => { if (!evaluationReady) return; setResult(result === r ? null : r); }}
                aria-pressed={result === r}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                  !evaluationReady
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : result === r
                      ? r === "通過"
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : r === "保留"
                          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                          : "border-slate-600 bg-slate-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <ResultIcon result={r} />
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isDocumentStage ? (
        <>
          {/* 実施日時 */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">実施日時</h2>
            </div>
            <div className="flex gap-3 px-5 py-4">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`flex-1 ${inputCls}`} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={300} className={`w-36 ${inputCls}`} />
            </div>
          </div>

          {/* 書類評価 */}
          <EvaluationCard
            title="書類評価"
            subtitle={`職種：${candidatePosition}　5=秀、4=優、3=良、2=可、1=不可`}
            evaluations={evaluations}
            decisionReason={decisionReason}
            onUpdateEval={updateEval}
            onUpdateReason={setDecisionReason}
          />

          {/* メモ */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">メモ</h2>
              <p className="mt-0.5 text-xs text-slate-500">総合所感・気になった点など自由に記載してください。</p>
            </div>
            <div className="px-5 py-4">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="書類・テストの所感を入力" className={textareaCls} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 実施概要 */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">実施概要</h2>
              {showInterviewers && (
                <button
                  onClick={shareSchedule}
                  disabled={shareState === "sending" || interviewers.length === 0}
                  title={interviewers.length === 0 ? "担当面接官を選択してください" : "面接予定をSlackで共有"}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                    shareState === "sent"
                      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 focus-visible:ring-green-400"
                      : shareState === "error"
                      ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 focus-visible:ring-red-400"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-400"
                  }`}
                >
                  {shareState === "sending" ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      送信中...
                    </>
                  ) : shareState === "sent" ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      送信しました
                    </>
                  ) : shareState === "error" ? (
                    "送信エラー"
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      面接予定を共有
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="px-5 py-4">
              <div className={`grid gap-5 ${showFormat ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                {/* 日時 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">実施日時</p>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={300} placeholder="開始時刻" className={inputCls} />
                </div>

                {/* 形式 */}
                {showFormat && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">面接形式</p>
                    <div className="flex gap-2">
                      {(["オンライン", "対面"] as InterviewFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          aria-pressed={format === fmt}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            format === fmt
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {fmt === "オンライン" ? (
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom URL */}
              {showFormat && format === "オンライン" && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">Zoom ミーティング URL</p>
                    <p className="text-xs text-slate-400">
                      作成日時: {date || "日付未指定"} {time || "開始時刻未指定"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={zoomUrl}
                      onChange={(e) => setZoomUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className={`flex-1 ${inputCls}`}
                    />
                    <button
                      type="button"
                      onClick={createZoomMeeting}
                      disabled={zoomCreating}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {zoomCreating ? "発行中..." : "URL を発行"}
                    </button>
                    {zoomUrl && (
                      <a
                        href={zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        開く
                      </a>
                    )}
                  </div>
                  {zoomError && <p className="mt-2 text-xs font-medium text-red-600">{zoomError}</p>}
                </div>
              )}

              {/* 面接官 */}
              {showInterviewers && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    担当面接官
                    {interviewers.length > 0 && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{interviewers.length}名</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {interviewerOptions.map((opt) => {
                      const checked = interviewers.includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => setInterviewers((prev) => checked ? prev.filter((i) => i !== opt) : [...prev, opt])}
                          aria-pressed={checked}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            checked
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
          </div>

          {/* 評価表 */}
          <EvaluationCard
            title="評価"
            subtitle={`職種：${candidatePosition}　5=秀、4=優、3=良、2=可、1=不可`}
            evaluations={evaluations}
            decisionReason={decisionReason}
            onUpdateEval={updateEval}
            onUpdateReason={setDecisionReason}
          />

          {/* 面接メモ */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">面接メモ</h2>
              <p className="mt-0.5 text-xs text-slate-500">数値化しにくい印象・雰囲気・気になった点を自由に記載してください。</p>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="候補者の印象、コミュニケーションの様子、気になった点など…"
                className={textareaCls}
              />
            </div>
          </div>
        </>
      )}

      {/* 自動保存インジケーター */}
      <div className="flex items-center justify-end gap-2 pb-2">
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 text-xs transition-all ${
            saveState === "saved" ? "text-blue-600" :
            saveState === "saving" ? "text-slate-400" :
            "text-slate-300"
          }`}
        >
          {saveState === "saving" && (
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saveState === "saved" && (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saveState === "saved" ? "自動保存しました" : saveState === "saving" ? "保存中..." : "自動保存"}
        </div>
      </div>
    </div>
  );
}

function InterviewSupportCard({
  audioError,
  audioProcessing,
  audioSummary,
  micPermission,
  questions,
  recordingSeconds,
  recordingState,
  onStartRecording,
  onStopRecording,
  onSummarizeRecording,
}: {
  audioError: string;
  audioProcessing: boolean;
  audioSummary: InterviewAudioSummary | null;
  micPermission: PermissionState | "unsupported" | "unknown";
  questions: InterviewQuestion[];
  recordingSeconds: number;
  recordingState: "idle" | "recording" | "stopped";
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSummarizeRecording: () => void;
}) {
  const canSummarize = !!audioSummary?.dataUrl && recordingState !== "recording";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">面接質問・録音</h2>
          <p className="mt-0.5 text-xs text-slate-500">質問を見ながら録音し、停止後にAIで文字起こしと要約を保存します。</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            recordingState === "recording" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
          }`}>
            {recordingState === "recording" ? `録音中 ${formatDuration(recordingSeconds)}` : `録音 ${formatDuration(audioSummary?.durationSeconds ?? recordingSeconds)}`}
          </span>
          {recordingState === "recording" ? (
            <button
              type="button"
              onClick={onStopRecording}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              停止
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecording}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                micPermission === "denied"
                  ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {micPermission === "denied" ? "マイク許可を確認" : "録音開始"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-0 divide-y divide-slate-100 lg:grid-cols-[minmax(0,1fr)_300px] lg:divide-x lg:divide-y-0">
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">このステージの質問</p>
            <span className="text-xs text-slate-400">{questions.length}件</span>
          </div>
          {questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              このステージ用の質問はまだありません。
            </p>
          ) : (
            <ol className="space-y-2">
              {questions.map((question, index) => (
                <li key={question.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Q{index + 1}</span>
                    {question.required && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">必須</span>}
                    {question.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200">{tag}</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">{question.text}</p>
                  {question.modelAnswer && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{question.modelAnswer}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">録音データ</p>
          {audioSummary?.dataUrl ? (
            <audio controls src={audioSummary.dataUrl} className="w-full" />
          ) : (
            <div className="flex h-12 items-center rounded-lg bg-slate-50 px-3 text-xs text-slate-400">
              録音データはありません。
            </div>
          )}
          {audioSummary && (
            <div className="mt-2 space-y-0.5 text-xs text-slate-400">
              <p>{audioSummary.recordedAt}</p>
              <p>{formatBytes(audioSummary.size)} / {formatDuration(audioSummary.durationSeconds)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onSummarizeRecording}
            disabled={!canSummarize || audioProcessing}
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {audioProcessing ? "AI要約中..." : "AIで要約して保存"}
          </button>
          {audioError && <p className="mt-2 text-xs text-red-600" role="alert">{audioError}</p>}
          {micPermission === "denied" && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">
              Chromeならアドレスバー左のアイコンから「サイトの設定」を開き、マイクを許可に変更してください。変更後、このページで録音開始を押すと再開できます。
            </div>
          )}
        </div>
      </div>

      {(audioSummary?.summary || audioSummary?.transcript) && (
        <div className="border-t border-slate-100 px-5 py-4">
          {audioSummary.summary && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">AI要約</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{audioSummary.summary}</p>
            </div>
          )}
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <SummaryList title="評価できる点" items={audioSummary.highlights} />
            <SummaryList title="懸念・確認点" items={audioSummary.concerns} />
            <SummaryList title="次のアクション" items={audioSummary.nextActions} />
          </div>
          {audioSummary.transcript && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-blue-700">文字起こしを見る</summary>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                {audioSummary.transcript}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">未生成</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="text-xs leading-relaxed text-slate-700">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EvaluationCard({
  title,
  subtitle,
  evaluations,
  decisionReason,
  onUpdateEval,
  onUpdateReason,
}: {
  title: string;
  subtitle: string;
  evaluations: EvaluationItem[];
  decisionReason: string;
  onUpdateEval: (i: number, patch: Partial<EvaluationItem>) => void;
  onUpdateReason: (v: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {evaluations.map((item, i) => (
          <div key={item.name} className="grid grid-cols-[180px_auto_1fr] items-start gap-4 px-5 py-4">
            <div className="pt-1">
              <p className="text-sm font-medium text-slate-800">{item.name}</p>
            </div>
            <div className="flex gap-1 pt-0.5">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => onUpdateEval(i, { grade: item.grade === g ? null : g })}
                  aria-label={`${item.name}: ${g}点`}
                  aria-pressed={item.grade === g}
                  className={`h-8 w-8 rounded-md border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    item.grade === g ? GRADE_ACTIVE[g] : GRADE_IDLE
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <textarea
              value={item.episode}
              onChange={(e) => onUpdateEval(i, { episode: e.target.value })}
              rows={2}
              placeholder="評価の根拠を具体的に記載（必須）"
              aria-label={`${item.name} のコメント`}
              className={textareaCls}
            />
          </div>
        ))}
        <div className="grid grid-cols-[180px_auto_1fr] items-start gap-4 bg-slate-50/60 px-5 py-4">
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-800">合否判断の理由</p>
            <span className="mt-0.5 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">必須</span>
          </div>
          <div />
          <textarea
            value={decisionReason}
            onChange={(e) => onUpdateReason(e.target.value)}
            rows={3}
            placeholder="合否の判断理由を詳細に記載してください。"
            className={textareaCls}
          />
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("録音データの読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
