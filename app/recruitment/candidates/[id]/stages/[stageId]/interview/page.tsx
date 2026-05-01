"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRecruitment } from "../../../../../context";
import { Candidate, DocumentFile, InterviewAudioSummary, InterviewQuestion, InterviewRecord } from "../../../../../types";
import { authFetch } from "../../../../../../../lib/authFetch";

type RecordingState = "idle" | "recording" | "stopped";
type MicPermission = PermissionState | "unsupported" | "unknown";
type MainPanelTab = "質問" | "基本情報" | "書類" | "評価";

export default function InterviewModePage() {
  const params = useParams();
  const { candidates, interviewStages, interviewQuestions, updateCandidate, addInterviewQuestion } = useRecruitment();
  const candidate = candidates.find((item) => item.id === params.id);
  const stage = interviewStages.find((item) => item.id === params.stageId);

  const existing = candidate?.interviewRecords.find((record) =>
    stage ? (record.stageId ? record.stageId === stage.id : record.stageName === stage.name) : false
  ) ?? null;

  const [audioSummary, setAudioSummary] = useState<InterviewAudioSummary | null>(existing?.audioSummary ?? null);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(existing?.audioSummary?.durationSeconds ?? 0);
  const [audioError, setAudioError] = useState("");
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const [activePanelTab, setActivePanelTab] = useState<MainPanelTab>("質問");
  const [interviewNotes, setInterviewNotes] = useState(existing?.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(recordingSeconds);

  const allStageQuestions = useMemo(() => {
    if (!stage) return [];
    return interviewQuestions.filter((q) => q.stage === stage.name);
  }, [interviewQuestions, stage]);

  const stageQuestions = useMemo(() => {
    if (!candidate || !stage) return [];
    const assigned = new Set(candidate.assignedQuestions ?? []);
    return allStageQuestions.filter((q) => q.required || assigned.has(q.id));
  }, [candidate, allStageQuestions, stage]);

  function isQuestionActive(q: InterviewQuestion) {
    if (q.required) return true;
    return (candidate?.assignedQuestions ?? []).includes(q.id);
  }

  function toggleQuestion(questionId: string) {
    if (!candidate) return;
    const assigned = new Set(candidate.assignedQuestions ?? []);
    if (assigned.has(questionId)) {
      assigned.delete(questionId);
    } else {
      assigned.add(questionId);
    }
    const today = new Date().toISOString().slice(0, 10);
    updateCandidate({ ...candidate, assignedQuestions: Array.from(assigned), updatedAt: today });
  }

  function addNewQuestion() {
    if (!newQuestionText.trim() || !stage || !candidate) return;
    const newQ: InterviewQuestion = {
      id: crypto.randomUUID(),
      stage: stage.name,
      text: newQuestionText.trim(),
      required: false,
      tags: [],
      modelAnswer: "",
    };
    addInterviewQuestion(newQ);
    const today = new Date().toISOString().slice(0, 10);
    const assigned = [...(candidate.assignedQuestions ?? []), newQ.id];
    updateCandidate({ ...candidate, assignedQuestions: assigned, updatedAt: today });
    setNewQuestionText("");
  }

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

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

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  if (!candidate || !stage) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-slate-500">
        <p className="text-base">ページが見つかりません。</p>
        <Link href="/recruitment/candidates" className="mt-3 text-sm text-blue-600 hover:underline">
          応募者一覧に戻る
        </Link>
      </div>
    );
  }

  function persistAudioSummary(next: InterviewAudioSummary) {
    if (!candidate || !stage) return;
    const today = new Date().toISOString().slice(0, 10);
    const baseRecord: InterviewRecord = existing ?? {
      id: crypto.randomUUID(),
      stageId: stage.id,
      stageName: stage.name,
      date: today,
      interviewers: stage.interviewers,
      notes: interviewNotes,
      rating: null,
      result: null,
      format: stage.format,
    };
    const nextRecord = { ...baseRecord, notes: interviewNotes, audioSummary: next };
    const hasRecord = candidate.interviewRecords.some((record) =>
      record.id === baseRecord.id || (record.stageId ? record.stageId === stage.id : record.stageName === stage.name)
    );
    const interviewRecords = hasRecord
      ? candidate.interviewRecords.map((record) =>
          record.id === baseRecord.id || (record.stageId ? record.stageId === stage.id : record.stageName === stage.name)
            ? nextRecord
            : record
        )
      : [...candidate.interviewRecords, nextRecord];
    updateCandidate({ ...candidate, updatedAt: today, interviewRecords });
  }

  function persistInterviewNotes() {
    if (!candidate || !stage) return;
    const today = new Date().toISOString().slice(0, 10);
    const baseRecord: InterviewRecord = existing ?? {
      id: crypto.randomUUID(),
      stageId: stage.id,
      stageName: stage.name,
      date: today,
      interviewers: stage.interviewers,
      notes: "",
      rating: null,
      result: null,
      format: stage.format,
    };
    const nextRecord = { ...baseRecord, notes: interviewNotes };
    const hasRecord = candidate.interviewRecords.some((record) =>
      record.id === baseRecord.id || (record.stageId ? record.stageId === stage.id : record.stageName === stage.name)
    );
    const interviewRecords = hasRecord
      ? candidate.interviewRecords.map((record) =>
          record.id === baseRecord.id || (record.stageId ? record.stageId === stage.id : record.stageName === stage.name)
            ? nextRecord
            : record
        )
      : [...candidate.interviewRecords, nextRecord];
    updateCandidate({ ...candidate, updatedAt: today, interviewRecords });
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 1600);
  }

  async function startRecording() {
    setAudioError("");
    const currentStage = stage;
    if (!currentStage) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("このブラウザでは録音に対応していません。Chromeなどで試してください。");
      return;
    }
    if (micPermission === "denied") {
      setAudioError("マイクがブラウザ側でブロックされています。アドレスバー左のサイト設定からマイクを「許可」に変更してください。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
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
        const next: InterviewAudioSummary = {
          id: audioSummary?.id ?? crypto.randomUUID(),
          recordedAt: formatTimestamp(new Date()),
          fileName: `interview-${currentStage.id}-${Date.now()}.webm`,
          mimeType: blob.type || "audio/webm",
          size: blob.size,
          durationSeconds: recordingSecondsRef.current,
          dataUrl: await blobToDataUrl(blob),
          transcript: audioSummary?.transcript ?? "",
          summary: audioSummary?.summary ?? "",
          highlights: audioSummary?.highlights ?? [],
          concerns: audioSummary?.concerns ?? [],
          nextActions: audioSummary?.nextActions ?? [],
        };
        setAudioSummary(next);
        persistAudioSummary(next);
        setRecordingState("stopped");
      };

      recorder.start();
      setRecordingState("recording");
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
    } catch (error) {
      setRecordingState("idle");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setMicPermission("denied");
        setAudioError("マイクの使用が許可されませんでした。アドレスバー左のサイト設定からマイクを許可に変更してください。");
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
    const currentCandidate = candidate;
    const currentStage = stage;
    if (!currentCandidate || !currentStage) return;
    if (!audioSummary?.dataUrl) {
      setAudioError("録音データがこのブラウザに残っていません。もう一度録音してください。");
      return;
    }

    setAudioProcessing(true);
    setAudioError("");
    try {
      const formData = new FormData();
      formData.append("audio", await dataUrlToBlob(audioSummary.dataUrl), audioSummary.fileName);
      formData.append("candidateName", currentCandidate.name);
      formData.append("candidatePosition", currentCandidate.position);
      formData.append("stageName", currentStage.name);
      formData.append("questions", stageQuestions.map((q, i) => `Q${i + 1}. ${q.text}`).join("\n"));
      formData.append("notes", interviewNotes);

      const response = await authFetch("/api/ai/interview-audio-summary", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "録音の要約に失敗しました。");

      const next: InterviewAudioSummary = {
        ...audioSummary,
        transcript: result.transcript ?? "",
        summary: result.summary ?? "",
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        concerns: Array.isArray(result.concerns) ? result.concerns : [],
        nextActions: Array.isArray(result.nextActions) ? result.nextActions : [],
      };
      setAudioSummary(next);
      persistAudioSummary(next);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "録音の要約に失敗しました。");
    } finally {
      setAudioProcessing(false);
    }
  }

  const displaySeconds = recordingState === "recording" ? recordingSeconds : audioSummary?.durationSeconds ?? recordingSeconds;
  const canSummarize = !!audioSummary?.dataUrl && recordingState !== "recording";
  const panelTabs: MainPanelTab[] = ["質問", "基本情報", "書類", "評価"];
  const isQuestionTab = activePanelTab === "質問";

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              href={`/recruitment/candidates/${candidate.id}/stages/${stage.id}`}
              className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
              </svg>
              評価画面に戻る
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">面接モード</h1>
            <p className="text-xs text-slate-400">{candidate.name} · {stage.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 録音コントロール */}
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recordingState === "recording" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
              {recordingState === "recording" ? `録音中 ${formatDuration(displaySeconds)}` : `録音 ${formatDuration(displaySeconds)}`}
            </span>
            {recordingState === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${micPermission === "denied" ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {micPermission === "denied" ? "マイク許可を確認" : "録音開始"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 面接中の参照パネル */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-shrink-0 border-b border-slate-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isQuestionTab ? (editingQuestions ? "質問を管理" : "このステージの質問") : activePanelTab}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isQuestionTab
                    ? editingQuestions
                      ? `全${allStageQuestions.length}件 · 有効${stageQuestions.length}件`
                      : `${stageQuestions.length}件`
                    : `${candidate.name}の応募者情報`}
                </p>
              </div>
              {isQuestionTab && (
                <button
                  type="button"
                  onClick={() => { setEditingQuestions((v) => !v); setNewQuestionText(""); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    editingQuestions
                      ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {editingQuestions ? "完了" : "質問を編集"}
                </button>
              )}
            </div>
            <div className="flex px-5" role="tablist" aria-label="面接中の表示切り替え">
              {panelTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activePanelTab === tab}
                  onClick={() => {
                    setActivePanelTab(tab);
                    if (tab !== "質問") {
                      setEditingQuestions(false);
                      setNewQuestionText("");
                    }
                  }}
                  className={`mr-5 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-[-2px] ${
                    activePanelTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {activePanelTab === "質問" && (editingQuestions ? (
              /* 編集モード */
              <div className="space-y-2">
                {allStageQuestions.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    このステージの質問はまだありません。
                  </p>
                )}
                {allStageQuestions.map((q, index) => {
                  const active = isQuestionActive(q);
                  return (
                    <div
                      key={q.id}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        active ? "border-blue-100 bg-blue-50" : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="mt-0.5 flex flex-shrink-0 flex-col items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-blue-600 text-white" : "bg-slate-300 text-white"}`}>
                          Q{index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-relaxed ${active ? "text-slate-900" : "text-slate-400"}`}>{q.text}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {q.required && (
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">必須</span>
                          )}
                          {q.tags.map((tag) => (
                            <span key={tag} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200">{tag}</span>
                          ))}
                        </div>
                      </div>
                      {q.required ? (
                        <div className="flex-shrink-0 pt-0.5" title="必須質問は変更できません">
                          <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleQuestion(q.id)}
                          aria-pressed={active}
                          className={`flex-shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            active
                              ? "border-slate-300 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              : "border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
                          }`}
                        >
                          {active ? "削除" : "追加"}
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* 新しい質問を追加 */}
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">新しい質問を追加</p>
                  <textarea
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    rows={2}
                    placeholder="質問文を入力..."
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNewQuestion();
                    }}
                  />
                  <button
                    type="button"
                    onClick={addNewQuestion}
                    disabled={!newQuestionText.trim()}
                    className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    追加して有効化
                  </button>
                </div>
              </div>
            ) : (
              /* 通常モード */
              <>
                {stageQuestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                    このステージ用の質問はまだありません。「質問を編集」から追加できます。
                  </p>
                ) : (
                  <ol className="space-y-3 pb-10">
                    {stageQuestions.map((q, index) => (
                      <QuestionCard key={q.id} question={q} index={index} />
                    ))}
                  </ol>
                )}
              </>
            ))}
            {activePanelTab === "基本情報" && <CandidateBasicInfo candidate={candidate} />}
            {activePanelTab === "書類" && <CandidateDocuments candidate={candidate} />}
            {activePanelTab === "評価" && <CandidateEvaluationInfo candidate={candidate} record={existing} />}
          </div>
        </section>

        {/* 録音・AI要約パネル */}
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">録音・AI要約</h2>
            <p className="mt-0.5 text-xs text-slate-500">停止後に文字起こしと要約を保存します。</p>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="interview-notes" className="text-xs font-semibold text-slate-600">
                  面接メモ
                </label>
                <button
                  type="button"
                  onClick={persistInterviewNotes}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    notesSaved ? "bg-blue-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {notesSaved ? "保存済み" : "保存"}
                </button>
              </div>
              <textarea
                id="interview-notes"
                value={interviewNotes}
                onChange={(event) => setInterviewNotes(event.target.value)}
                onBlur={persistInterviewNotes}
                rows={7}
                placeholder="回答内容、気になった点、深掘りしたいことをメモ"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {audioSummary?.dataUrl ? (
              <audio controls src={audioSummary.dataUrl} className="w-full" />
            ) : (
              <div className="flex h-14 items-center rounded-lg bg-slate-50 px-3 text-xs text-slate-400">録音データはありません。</div>
            )}
            {audioSummary && (
              <div className="space-y-0.5 text-xs text-slate-400">
                <p>{audioSummary.recordedAt}</p>
                <p>{formatBytes(audioSummary.size)} / {formatDuration(audioSummary.durationSeconds)}</p>
              </div>
            )}
            <button
              type="button"
              onClick={summarizeRecording}
              disabled={!canSummarize || audioProcessing}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {audioProcessing ? "AI要約中..." : "AIで要約して保存"}
            </button>
            {audioError && <p className="text-xs text-red-600" role="alert">{audioError}</p>}
            {micPermission === "denied" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">
                Chromeならアドレスバー左のアイコンから「サイトの設定」を開き、マイクを許可に変更してください。
              </div>
            )}
            {(audioSummary?.summary || audioSummary?.transcript) && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {audioSummary.summary && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">AI要約</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{audioSummary.summary}</p>
                  </div>
                )}
                <SummaryList title="評価できる点" items={audioSummary.highlights} />
                <SummaryList title="懸念・確認点" items={audioSummary.concerns} />
                <SummaryList title="次のアクション" items={audioSummary.nextActions} />
                {audioSummary.transcript && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-blue-700">文字起こしを見る</summary>
                    <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                      {audioSummary.transcript}
                    </p>
                  </details>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

    </div>
  );
}

function CandidateBasicInfo({ candidate }: { candidate: Candidate }) {
  return (
    <div className="space-y-4">
      <InfoSection title="基本情報">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="氏名" value={candidate.name} />
          {candidate.nameKana && <InfoRow label="ふりがな" value={candidate.nameKana} />}
          <InfoRow label="応募職種" value={candidate.position} />
          {candidate.age && <InfoRow label="年齢" value={`${candidate.age}歳`} />}
          <InfoRow label="ステータス" value={candidate.status} />
          <InfoRow label="応募日" value={candidate.appliedAt} />
          {candidate.source && <InfoRow label="応募経路" value={candidate.source} />}
        </div>
      </InfoSection>

      <InfoSection title="連絡先">
        <div className="grid gap-3 sm:grid-cols-2">
          {candidate.email ? <InfoRow label="メール" value={candidate.email} /> : <EmptyInfo text="メールアドレスは未登録です。" />}
          {candidate.phone ? <InfoRow label="電話" value={candidate.phone} /> : <EmptyInfo text="電話番号は未登録です。" />}
        </div>
      </InfoSection>

      {candidate.skills && candidate.skills.length > 0 && (
        <InfoSection title="スキル">
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                {skill}
              </span>
            ))}
          </div>
        </InfoSection>
      )}

      {candidate.companies && candidate.companies.length > 0 && (
        <InfoSection title="職歴">
          <div className="space-y-2">
            {candidate.companies.map((company, index) => (
              <div key={`${company.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-slate-800">{company.name}</span>
                <span className="flex-shrink-0 text-xs text-slate-400">{company.years ? `${company.years}年` : "年数未入力"}</span>
              </div>
            ))}
          </div>
        </InfoSection>
      )}

      {candidate.memo && (
        <InfoSection title="メモ">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{candidate.memo}</p>
        </InfoSection>
      )}
    </div>
  );
}

