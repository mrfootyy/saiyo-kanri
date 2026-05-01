"use client";

import { useState } from "react";
import { useOnboarding } from "../context";
import type {
  OnboardingMember,
  OnboardingStatus,
  MemberCondition,
  RetentionRisk,
  OjtDifficulty,
  OjtProgress,
  ShareWithManager,
  TrainingRecord,
  OjtRecord,
  DailyReport,
  MentorMeeting,
  OnboardingSlackNotification,
} from "../types";

type Tab = "基本情報" | "研修記録" | "OJT記録" | "日報" | "面談記録" | "Slack通知";

const TABS: Tab[] = ["基本情報", "研修記録", "OJT記録", "日報", "面談記録", "Slack通知"];

const CONDITION_OPTIONS: MemberCondition[] = ["良好", "普通", "不安あり", "要対応"];
const RISK_OPTIONS: RetentionRisk[] = ["低", "中", "高"];
const STATUS_OPTIONS: OnboardingStatus[] = ["未開始", "進行中", "完了", "要フォロー"];
const OJT_DIFFICULTY_OPTIONS: OjtDifficulty[] = ["低", "中", "高"];
const OJT_PROGRESS_OPTIONS: OjtProgress[] = ["未着手", "作業中", "レビュー中", "完了"];
const SHARE_OPTIONS: ShareWithManager[] = ["不要", "必要"];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const selectCls =
  "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
const labelCls = "mb-1 block text-xs font-medium text-slate-500";
const textareaCls = `${inputCls} resize-none`;

