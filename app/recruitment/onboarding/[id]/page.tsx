"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOnboarding } from "../context";
import { useRecruitment } from "../../context";
import type {
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
} from "../types";

type Tab = "基本情報" | "研修記録" | "OJT記録" | "日報" | "面談記録";
const TABS: Tab[] = ["基本情報", "研修記録", "OJT記録", "日報", "面談記録"];

const CONDITION_OPTIONS: MemberCondition[] = ["良好", "普通", "不安あり", "要対応"];
const STATUS_OPTIONS: OnboardingStatus[] = ["未開始", "進行中", "完了"];
const OJT_DIFFICULTY_OPTIONS: OjtDifficulty[] = ["低", "中", "高"];
const OJT_PROGRESS_OPTIONS: OjtProgress[] = ["未着手", "作業中", "レビュー中", "完了"];
const SHARE_OPTIONS: ShareWithManager[] = ["不要", "必要"];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const selectCls =
  "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
const labelCls = "mb-1 block text-xs font-medium text-slate-500";
const textareaCls = `${inputCls} resize-none`;

const CONDITION_BADGE: Record<MemberCondition, string> = {
  良好: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  普通: "bg-slate-100 text-slate-600 ring-slate-200",
  不安あり: "bg-amber-50 text-amber-700 ring-amber-200",
  要対応: "bg-red-50 text-red-700 ring-red-200",
};
const RISK_BADGE: Record<RetentionRisk, string> = {
  低: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  中: "bg-amber-50 text-amber-700 ring-amber-200",
  高: "bg-red-50 text-red-700 ring-red-200",
};

function SelectArrow() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }

// ---------- Modal ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function OnboardingMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { members } = useOnboarding();
  const member = members.find((m) => m.id === id);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
        <p className="text-sm">入社者が見つかりません。</p>
        <Link href="/recruitment/onboarding" className="mt-3 text-xs text-blue-600 hover:underline">← 一覧に戻る</Link>
      </div>
    );
  }

  return <MemberDetail memberId={id} />;
}