function CandidateDocuments({ candidate }: { candidate: Candidate }) {
  const documents = [
    { label: "履歴書", file: candidate.resumeFile },
    { label: "職務経歴書", file: candidate.cvFile },
    { label: "ポートフォリオ資料", file: candidate.portfolioFile },
  ].filter((item) => item.file);

  return (
    <div className="space-y-4">
      {documents.length === 0 && !candidate.portfolioUrl && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
          登録されている書類はありません。
        </div>
      )}
      {documents.map((item) => (
        <DocumentPreview key={item.label} label={item.label} file={item.file!} />
      ))}
      {candidate.portfolioUrl && (
        <InfoSection title="ポートフォリオURL">
          <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-blue-600 hover:underline">
            {candidate.portfolioUrl}
          </a>
        </InfoSection>
      )}
    </div>
  );
}

function CandidateEvaluationInfo({ candidate, record }: { candidate: Candidate; record: InterviewRecord | null }) {
  return (
    <div className="space-y-4">
      <InfoSection title="このステージの評価">
        {record ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="日付" value={record.date} />
              {record.time && <InfoRow label="時間" value={record.time} />}
              <InfoRow label="結果" value={record.result ?? "未判定"} />
              <InfoRow label="評価" value={record.rating ? `${record.rating}点` : "未評価"} />
            </div>
            {record.interviewers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.interviewers.map((interviewer) => (
                  <span key={interviewer} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {interviewer}
                  </span>
                ))}
              </div>
            )}
            {record.notes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">{record.notes}</p>}
            {record.decisionReason && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="mb-1 text-xs font-semibold text-blue-700">判定理由</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">{record.decisionReason}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyInfo text="このステージの評価はまだ登録されていません。" />
        )}
      </InfoSection>

      {record?.evaluations && record.evaluations.length > 0 && (
        <InfoSection title="評価項目">
          <div className="space-y-2">
            {record.evaluations.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs font-semibold text-blue-700">{item.grade ?? "-"}点</p>
                </div>
                {item.episode && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{item.episode}</p>}
              </div>
            ))}
          </div>
        </InfoSection>
      )}

      {candidate.tags && candidate.tags.length > 0 && (
        <InfoSection title="タグ">
          <div className="flex flex-wrap gap-1.5">
            {candidate.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {tag}
              </span>
            ))}
          </div>
        </InfoSection>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-800">{value}</p>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white px-4 py-3">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function EmptyInfo({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>;
}

function DocumentPreview({ label, file }: { label: string; file: DocumentFile }) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <section className="rounded-xl border border-slate-100 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400">{label}</h3>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{file.name}</p>
        </div>
        {file.dataUrl && (
          <a href={file.dataUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
            開く
          </a>
        )}
      </div>
      <div className="bg-slate-50 p-3">
        {file.dataUrl && isImage && (
          <img src={file.dataUrl} alt={file.name} className="max-h-[520px] w-full rounded-lg border border-slate-200 bg-white object-contain" />
        )}
        {file.dataUrl && isPdf && (
          <iframe title={file.name} src={file.dataUrl} className="h-[520px] w-full rounded-lg border border-slate-200 bg-white" />
        )}
        {file.dataUrl && !isImage && !isPdf && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            この形式はプレビューできません。開くボタンから確認してください。
          </div>
        )}
        {!file.dataUrl && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            このブラウザにはプレビューデータが残っていません。
          </div>
        )}
      </div>
    </section>
  );
}

function QuestionCard({ question, index }: { question: InterviewQuestion; index: number }) {
  return (
    <li className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">Q{index + 1}</span>
        {question.required && (
          <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">必須</span>
        )}
        {question.tags.map((tag) => (
          <span key={tag} className="rounded bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">{tag}</span>
        ))}
      </div>
      <p className="text-base font-medium leading-relaxed text-slate-900">{question.text}</p>
      {question.modelAnswer && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-blue-700">{question.modelAnswer}</p>
      )}
    </li>
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