function SelectArrow() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function ScoreSelect({
  value,
  onChange,
  label,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  label: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className={selectCls}
        >
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <SelectArrow />
      </div>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: MemberCondition }) {
  const cls: Record<MemberCondition, string> = {
    良好: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    普通: "bg-slate-100 text-slate-600 ring-slate-200",
    不安あり: "bg-amber-50 text-amber-700 ring-amber-200",
    要対応: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls[condition]}`}>
      {condition}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RetentionRisk }) {
  const cls: Record<RetentionRisk, string> = {
    低: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    中: "bg-amber-50 text-amber-700 ring-amber-200",
    高: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls[risk]}`}>
      リスク: {risk}
    </span>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MemberDetailModal({
  member,
  onClose,
}: {
  member: OnboardingMember;
  onClose: () => void;
}) {
  const {
    trainingRecords,
    ojtRecords,
    dailyReports,
    mentorMeetings,
    slackNotifications,
    updateMember,
    addTrainingRecord,
    addOjtRecord,
    addDailyReport,
    addMentorMeeting,
    addSlackNotification,
  } = useOnboarding();

  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const [saved, setSaved] = useState(false);

  // Basic info state
  const [mentor, setMentor] = useState(member.mentor);
  const [ojtOwner, setOjtOwner] = useState(member.ojtOwner);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(member.onboardingStatus);
  const [condition, setCondition] = useState<MemberCondition>(member.condition);
  const [retentionRisk, setRetentionRisk] = useState<RetentionRisk>(member.retentionRisk);
  const [memo, setMemo] = useState(member.memo);

  const memberTrainings = trainingRecords.filter((r) => r.memberId === member.id).sort((a, b) => b.trainedAt.localeCompare(a.trainedAt));
  const memberOjts = ojtRecords.filter((r) => r.memberId === member.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const memberReports = dailyReports.filter((r) => r.memberId === member.id).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const memberMeetings = mentorMeetings.filter((r) => r.memberId === member.id).sort((a, b) => b.meetingAt.localeCompare(a.meetingAt));
  const memberSlacks = slackNotifications.filter((r) => r.memberId === member.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  // Training form state
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [tName, setTName] = useState("");
  const [tDate, setTDate] = useState(today());
  const [tTrainer, setTTrainer] = useState("");
  const [tContent, setTContent] = useState("");
  const [tLevel, setTLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [tUrl, setTUrl] = useState("");
  const [tGood, setTGood] = useState("");
  const [tIssue, setTIssue] = useState("");
  const [tNext, setTNext] = useState("");

  // OJT form state
  const [showOjtForm, setShowOjtForm] = useState(false);
  const [oProject, setOProject] = useState("");
  const [oTask, setOTask] = useState("");
  const [oDate, setODate] = useState(today());
  const [oDifficulty, setODifficulty] = useState<OjtDifficulty>("中");
  const [oProgress, setOProgress] = useState<OjtProgress>("未着手");
  const [oReviewer, setOReviewer] = useState("");
  const [oBlocker, setOBlocker] = useState("");
  const [oFeedback, setOFeedback] = useState("");
  const [oSelfLevel, setOSelfLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [oReviewerComment, setOReviewerComment] = useState("");

  // Daily report form state
  const [showReportForm, setShowReportForm] = useState(false);
  const [rDate, setRDate] = useState(today());
  const [rDid, setRDid] = useState("");
  const [rLearned, setRLearned] = useState("");
  const [rBlocked, setRBlocked] = useState("");
  const [rNext, setRNext] = useState("");
  const [rConsultation, setRConsultation] = useState("");
  const [rCondition, setRCondition] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [rWorkload, setRWorkload] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [rIsolation, setRIsolation] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [rConfidence, setRConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);

  // Mentor meeting form state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mDate, setMDate] = useState(today());
  const [mMentor, setMMentor] = useState(member.mentor);
  const [mWorkCond, setMWorkCond] = useState<MemberCondition>("普通");
  const [mMentalCond, setMMentalCond] = useState<MemberCondition>("普通");
  const [mConsult, setMConsult] = useState("");
  const [mComment, setMComment] = useState("");
  const [mNextAction, setMNextAction] = useState("");
  const [mShare, setMShare] = useState<ShareWithManager>("不要");
  const [mRisk, setMRisk] = useState<RetentionRisk>("低");

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveBasicInfo() {
    const ts = nowTimestamp();
    const notifications: OnboardingSlackNotification[] = [];

    if (condition !== member.condition || retentionRisk !== member.retentionRisk) {
      notifications.push({
        id: crypto.randomUUID(),
        memberId: member.id,
        memberName: member.name,
        sentAt: ts,
        channel: "#オンボーディング-アラート",
        message: `${member.name}さんの状態が「${condition}」、定着リスクが「${retentionRisk}」に更新されました。`,
      });
    }

    updateMember({ ...member, mentor, ojtOwner, onboardingStatus, condition, retentionRisk, memo, updatedAt: today() });
    notifications.forEach(addSlackNotification);
    flash();
  }

  function handleAddTraining() {
    if (!tName.trim()) return;
    addTrainingRecord({
      id: crypto.randomUUID(),
      memberId: member.id,
      trainingName: tName.trim(),
      trainedAt: tDate,
      trainer: tTrainer.trim(),
      content: tContent.trim(),
      understandingLevel: tLevel,
      deliverableUrl: tUrl.trim(),
      goodPoint: tGood.trim(),
      issuePoint: tIssue.trim(),
      nextAction: tNext.trim(),
    });
    setTName(""); setTDate(today()); setTTrainer(""); setTContent(""); setTLevel(3); setTUrl(""); setTGood(""); setTIssue(""); setTNext("");
    setShowTrainingForm(false);
  }

  function handleAddOjt() {
    if (!oProject.trim() || !oTask.trim()) return;
    addOjtRecord({
      id: crypto.randomUUID(),
      memberId: member.id,
      recordedAt: oDate,
      projectName: oProject.trim(),
      taskName: oTask.trim(),
      difficulty: oDifficulty,
      progress: oProgress,
      reviewer: oReviewer.trim(),
      blocker: oBlocker.trim(),
      feedback: oFeedback.trim(),
      selfUnderstandingLevel: oSelfLevel,
      reviewerComment: oReviewerComment.trim(),
    });
    setOProject(""); setOTask(""); setODate(today()); setODifficulty("中"); setOProgress("未着手"); setOReviewer(""); setOBlocker(""); setOFeedback(""); setOSelfLevel(3); setOReviewerComment("");
    setShowOjtForm(false);
  }

  function handleAddReport() {
    if (!rDid.trim()) return;
    const newReport: DailyReport = {
      id: crypto.randomUUID(),
      memberId: member.id,
      reportedAt: rDate,
      didToday: rDid.trim(),
      learned: rLearned.trim(),
      blocked: rBlocked.trim(),
      nextPlan: rNext.trim(),
      consultation: rConsultation.trim(),
      conditionScore: rCondition,
      workloadScore: rWorkload,
      isolationScore: rIsolation,
      confidenceScore: rConfidence,
    };
    addDailyReport(newReport);

    if (rConsultation.trim()) {
      addSlackNotification({
        id: crypto.randomUUID(),
        memberId: member.id,
        memberName: member.name,
        sentAt: nowTimestamp(),
        channel: "#オンボーディング-アラート",
        message: `${member.name}さんの日報に相談事項が記載されています：「${rConsultation.trim()}」`,
      });
    }

    setRDate(today()); setRDid(""); setRLearned(""); setRBlocked(""); setRNext(""); setRConsultation(""); setRCondition(3); setRWorkload(3); setRIsolation(1); setRConfidence(3);
    setShowReportForm(false);
  }

  function handleAddMeeting() {
    if (!mMentor.trim()) return;
    const newMeeting: MentorMeeting = {
      id: crypto.randomUUID(),
      memberId: member.id,
      meetingAt: mDate,
      mentor: mMentor.trim(),
      workCondition: mWorkCond,
      mentalCondition: mMentalCond,
      consultation: mConsult.trim(),
      mentorComment: mComment.trim(),
      nextAction: mNextAction.trim(),
      shareWithManager: mShare,
      risk: mRisk,
    };
    addMentorMeeting(newMeeting);

    if (mShare === "必要") {
      addSlackNotification({
        id: crypto.randomUUID(),
        memberId: member.id,
        memberName: member.name,
        sentAt: nowTimestamp(),
        channel: "#オンボーディング-アラート",
        message: `${member.name}さんの面談で「上長への共有が必要」と判断されました。業務面：${mWorkCond}、メンタル面：${mMentalCond}、リスク：${mRisk}。`,
      });
    }

    setMDate(today()); setMMentor(member.mentor); setMWorkCond("普通"); setMMentalCond("普通"); setMConsult(""); setMComment(""); setMNextAction(""); setMShare("不要"); setMRisk("低");
    setShowMeetingForm(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{member.name}</h2>
              <ConditionBadge condition={member.condition} />
              <RiskBadge risk={member.retentionRisk} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {member.position} · {member.department} · 入社日: {member.joinedAt}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 border-b border-slate-100 px-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab}
              {tab === "研修記録" && memberTrainings.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {memberTrainings.length}
                </span>
              )}
              {tab === "OJT記録" && memberOjts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {memberOjts.length}
                </span>
              )}
              {tab === "日報" && memberReports.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {memberReports.length}
                </span>
              )}
              {tab === "面談記録" && memberMeetings.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {memberMeetings.length}
                </span>
              )}
              {tab === "Slack通知" && memberSlacks.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                  {memberSlacks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {/* 基本情報 */}
          {activeTab === "基本情報" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>メンター</label>
                  <input type="text" value={mentor} onChange={(e) => setMentor(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>OJT担当</label>
                  <input type="text" value={ojtOwner} onChange={(e) => setOjtOwner(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>研修ステータス</label>
                  <div className="relative">
                    <select value={onboardingStatus} onChange={(e) => setOnboardingStatus(e.target.value as OnboardingStatus)} className={selectCls}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <SelectArrow />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>現在の状態</label>
                  <div className="relative">
                    <select value={condition} onChange={(e) => setCondition(e.target.value as MemberCondition)} className={selectCls}>
                      {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <SelectArrow />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>定着リスク</label>
                  <div className="relative">
                    <select value={retentionRisk} onChange={(e) => setRetentionRisk(e.target.value as RetentionRisk)} className={selectCls}>
                      {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <SelectArrow />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>メモ</label>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} placeholder="入社者に関するメモを入力" className={textareaCls} />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveBasicInfo}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${saved ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {saved && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {saved ? "保存しました" : "保存する"}
                </button>
              </div>
            </div>
          )}

          {/* 研修記録 */}
          {activeTab === "研修記録" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">研修記録 <span className="ml-1 text-xs font-normal text-slate-400">({memberTrainings.length}件)</span></p>
                <button
                  onClick={() => setShowTrainingForm((v) => !v)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showTrainingForm ? "キャンセル" : "+ 記録を追加"}
                </button>
              </div>

              {showTrainingForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">新しい研修記録</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>研修名 <span className="text-red-500">*</span></label>
                        <input type="text" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="会社概要研修" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>実施日</label>
                        <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>担当者</label>
                        <input type="text" value={tTrainer} onChange={(e) => setTTrainer(e.target.value)} placeholder="田中部長" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>理解度 (1〜5)</label>
                        <div className="relative">
                          <select value={tLevel} onChange={(e) => setTLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)} className={selectCls}>
                            {([1, 2, 3, 4, 5] as const).map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>実施内容</label>
                      <textarea value={tContent} onChange={(e) => setTContent(e.target.value)} rows={2} placeholder="研修の内容を記入" className={textareaCls} />
                    </div>
                    <div>
                      <label className={labelCls}>成果物URL</label>
                      <input type="url" value={tUrl} onChange={(e) => setTUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>良かった点</label>
                        <textarea value={tGood} onChange={(e) => setTGood(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>課題点</label>
                        <textarea value={tIssue} onChange={(e) => setTIssue(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>次のアクション</label>
                      <input type="text" value={tNext} onChange={(e) => setTNext(e.target.value)} placeholder="次回までにやること" className={inputCls} />
                    </div>
                    <button
                      onClick={handleAddTraining}
                      disabled={!tName.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      追加する
                    </button>
                  </div>
                </div>
              )}

              {memberTrainings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">研修記録がまだありません。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberTrainings.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.trainingName}</p>
                          <p className="text-xs text-slate-400">{r.trainedAt} · 担当: {r.trainer || "—"}</p>
                        </div>
                        <span className="flex-shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                          理解度 {r.understandingLevel}/5
                        </span>
                      </div>
                      {r.content && <p className="mb-2 text-xs text-slate-600">{r.content}</p>}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {r.goodPoint && (
                          <p><span className="font-medium text-slate-500">良かった点:</span> <span className="text-slate-700">{r.goodPoint}</span></p>
                        )}
                        {r.issuePoint && (
                          <p><span className="font-medium text-slate-500">課題点:</span> <span className="text-slate-700">{r.issuePoint}</span></p>
                        )}
                        {r.nextAction && (
                          <p className="col-span-2"><span className="font-medium text-slate-500">次のアクション:</span> <span className="text-slate-700">{r.nextAction}</span></p>
                        )}
                        {r.deliverableUrl && (
                          <p className="col-span-2">
                            <span className="font-medium text-slate-500">成果物: </span>
                            <a href={r.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.deliverableUrl}</a>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OJT記録 */}
          {activeTab === "OJT記録" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">OJT記録 <span className="ml-1 text-xs font-normal text-slate-400">({memberOjts.length}件)</span></p>
                <button
                  onClick={() => setShowOjtForm((v) => !v)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showOjtForm ? "キャンセル" : "+ 記録を追加"}
                </button>
              </div>

              {showOjtForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">新しいOJT記録</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>プロジェクト名 <span className="text-red-500">*</span></label>
                        <input type="text" value={oProject} onChange={(e) => setOProject(e.target.value)} placeholder="採用管理システム" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>記録日</label>
                        <input type="date" value={oDate} onChange={(e) => setODate(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>担当タスク <span className="text-red-500">*</span></label>
                      <input type="text" value={oTask} onChange={(e) => setOTask(e.target.value)} placeholder="UI改善の実装" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>難易度</label>
                        <div className="relative">
                          <select value={oDifficulty} onChange={(e) => setODifficulty(e.target.value as OjtDifficulty)} className={selectCls}>
                            {OJT_DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>進捗</label>
                        <div className="relative">
                          <select value={oProgress} onChange={(e) => setOProgress(e.target.value as OjtProgress)} className={selectCls}>
                            {OJT_PROGRESS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>レビュー担当</label>
                        <input type="text" value={oReviewer} onChange={(e) => setOReviewer(e.target.value)} placeholder="田中部長" className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>詰まっているポイント</label>
                      <textarea value={oBlocker} onChange={(e) => setOBlocker(e.target.value)} rows={2} className={textareaCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>フィードバック内容</label>
                        <textarea value={oFeedback} onChange={(e) => setOFeedback(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>担当者評価</label>
                        <textarea value={oReviewerComment} onChange={(e) => setOReviewerComment(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>本人の理解度 (1〜5)</label>
                      <div className="relative w-32">
                        <select value={oSelfLevel} onChange={(e) => setOSelfLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)} className={selectCls}>
                          {([1, 2, 3, 4, 5] as const).map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <SelectArrow />
                      </div>
                    </div>
                    <button
                      onClick={handleAddOjt}
                      disabled={!oProject.trim() || !oTask.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      追加する
                    </button>
                  </div>
                </div>
              )}

              {memberOjts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">OJT記録がまだありません。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberOjts.map((r) => {
                    const progressCls: Record<OjtProgress, string> = {
                      未着手: "bg-slate-100 text-slate-600",
                      作業中: "bg-blue-100 text-blue-700",
                      レビュー中: "bg-amber-100 text-amber-700",
                      完了: "bg-emerald-100 text-emerald-700",
                    };
                    const diffCls: Record<OjtDifficulty, string> = {
                      低: "text-slate-500",
                      中: "text-amber-600",
                      高: "text-red-600",
                    };
                    return (
                      <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{r.taskName}</p>
                            <p className="text-xs text-slate-400">{r.recordedAt} · {r.projectName} · レビュー担当: {r.reviewer || "—"}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${progressCls[r.progress]}`}>{r.progress}</span>
                            <span className={`text-xs font-semibold ${diffCls[r.difficulty]}`}>難易度: {r.difficulty}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {r.blocker && (
                            <p className="col-span-2"><span className="font-medium text-red-500">詰まり:</span> <span className="text-slate-700">{r.blocker}</span></p>
                          )}
                          {r.feedback && (
                            <p><span className="font-medium text-slate-500">フィードバック:</span> <span className="text-slate-700">{r.feedback}</span></p>
                          )}
                          {r.reviewerComment && (
                            <p><span className="font-medium text-slate-500">担当者評価:</span> <span className="text-slate-700">{r.reviewerComment}</span></p>
                          )}
                          <p className="col-span-2"><span className="font-medium text-slate-500">本人理解度:</span> {r.selfUnderstandingLevel}/5</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 日報 */}
          {activeTab === "日報" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">日報 <span className="ml-1 text-xs font-normal text-slate-400">({memberReports.length}件)</span></p>
                <button
                  onClick={() => setShowReportForm((v) => !v)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showReportForm ? "キャンセル" : "+ 日報を追加"}
                </button>
              </div>

              {showReportForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">日報入力</p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>日付</label>
                      <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label className={labelCls}>今日やったこと <span className="text-red-500">*</span></label>
                      <textarea value={rDid} onChange={(e) => setRDid(e.target.value)} rows={3} placeholder="今日の業務内容を記入" className={textareaCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>学んだこと</label>
                        <textarea value={rLearned} onChange={(e) => setRLearned(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>詰まったこと</label>
                        <textarea value={rBlocked} onChange={(e) => setRBlocked(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>明日やること</label>
                        <textarea value={rNext} onChange={(e) => setRNext(e.target.value)} rows={2} className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>相談したいこと</label>
                        <textarea value={rConsultation} onChange={(e) => setRConsultation(e.target.value)} rows={2} placeholder="記入するとSlackアラートが届きます" className={textareaCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <ScoreSelect value={rCondition} onChange={setRCondition} label="今日の状態" />
                      <ScoreSelect value={rWorkload} onChange={setRWorkload} label="業務負荷" />
                      <ScoreSelect value={rIsolation} onChange={setRIsolation} label="孤立感" />
                      <ScoreSelect value={rConfidence} onChange={setRConfidence} label="自信度" />
                    </div>
                    <button
                      onClick={handleAddReport}
                      disabled={!rDid.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      追加する
                    </button>
                  </div>
                </div>
              )}

              {memberReports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">日報がまだありません。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberReports.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{r.reportedAt}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">状態 <span className="font-semibold text-slate-800">{r.conditionScore}</span></span>
                          <span className="text-slate-500">負荷 <span className="font-semibold text-slate-800">{r.workloadScore}</span></span>
                          <span className="text-slate-500">孤立 <span className="font-semibold text-slate-800">{r.isolationScore}</span></span>
                          <span className="text-slate-500">自信 <span className="font-semibold text-slate-800">{r.confidenceScore}</span></span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <p><span className="font-medium text-slate-500">今日やったこと: </span><span className="text-slate-700">{r.didToday}</span></p>
                        {r.learned && <p><span className="font-medium text-slate-500">学んだこと: </span><span className="text-slate-700">{r.learned}</span></p>}
                        {r.blocked && <p><span className="font-medium text-amber-600">詰まったこと: </span><span className="text-slate-700">{r.blocked}</span></p>}
                        {r.nextPlan && <p><span className="font-medium text-slate-500">明日やること: </span><span className="text-slate-700">{r.nextPlan}</span></p>}
                        {r.consultation && (
                          <p className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                            <span className="font-semibold">相談事項: </span>{r.consultation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 面談記録 */}
          {activeTab === "面談記録" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">面談記録 <span className="ml-1 text-xs font-normal text-slate-400">({memberMeetings.length}件)</span></p>
                <button
                  onClick={() => setShowMeetingForm((v) => !v)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showMeetingForm ? "キャンセル" : "+ 記録を追加"}
                </button>
              </div>

              {showMeetingForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">新しい面談記録</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>面談日</label>
                        <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>メンター <span className="text-red-500">*</span></label>
                        <input type="text" value={mMentor} onChange={(e) => setMMentor(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>業務面の状態</label>
                        <div className="relative">
                          <select value={mWorkCond} onChange={(e) => setMWorkCond(e.target.value as MemberCondition)} className={selectCls}>
                            {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>メンタル面の状態</label>
                        <div className="relative">
                          <select value={mMentalCond} onChange={(e) => setMMentalCond(e.target.value as MemberCondition)} className={selectCls}>
                            {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>リスク判定</label>
                        <div className="relative">
                          <select value={mRisk} onChange={(e) => setMRisk(e.target.value as RetentionRisk)} className={selectCls}>
                            {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <SelectArrow />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>相談内容</label>
                        <textarea value={mConsult} onChange={(e) => setMConsult(e.target.value)} rows={3} className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>メンターコメント</label>
                        <textarea value={mComment} onChange={(e) => setMComment(e.target.value)} rows={3} className={textareaCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>次のアクション</label>
                      <input type="text" value={mNextAction} onChange={(e) => setMNextAction(e.target.value)} placeholder="来週フォローアップ面談を設定" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>上長共有</label>
                      <div className="flex gap-3">
                        {SHARE_OPTIONS.map((s) => (
                          <label key={s} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="share"
                              value={s}
                              checked={mShare === s}
                              onChange={() => setMShare(s)}
                              className="accent-blue-600"
                            />
                            {s}
                            {s === "必要" && <span className="text-xs text-slate-400">（Slackに通知されます）</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleAddMeeting}
                      disabled={!mMentor.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      追加する
                    </button>
                  </div>
                </div>
              )}

              {memberMeetings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">面談記録がまだありません。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberMeetings.map((m) => (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{m.meetingAt}</p>
                          <p className="text-xs text-slate-400">メンター: {m.mentor}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          <ConditionBadge condition={m.workCondition} />
                          <RiskBadge risk={m.risk} />
                          {m.shareWithManager === "必要" && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">上長共有</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {m.consultation && <p><span className="font-medium text-slate-500">相談内容: </span><span className="text-slate-700">{m.consultation}</span></p>}
                        {m.mentorComment && <p><span className="font-medium text-slate-500">メンターコメント: </span><span className="text-slate-700">{m.mentorComment}</span></p>}
                        {m.nextAction && <p><span className="font-medium text-slate-500">次のアクション: </span><span className="text-slate-700">{m.nextAction}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Slack通知 */}
          {activeTab === "Slack通知" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Slack通知履歴 <span className="ml-1 text-xs font-normal text-slate-400">({memberSlacks.length}件)</span></p>
              {memberSlacks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">通知履歴がありません。</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memberSlacks.map((n) => (
                    <div key={n.id} className="rounded-lg bg-slate-50 px-4 py-3 text-xs">
                      <div className="mb-1 flex items-center justify-between text-slate-400">
                        <span className="font-medium">{n.channel}</span>
                        <span>{n.sentAt}</span>
                      </div>
                      <p className="text-slate-700">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