function MemberDetail({ memberId }: { memberId: string }) {
  const {
    members, trainingRecords, ojtRecords, dailyReports, mentorMeetings,
    updateMember, addTrainingRecord, updateTrainingRecord, deleteTrainingRecord,
    addOjtRecord, updateOjtRecord, deleteOjtRecord,
    addDailyReport, updateDailyReport, deleteDailyReport,
    addMentorMeeting, updateMentorMeeting, deleteMentorMeeting,
  } = useOnboarding();
  const { interviewers } = useRecruitment();

  const member = members.find((m) => m.id === memberId)!;
  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const [saved, setSaved] = useState(false);

  // Basic info
  const [name, setName] = useState(member.name);
  const [position, setPosition] = useState(member.position);
  const [department, setDepartment] = useState(member.department);
  const [joinedAt, setJoinedAt] = useState(member.joinedAt);
  const [mentor, setMentor] = useState(member.mentor);
  const [ojtOwner, setOjtOwner] = useState(member.ojtOwner);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(member.onboardingStatus);
  const [memo, setMemo] = useState(member.memo);

  const memberTrainings = trainingRecords.filter((r) => r.memberId === memberId).sort((a, b) => b.trainedAt.localeCompare(a.trainedAt));
  const memberOjts = ojtRecords.filter((r) => r.memberId === memberId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const memberReports = dailyReports.filter((r) => r.memberId === memberId).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const memberMeetings = mentorMeetings.filter((r) => r.memberId === memberId).sort((a, b) => b.meetingAt.localeCompare(a.meetingAt));

  // Add form state
  const [showTForm, setShowTForm] = useState(false);
  const [tName, setTName] = useState(""); const [tDate, setTDate] = useState(today()); const [tTrainer, setTTrainer] = useState("");
  const [tContent, setTContent] = useState(""); const [tLevel, setTLevel] = useState<1|2|3|4|5>(3); const [tUrl, setTUrl] = useState("");
  const [tGood, setTGood] = useState(""); const [tIssue, setTIssue] = useState(""); const [tNext, setTNext] = useState("");

  const [showOForm, setShowOForm] = useState(false);
  const [oProject, setOProject] = useState(""); const [oTask, setOTask] = useState(""); const [oDate, setODate] = useState(today());
  const [oDiff, setODiff] = useState<OjtDifficulty>("中"); const [oProg, setOProg] = useState<OjtProgress>("未着手"); const [oReviewer, setOReviewer] = useState("");
  const [oBlocker, setOBlocker] = useState(""); const [oFeedback, setOFeedback] = useState(""); const [oSelf, setOSelf] = useState<1|2|3|4|5>(3);
  const [oComment, setOComment] = useState("");

  const [showRForm, setShowRForm] = useState(false);
  const [rDate, setRDate] = useState(today()); const [rDid, setRDid] = useState(""); const [rLearned, setRLearned] = useState("");
  const [rBlocked, setRBlocked] = useState(""); const [rNext, setRNext] = useState(""); const [rConsult, setRConsult] = useState("");

  const [showMForm, setShowMForm] = useState(false);
  const [mDate, setMDate] = useState(today()); const [mMentor, setMMentor] = useState(member.mentor);
  const [mWorkCond, setMWorkCond] = useState<MemberCondition>("普通"); const [mMentalCond, setMMentalCond] = useState<MemberCondition>("普通");
  const [mConsult, setMConsult] = useState(""); const [mComment, setMComment] = useState(""); const [mNext, setMNext] = useState("");
  const [mShare, setMShare] = useState<ShareWithManager>("不要");

  // Modal state
  const [editingTraining, setEditingTraining] = useState<TrainingRecord | null>(null);
  const [editingOjt, setEditingOjt] = useState<OjtRecord | null>(null);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MentorMeeting | null>(null);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  function handleSave() {
    updateMember({ ...member, name: name.trim() || member.name, position: position.trim() || member.position, department: department.trim(), joinedAt, mentor, ojtOwner, onboardingStatus, memo, updatedAt: today() });
    flash();
  }

  function handleAddTraining() {
    if (!tName.trim()) return;
    addTrainingRecord({ id: crypto.randomUUID(), memberId, trainingName: tName.trim(), trainedAt: tDate, trainer: tTrainer.trim(), content: tContent.trim(), understandingLevel: tLevel, deliverableUrl: tUrl.trim(), goodPoint: tGood.trim(), issuePoint: tIssue.trim(), nextAction: tNext.trim() });
    setTName(""); setTDate(today()); setTTrainer(""); setTContent(""); setTLevel(3); setTUrl(""); setTGood(""); setTIssue(""); setTNext("");
    setShowTForm(false);
  }

  function handleAddOjt() {
    if (!oProject.trim() || !oTask.trim()) return;
    addOjtRecord({ id: crypto.randomUUID(), memberId, recordedAt: oDate, projectName: oProject.trim(), taskName: oTask.trim(), difficulty: oDiff, progress: oProg, reviewer: oReviewer.trim(), blocker: oBlocker.trim(), feedback: oFeedback.trim(), selfUnderstandingLevel: oSelf, reviewerComment: oComment.trim() });
    setOProject(""); setOTask(""); setODate(today()); setODiff("中"); setOProg("未着手"); setOReviewer(""); setOBlocker(""); setOFeedback(""); setOSelf(3); setOComment("");
    setShowOForm(false);
  }

  function handleAddReport() {
    if (!rDid.trim()) return;
    addDailyReport({ id: crypto.randomUUID(), memberId, reportedAt: rDate, didToday: rDid.trim(), learned: rLearned.trim(), blocked: rBlocked.trim(), nextPlan: rNext.trim(), consultation: rConsult.trim(), conditionScore: 3, workloadScore: 3, isolationScore: 3, confidenceScore: 3 });
    setRDate(today()); setRDid(""); setRLearned(""); setRBlocked(""); setRNext(""); setRConsult("");
    setShowRForm(false);
  }

  function handleAddMeeting() {
    if (!mMentor.trim()) return;
    const derivedRisk: RetentionRisk =
      mWorkCond === "要対応" || mMentalCond === "要対応" ? "高"
      : mWorkCond === "不安あり" || mMentalCond === "不安あり" ? "中"
      : "低";
    addMentorMeeting({ id: crypto.randomUUID(), memberId, meetingAt: mDate, mentor: mMentor.trim(), workCondition: mWorkCond, mentalCondition: mMentalCond, consultation: mConsult.trim(), mentorComment: mComment.trim(), nextAction: mNext.trim(), shareWithManager: mShare, risk: derivedRisk });
    setMDate(today()); setMMentor(member.mentor); setMWorkCond("普通"); setMMentalCond("普通"); setMConsult(""); setMComment(""); setMNext(""); setMShare("不要");
    setShowMForm(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <Link href="/recruitment/onboarding" className="mb-3 flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
          オンボーディング一覧
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{member.name}</h1>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${CONDITION_BADGE[member.condition]}`}>{member.condition}</span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${RISK_BADGE[member.retentionRisk]}`}>リスク: {member.retentionRisk}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{member.position} · {member.department} · 入社日: {member.joinedAt}</p>
          </div>
          {activeTab === "基本情報" && (
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${saved ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saved && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              {saved ? "保存しました" : "保存する"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-6" role="tablist">
        {TABS.map((tab) => {
          const counts: Partial<Record<Tab, number>> = {
            "研修記録": memberTrainings.length,
            "OJT記録": memberOjts.length,
            "日報": memberReports.length,
            "面談記録": memberMeetings.length,
          };
          const count = counts[tab];
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"}`}
            >
              {tab}
              {count != null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* 基本情報 */}
        {activeTab === "基本情報" && (
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>氏名 <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>職種 <span className="text-red-500">*</span></label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>部署</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>入社日</label>
                <input type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>メンター</label>
                <div className="relative">
                  <select value={mentor} onChange={(e) => setMentor(e.target.value)} className={selectCls}>
                    <option value="">未設定</option>
                    {interviewers.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <SelectArrow />
                </div>
              </div>
              <div>
                <label className={labelCls}>OJT担当</label>
                <div className="relative">
                  <select value={ojtOwner} onChange={(e) => setOjtOwner(e.target.value)} className={selectCls}>
                    <option value="">未設定</option>
                    {interviewers.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <SelectArrow />
                </div>
              </div>
            </div>
            <div className="w-48">
              <label className={labelCls}>研修ステータス</label>
              <div className="relative">
                <select value={onboardingStatus} onChange={(e) => setOnboardingStatus(e.target.value as OnboardingStatus)} className={selectCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>メモ</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} placeholder="入社者に関するメモを入力" className={textareaCls} />
            </div>
          </div>
        )}

        {/* 研修記録 */}
        {activeTab === "研修記録" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">研修記録 <span className="ml-1 text-xs font-normal text-slate-400">({memberTrainings.length}件)</span></p>
              <button onClick={() => setShowTForm((v) => !v)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700">
                {showTForm ? "キャンセル" : "+ 記録を追加"}
              </button>
            </div>
            {showTForm && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">新しい研修記録</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>研修名 <span className="text-red-500">*</span></label><input type="text" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="会社概要研修" className={inputCls} /></div>
                    <div><label className={labelCls}>実施日</label><input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>担当者</label><input type="text" value={tTrainer} onChange={(e) => setTTrainer(e.target.value)} placeholder="田中部長" className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>理解度 (1〜5)</label>
                      <div className="relative"><select value={tLevel} onChange={(e) => setTLevel(Number(e.target.value) as 1|2|3|4|5)} className={selectCls}>{([1,2,3,4,5] as const).map((n) => <option key={n} value={n}>{n}</option>)}</select><SelectArrow /></div>
                    </div>
                  </div>
                  <div><label className={labelCls}>実施内容</label><textarea value={tContent} onChange={(e) => setTContent(e.target.value)} rows={2} className={textareaCls} /></div>
                  <div><label className={labelCls}>成果物URL</label><input type="url" value={tUrl} onChange={(e) => setTUrl(e.target.value)} placeholder="https://..." className={inputCls} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>良かった点</label><textarea value={tGood} onChange={(e) => setTGood(e.target.value)} rows={2} className={textareaCls} /></div>
                    <div><label className={labelCls}>課題点</label><textarea value={tIssue} onChange={(e) => setTIssue(e.target.value)} rows={2} className={textareaCls} /></div>
                  </div>
                  <div><label className={labelCls}>次のアクション</label><input type="text" value={tNext} onChange={(e) => setTNext(e.target.value)} className={inputCls} /></div>
                  <button onClick={handleAddTraining} disabled={!tName.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">追加する</button>
                </div>
              </div>
            )}
            {memberTrainings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm text-slate-400">研修記録がまだありません。</p></div>
            ) : (
              <div className="space-y-2">
                {memberTrainings.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setEditingTraining(r)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{r.trainingName}</p>
                        <p className="mt-0.5 text-sm text-slate-400">{r.trainedAt}{r.trainer ? ` · 担当: ${r.trainer}` : ""}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">理解度 {r.understandingLevel}/5</span>
                        <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                    {r.content && <p className="mt-2 line-clamp-1 text-sm text-slate-500">{r.content}</p>}
                  </button>
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
              <button onClick={() => setShowOForm((v) => !v)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700">
                {showOForm ? "キャンセル" : "+ 記録を追加"}
              </button>
            </div>
            {showOForm && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">新しいOJT記録</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>プロジェクト名 <span className="text-red-500">*</span></label><input type="text" value={oProject} onChange={(e) => setOProject(e.target.value)} placeholder="採用管理システム" className={inputCls} /></div>
                    <div><label className={labelCls}>記録日</label><input type="date" value={oDate} onChange={(e) => setODate(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>担当タスク <span className="text-red-500">*</span></label><input type="text" value={oTask} onChange={(e) => setOTask(e.target.value)} placeholder="UI改善の実装" className={inputCls} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={labelCls}>難易度</label><div className="relative"><select value={oDiff} onChange={(e) => setODiff(e.target.value as OjtDifficulty)} className={selectCls}>{OJT_DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select><SelectArrow /></div></div>
                    <div><label className={labelCls}>進捗</label><div className="relative"><select value={oProg} onChange={(e) => setOProg(e.target.value as OjtProgress)} className={selectCls}>{OJT_PROGRESS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select><SelectArrow /></div></div>
                    <div><label className={labelCls}>レビュー担当</label><input type="text" value={oReviewer} onChange={(e) => setOReviewer(e.target.value)} placeholder="田中部長" className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>詰まっているポイント</label><textarea value={oBlocker} onChange={(e) => setOBlocker(e.target.value)} rows={2} className={textareaCls} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>フィードバック内容</label><textarea value={oFeedback} onChange={(e) => setOFeedback(e.target.value)} rows={2} className={textareaCls} /></div>
                    <div><label className={labelCls}>担当者評価</label><textarea value={oComment} onChange={(e) => setOComment(e.target.value)} rows={2} className={textareaCls} /></div>
                  </div>
                  <div><label className={labelCls}>本人の理解度 (1〜5)</label><div className="relative w-32"><select value={oSelf} onChange={(e) => setOSelf(Number(e.target.value) as 1|2|3|4|5)} className={selectCls}>{([1,2,3,4,5] as const).map((n) => <option key={n} value={n}>{n}</option>)}</select><SelectArrow /></div></div>
                  <button onClick={handleAddOjt} disabled={!oProject.trim() || !oTask.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">追加する</button>
                </div>
              </div>
            )}
            {memberOjts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm text-slate-400">OJT記録がまだありません。</p></div>
            ) : (
              <div className="space-y-2">
                {memberOjts.map((r) => {
                  const progCls: Record<OjtProgress, string> = { 未着手: "bg-slate-100 text-slate-600", 作業中: "bg-blue-100 text-blue-700", レビュー中: "bg-amber-100 text-amber-700", 完了: "bg-emerald-100 text-emerald-700" };
                  return (
                    <button
                      key={r.id}
                      onClick={() => setEditingOjt(r)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{r.taskName}</p>
                          <p className="mt-0.5 text-sm text-slate-400">{r.recordedAt} · {r.projectName}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${progCls[r.progress]}`}>{r.progress}</span>
                          <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                      {r.blocker && <p className="mt-2 line-clamp-1 text-sm text-red-500">詰まり: {r.blocker}</p>}
                    </button>
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
              <button onClick={() => setShowRForm((v) => !v)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700">
                {showRForm ? "キャンセル" : "+ 日報を追加"}
              </button>
            </div>
            {showRForm && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">日報入力</p>
                <div className="space-y-3">
                  <div><label className={labelCls}>日付</label><input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
                  <div><label className={labelCls}>今日やったこと <span className="text-red-500">*</span></label><textarea value={rDid} onChange={(e) => setRDid(e.target.value)} rows={3} placeholder="今日の業務内容を記入" className={textareaCls} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>学んだこと</label><textarea value={rLearned} onChange={(e) => setRLearned(e.target.value)} rows={2} className={textareaCls} /></div>
                    <div><label className={labelCls}>詰まったこと</label><textarea value={rBlocked} onChange={(e) => setRBlocked(e.target.value)} rows={2} className={textareaCls} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>明日やること</label><textarea value={rNext} onChange={(e) => setRNext(e.target.value)} rows={2} className={textareaCls} /></div>
                    <div><label className={labelCls}>相談したいこと</label><textarea value={rConsult} onChange={(e) => setRConsult(e.target.value)} rows={2} className={textareaCls} /></div>
                  </div>
                  <button onClick={handleAddReport} disabled={!rDid.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">追加する</button>
                </div>
              </div>
            )}
            {memberReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm text-slate-400">日報がまだありません。</p></div>
            ) : (
              <div className="space-y-2">
                {memberReports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setEditingReport(r)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{r.reportedAt}</p>
                      {r.consultation && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">相談あり</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.didToday}</p>
                  </button>
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
              <button onClick={() => setShowMForm((v) => !v)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700">
                {showMForm ? "キャンセル" : "+ 記録を追加"}
              </button>
            </div>
            {showMForm && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">新しい面談記録</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>面談日</label><input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>メンター <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={mMentor} onChange={(e) => setMMentor(e.target.value)} className={selectCls}>
                          <option value="">未設定</option>
                          {interviewers.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <SelectArrow />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>業務面の状態</label><div className="relative"><select value={mWorkCond} onChange={(e) => setMWorkCond(e.target.value as MemberCondition)} className={selectCls}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select><SelectArrow /></div></div>
                    <div><label className={labelCls}>メンタル面の状態</label><div className="relative"><select value={mMentalCond} onChange={(e) => setMMentalCond(e.target.value as MemberCondition)} className={selectCls}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select><SelectArrow /></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>相談内容</label><textarea value={mConsult} onChange={(e) => setMConsult(e.target.value)} rows={3} className={textareaCls} /></div>
                    <div><label className={labelCls}>メンターコメント</label><textarea value={mComment} onChange={(e) => setMComment(e.target.value)} rows={3} className={textareaCls} /></div>
                  </div>
                  <div><label className={labelCls}>次のアクション</label><input type="text" value={mNext} onChange={(e) => setMNext(e.target.value)} placeholder="来週フォローアップ面談を設定" className={inputCls} /></div>
                  <div>
                    <label className={labelCls}>上長共有</label>
                    <div className="flex gap-3">
                      {SHARE_OPTIONS.map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                          <input type="radio" name="share" value={s} checked={mShare === s} onChange={() => setMShare(s)} className="accent-blue-600" />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddMeeting} disabled={!mMentor.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">追加する</button>
                </div>
              </div>
            )}
            {memberMeetings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm text-slate-400">面談記録がまだありません。</p></div>
            ) : (
              <div className="space-y-2">
                {memberMeetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setEditingMeeting(m)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{m.meetingAt}</p>
                        <p className="mt-0.5 text-sm text-slate-400">メンター: {m.mentor}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${CONDITION_BADGE[m.workCondition]}`}>{m.workCondition}</span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${RISK_BADGE[m.risk]}`}>リスク: {m.risk}</span>
                        {m.shareWithManager === "必要" && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">上長共有</span>}
                        <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                    {m.consultation && <p className="mt-2 line-clamp-1 text-sm text-slate-500">相談: {m.consultation}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editingTraining && (
        <TrainingModal
          record={editingTraining}
          onClose={() => setEditingTraining(null)}
          onSave={(r) => { updateTrainingRecord(r); setEditingTraining(null); }}
          onDelete={(id) => { deleteTrainingRecord(id); setEditingTraining(null); }}
        />
      )}
      {editingOjt && (
        <OjtModal
          record={editingOjt}
          onClose={() => setEditingOjt(null)}
          onSave={(r) => { updateOjtRecord(r); setEditingOjt(null); }}
          onDelete={(id) => { deleteOjtRecord(id); setEditingOjt(null); }}
        />
      )}
      {editingReport && (
        <ReportModal
          record={editingReport}
          onClose={() => setEditingReport(null)}
          onSave={(r) => { updateDailyReport(r); setEditingReport(null); }}
          onDelete={(id) => { deleteDailyReport(id); setEditingReport(null); }}
        />
      )}
      {editingMeeting && (
        <MeetingModal
          record={editingMeeting}
          interviewers={interviewers}
          onClose={() => setEditingMeeting(null)}
          onSave={(m) => { updateMentorMeeting(m); setEditingMeeting(null); }}
          onDelete={(id) => { deleteMentorMeeting(id); setEditingMeeting(null); }}
        />
      )}
    </div>
  );
}

// ---------- Edit Modals ----------

function TrainingModal({ record, onClose, onSave, onDelete }: {
  record: TrainingRecord;
  onClose: () => void;
  onSave: (r: TrainingRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(record.trainingName);
  const [date, setDate] = useState(record.trainedAt);
  const [trainer, setTrainer] = useState(record.trainer);
  const [content, setContent] = useState(record.content);
  const [level, setLevel] = useState<1|2|3|4|5>(record.understandingLevel);
  const [url, setUrl] = useState(record.deliverableUrl);
  const [good, setGood] = useState(record.goodPoint);
  const [issue, setIssue] = useState(record.issuePoint);
  const [next, setNext] = useState(record.nextAction);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
  const selectCls = "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
  const labelCls = "mb-1 block text-xs font-medium text-slate-500";
  const textareaCls = `${inputCls} resize-none`;

  return (
    <Modal title="研修記録の編集" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>研修名</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>実施日</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>担当者</label><input type="text" value={trainer} onChange={(e) => setTrainer(e.target.value)} className={inputCls} /></div>
          <div>
            <label className={labelCls}>理解度 (1〜5)</label>
            <div className="relative"><select value={level} onChange={(e) => setLevel(Number(e.target.value) as 1|2|3|4|5)} className={selectCls}>{([1,2,3,4,5] as const).map((n) => <option key={n} value={n}>{n}</option>)}</select><SelectArrow /></div>
          </div>
        </div>
        <div><label className={labelCls}>実施内容</label><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className={textareaCls} /></div>
        <div><label className={labelCls}>成果物URL</label><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>良かった点</label><textarea value={good} onChange={(e) => setGood(e.target.value)} rows={3} className={textareaCls} /></div>
          <div><label className={labelCls}>課題点</label><textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} className={textareaCls} /></div>
        </div>
        <div><label className={labelCls}>次のアクション</label><input type="text" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} /></div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => { if (window.confirm("削除しますか？")) onDelete(record.id); }} className="text-sm font-medium text-red-500 hover:text-red-700">削除する</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">キャンセル</button>
            <button onClick={() => onSave({ ...record, trainingName: name, trainedAt: date, trainer, content, understandingLevel: level, deliverableUrl: url, goodPoint: good, issuePoint: issue, nextAction: next })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">保存する</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function OjtModal({ record, onClose, onSave, onDelete }: {
  record: OjtRecord;
  onClose: () => void;
  onSave: (r: OjtRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [project, setProject] = useState(record.projectName);
  const [task, setTask] = useState(record.taskName);
  const [date, setDate] = useState(record.recordedAt);
  const [diff, setDiff] = useState<OjtDifficulty>(record.difficulty);
  const [prog, setProg] = useState<OjtProgress>(record.progress);
  const [reviewer, setReviewer] = useState(record.reviewer);
  const [blocker, setBlocker] = useState(record.blocker);
  const [feedback, setFeedback] = useState(record.feedback);
  const [self, setSelf] = useState<1|2|3|4|5>(record.selfUnderstandingLevel);
  const [comment, setComment] = useState(record.reviewerComment);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
  const selectCls = "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
  const labelCls = "mb-1 block text-xs font-medium text-slate-500";
  const textareaCls = `${inputCls} resize-none`;

  return (
    <Modal title="OJT記録の編集" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>プロジェクト名</label><input type="text" value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>記録日</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>担当タスク</label><input type="text" value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>難易度</label><div className="relative"><select value={diff} onChange={(e) => setDiff(e.target.value as OjtDifficulty)} className={selectCls}>{(["低","中","高"] as OjtDifficulty[]).map((d) => <option key={d} value={d}>{d}</option>)}</select><SelectArrow /></div></div>
          <div><label className={labelCls}>進捗</label><div className="relative"><select value={prog} onChange={(e) => setProg(e.target.value as OjtProgress)} className={selectCls}>{(["未着手","作業中","レビュー中","完了"] as OjtProgress[]).map((p) => <option key={p} value={p}>{p}</option>)}</select><SelectArrow /></div></div>
          <div><label className={labelCls}>レビュー担当</label><input type="text" value={reviewer} onChange={(e) => setReviewer(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>詰まっているポイント</label><textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} className={textareaCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>フィードバック</label><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} className={textareaCls} /></div>
          <div><label className={labelCls}>担当者評価</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={textareaCls} /></div>
        </div>
        <div><label className={labelCls}>本人の理解度 (1〜5)</label><div className="relative w-32"><select value={self} onChange={(e) => setSelf(Number(e.target.value) as 1|2|3|4|5)} className={selectCls}>{([1,2,3,4,5] as const).map((n) => <option key={n} value={n}>{n}</option>)}</select><SelectArrow /></div></div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => { if (window.confirm("削除しますか？")) onDelete(record.id); }} className="text-sm font-medium text-red-500 hover:text-red-700">削除する</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">キャンセル</button>
            <button onClick={() => onSave({ ...record, projectName: project, taskName: task, recordedAt: date, difficulty: diff, progress: prog, reviewer, blocker, feedback, selfUnderstandingLevel: self, reviewerComment: comment })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">保存する</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReportModal({ record, onClose, onSave, onDelete }: {
  record: DailyReport;
  onClose: () => void;
  onSave: (r: DailyReport) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState(record.reportedAt);
  const [did, setDid] = useState(record.didToday);
  const [learned, setLearned] = useState(record.learned);
  const [blocked, setBlocked] = useState(record.blocked);
  const [next, setNext] = useState(record.nextPlan);
  const [consult, setConsult] = useState(record.consultation);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
  const labelCls = "mb-1 block text-xs font-medium text-slate-500";
  const textareaCls = `${inputCls} resize-none`;

  return (
    <Modal title="日報の編集" onClose={onClose}>
      <div className="space-y-3">
        <div><label className={labelCls}>日付</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
        <div><label className={labelCls}>今日やったこと</label><textarea value={did} onChange={(e) => setDid(e.target.value)} rows={4} className={textareaCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>学んだこと</label><textarea value={learned} onChange={(e) => setLearned(e.target.value)} rows={3} className={textareaCls} /></div>
          <div><label className={labelCls}>詰まったこと</label><textarea value={blocked} onChange={(e) => setBlocked(e.target.value)} rows={3} className={textareaCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>明日やること</label><textarea value={next} onChange={(e) => setNext(e.target.value)} rows={3} className={textareaCls} /></div>
          <div><label className={labelCls}>相談したいこと</label><textarea value={consult} onChange={(e) => setConsult(e.target.value)} rows={3} className={textareaCls} /></div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => { if (window.confirm("削除しますか？")) onDelete(record.id); }} className="text-sm font-medium text-red-500 hover:text-red-700">削除する</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">キャンセル</button>
            <button onClick={() => onSave({ ...record, reportedAt: date, didToday: did, learned, blocked, nextPlan: next, consultation: consult })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">保存する</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function MeetingModal({ record, interviewers, onClose, onSave, onDelete }: {
  record: MentorMeeting;
  interviewers: string[];
  onClose: () => void;
  onSave: (m: MentorMeeting) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState(record.meetingAt);
  const [mentor, setMentor] = useState(record.mentor);
  const [workCond, setWorkCond] = useState<MemberCondition>(record.workCondition);
  const [mentalCond, setMentalCond] = useState<MemberCondition>(record.mentalCondition);
  const [consult, setConsult] = useState(record.consultation);
  const [comment, setComment] = useState(record.mentorComment);
  const [nextAction, setNextAction] = useState(record.nextAction);
  const [share, setShare] = useState<ShareWithManager>(record.shareWithManager);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
  const selectCls = "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
  const labelCls = "mb-1 block text-xs font-medium text-slate-500";
  const textareaCls = `${inputCls} resize-none`;

  function handleSave() {
    const derivedRisk: RetentionRisk =
      workCond === "要対応" || mentalCond === "要対応" ? "高"
      : workCond === "不安あり" || mentalCond === "不安あり" ? "中"
      : "低";
    onSave({ ...record, meetingAt: date, mentor, workCondition: workCond, mentalCondition: mentalCond, consultation: consult, mentorComment: comment, nextAction, shareWithManager: share, risk: derivedRisk });
  }

  return (
    <Modal title="面談記録の編集" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>面談日</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          <div>
            <label className={labelCls}>メンター</label>
            <div className="relative">
              <select value={mentor} onChange={(e) => setMentor(e.target.value)} className={selectCls}>
                <option value="">未設定</option>
                {interviewers.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <SelectArrow />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>業務面の状態</label><div className="relative"><select value={workCond} onChange={(e) => setWorkCond(e.target.value as MemberCondition)} className={selectCls}>{(["良好","普通","不安あり","要対応"] as MemberCondition[]).map((c) => <option key={c} value={c}>{c}</option>)}</select><SelectArrow /></div></div>
          <div><label className={labelCls}>メンタル面の状態</label><div className="relative"><select value={mentalCond} onChange={(e) => setMentalCond(e.target.value as MemberCondition)} className={selectCls}>{(["良好","普通","不安あり","要対応"] as MemberCondition[]).map((c) => <option key={c} value={c}>{c}</option>)}</select><SelectArrow /></div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>相談内容</label><textarea value={consult} onChange={(e) => setConsult(e.target.value)} rows={3} className={textareaCls} /></div>
          <div><label className={labelCls}>メンターコメント</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={textareaCls} /></div>
        </div>
        <div><label className={labelCls}>次のアクション</label><input type="text" value={nextAction} onChange={(e) => setNextAction(e.target.value)} className={inputCls} /></div>
        <div>
          <label className={labelCls}>上長共有</label>
          <div className="flex gap-3">
            {(["不要","必要"] as ShareWithManager[]).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                <input type="radio" value={s} checked={share === s} onChange={() => setShare(s)} className="accent-blue-600" />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => { if (window.confirm("削除しますか？")) onDelete(record.id); }} className="text-sm font-medium text-red-500 hover:text-red-700">削除する</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">キャンセル</button>
            <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">保存する</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
