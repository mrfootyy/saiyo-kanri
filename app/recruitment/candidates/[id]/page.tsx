"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRecruitment } from "../../context";
import {
  Candidate,
  CandidateStatus,
  DocumentFile,
  InterviewRecord,
  InterviewResult,
  SlackChannelConfig,
  SlackNotification,
} from "../../types";
import { INTERVIEWER_OPTIONS, INTERVIEW_FORMAT_OPTIONS } from "../../constants";
import { ExtractedInfo, extractFromFile, isExtractError } from "../../extractFromFile";
import { deriveCandidateStatusFromFlow, getStageIndexForStatus, getStatusForStageName, isTerminalStatus } from "../../statusUtils";
import StatusBadge from "../../components/StatusBadge";
import DocumentUpload from "../../components/DocumentUpload";
import StepFlowBar from "../../components/StepFlowBar";
import PositionSelect from "../../components/PositionSelect";

const STATUS_OPTIONS: CandidateStatus[] = ["応募受付", "内定", "不採用", "辞退"];

const RESULT_OPTIONS: InterviewResult[] = ["通過", "保留", "不採用"];

const RESULT_COLORS: Record<InterviewResult, string> = {
  通過: "bg-blue-100 text-blue-700",
  保留: "bg-blue-50 text-blue-700",
  不採用: "bg-slate-100 text-slate-700",
};

type Tab = "基本情報" | "書類" | "評価" | "質問" | "履歴";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { candidates, updateCandidate, slackNotifications, addSlackNotifications, emailHistories, interviewStages, interviewers: interviewerOptions, interviewQuestions, slackChannelConfig } =
    useRecruitment();

  const candidate = candidates.find((c) => c.id === params.id);

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
        <p className="text-sm">応募者が見つかりません。</p>
        <Link href="/recruitment/candidates" className="mt-3 text-xs text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
    );
  }

  return <CandidateDetail candidate={candidate} allSlack={slackNotifications} allEmail={emailHistories.filter((e) => e.candidateId === candidate.id)} interviewStages={interviewStages} interviewerOptions={interviewerOptions} slackChannelConfig={slackChannelConfig} onUpdate={updateCandidate} onAddSlack={addSlackNotifications} interviewQuestions={interviewQuestions} />;
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const labelCls = "mb-1 block text-xs font-medium text-slate-500";

function SelectArrow() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function CandidateDetail({
  candidate,
  allSlack,
  allEmail,
  interviewStages,
  interviewerOptions,
  slackChannelConfig,
  onUpdate,
  onAddSlack,
  interviewQuestions,
}: {
  candidate: Candidate;
  allSlack: SlackNotification[];
  allEmail: ReturnType<typeof Array.prototype.filter>;
  interviewStages: import("../../types").InterviewStage[];
  interviewerOptions: string[];
  slackChannelConfig: SlackChannelConfig;
  onUpdate: (c: Candidate) => void;
  onAddSlack: (n: SlackNotification[]) => void;
  interviewQuestions: import("../../types").InterviewQuestion[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(candidate.name);
  const [nameKana, setNameKana] = useState(candidate.nameKana ?? "");
  const [position, setPosition] = useState(candidate.position);
  const [email, setEmail] = useState(candidate.email);
  const [phone, setPhone] = useState(candidate.phone);
  const [age, setAge] = useState(candidate.age);
  const [skills, setSkills] = useState<string[]>(candidate.skills ?? []);
  const [companies, setCompanies] = useState<{ name: string; years: string }[]>(candidate.companies ?? []);
  const [status, setStatus] = useState<CandidateStatus>(candidate.status);
  const [interviewers, setInterviewers] = useState<string[]>(candidate.interviewers);
  const [memo, setMemo] = useState(candidate.memo);
  const [tags, setTags] = useState<string[]>(candidate.tags ?? []);
  const [source, setSource] = useState(candidate.source ?? "");
  const [assignedQuestions, setAssignedQuestions] = useState<string[]>(candidate.assignedQuestions ?? []);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [questionStageFilter, setQuestionStageFilter] = useState("すべて");
  const [candidateQuestionStageFilter, setCandidateQuestionStageFilter] = useState("すべて");
  const [questionSearch, setQuestionSearch] = useState("");

  const [resumeFile, setResumeFile] = useState<DocumentFile | undefined>(candidate.resumeFile);
  const [cvFile, setCvFile] = useState<DocumentFile | undefined>(candidate.cvFile);
  const [portfolioUrl, setPortfolioUrl] = useState(candidate.portfolioUrl ?? "");
  const [portfolioFile, setPortfolioFile] = useState<DocumentFile | undefined>(candidate.portfolioFile);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInfo | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const records = candidate.interviewRecords;
  const candidateSlacks = allSlack.filter((s) => s.candidateId === candidate.id);

  function getToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function buildCandidateUpdate(overrides: Partial<Candidate> = {}): Candidate {
    return {
      ...candidate,
      name,
      nameKana,
      position,
      email,
      phone,
      age,
      status: syncedStatus,
      interviewers,
      memo,
      updatedAt: getToday(),
      resumeFile,
      cvFile,
      portfolioUrl: portfolioUrl.trim() || undefined,
      portfolioFile,
      skills,
      companies,
      interviewRecords: records,
      tags: tags.length ? tags : undefined,
      source: source.trim() || undefined,
      assignedQuestions: assignedQuestions.length ? assignedQuestions : undefined,
      ...overrides,
    };
  }

  async function readDocument(
    file: DocumentFile | undefined,
    onFileChange: (file: DocumentFile | undefined) => void,
    documentPatch: Partial<Candidate>
  ) {
    onFileChange(file);
    onUpdate(buildCandidateUpdate(documentPatch));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setExtracted(null);
    setExtractError(null);
    if (!file) return;
    setExtracting(true);
    const result = await extractFromFile(file.dataUrl, file.type);
    setExtracting(false);
    if (isExtractError(result)) {
      setExtractError(result.message);
    } else {
      const extractedPatch = applyExtractedToForm(result);
      setExtracted(result);
      onUpdate(buildCandidateUpdate({ ...documentPatch, ...extractedPatch }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleResumeUpload(file: DocumentFile | undefined) {
    await readDocument(file, setResumeFile, { resumeFile: file });
  }

  async function handleCvUpload(file: DocumentFile | undefined) {
    await readDocument(file, setCvFile, { cvFile: file });
  }

  function applyExtractedToForm(info: ExtractedInfo): Partial<Candidate> {
    const nextSkills = info.skills?.length ? [...new Set([...skills, ...info.skills])] : skills;
    const incomingCompanies: { name: string; years: string }[] = info.companies?.map((c) =>
      typeof c === "string" ? { name: c, years: "" } : c
    ) ?? [];
    const existingNames = new Set(companies.map((c) => c.name));
    const nextCompanies = [
      ...companies,
      ...incomingCompanies.filter((c) => !existingNames.has(c.name)),
    ];
    const nextEmail = info.email ?? email;
    const nextPhone = info.phone ?? phone;
    const nextAge = info.age ?? age;

    if (info.email) setEmail(info.email);
    if (info.phone) setPhone(info.phone);
    if (info.age) setAge(info.age);
    if (info.skills?.length) setSkills(nextSkills);
    if (incomingCompanies.length) setCompanies(nextCompanies);

    return {
      email: nextEmail,
      phone: nextPhone,
      age: nextAge,
      skills: nextSkills,
      companies: nextCompanies,
    };
  }

  function applyExtracted() {
    if (!extracted) return;
    onUpdate(buildCandidateUpdate(applyExtractedToForm(extracted)));
    setExtracted(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setActiveTab("基本情報");
  }

  function handleSave() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = timestamp.slice(0, 10);
    const syncedStatus = deriveCandidateStatusFromFlow(records, interviewStages, status);

    const newNotifications: SlackNotification[] = [];

    if (syncedStatus !== candidate.status) {
      newNotifications.push({
        id: `s_${Date.now()}_status`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        sentAt: timestamp,
        channel: slackChannelConfig.statusChange,
        message: `${candidate.name}さんのステータスが「${candidate.status}」から「${syncedStatus}」に更新されました。`,
      });
    }

    if (newNotifications.length > 0) onAddSlack(newNotifications);

    onUpdate(buildCandidateUpdate({ updatedAt: today }));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const hasExtracted = extracted && (
    extracted.email ||
    extracted.phone ||
    extracted.age ||
    extracted.skills?.length ||
    extracted.companies?.length
  );
  const syncedStatus = deriveCandidateStatusFromFlow(records, interviewStages, status);
  const questionById = new Map(interviewQuestions.map((q) => [q.id, q]));
  const assignedQuestionItems = assignedQuestions
    .map((id) => questionById.get(id))
    .filter((q): q is import("../../types").InterviewQuestion => Boolean(q));
  const flowStageNames = new Set(interviewStages.map((stage) => stage.name));
  const requiredQuestionItems = interviewQuestions.filter((q) => q.required && flowStageNames.has(q.stage));
  const candidateQuestionItems = [
    ...requiredQuestionItems,
    ...assignedQuestionItems.filter((q) => !requiredQuestionItems.some((required) => required.id === q.id)),
  ];
  const candidateQuestionStages = ["すべて", ...Array.from(new Set(candidateQuestionItems.map((q) => q.stage)))];
  const visibleCandidateQuestionItems = candidateQuestionItems.filter((q) =>
    candidateQuestionStageFilter === "すべて" || q.stage === candidateQuestionStageFilter
  );
  const questionStages = ["すべて", ...Array.from(new Set(interviewQuestions.map((q) => q.stage)))];
  const filteredQuestions = interviewQuestions.filter((q) => {
    const matchesStage = questionStageFilter === "すべて" || q.stage === questionStageFilter;
    const query = questionSearch.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      q.text.toLowerCase().includes(query) ||
      q.tags.some((tag) => tag.toLowerCase().includes(query));
    return matchesStage && matchesSearch;
  });

  const tabs: Tab[] = ["基本情報", "書類", "評価", "質問", "履歴"];
  const sortedStages = [...interviewStages].sort((a, b) => a.order - b.order);
  const currentStageIndex = getStageIndexForStatus(syncedStatus, sortedStages);
  const currentStage = currentStageIndex >= 0 ? sortedStages[currentStageIndex] : null;
  const showInterviewModeButton =
    currentStage &&
    !isTerminalStatus(syncedStatus) &&
    getStatusForStageName(currentStage.name) !== "書類選考";

  return (
    <div className="flex flex-col">
      {/* ページヘッダー */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href="/recruitment/candidates"
          className="mb-3 flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
          応募者一覧
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{candidate.name}</h1>
              <StatusBadge status={syncedStatus} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{candidate.position} · 応募日: {candidate.appliedAt}</p>
          </div>
          <div className="flex items-center gap-2">
            {showInterviewModeButton && (
              <Link
                href={`/recruitment/candidates/${candidate.id}/stages/${currentStage.id}/interview`}
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                面接モード
              </Link>
            )}
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
                saved ? "bg-slate-800 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
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
      </div>

      {/* 選考フロー */}
      <StepFlowBar stages={interviewStages} records={records} manualStatus={syncedStatus} candidateId={candidate.id} />

      {/* タブ */}
      <div className="flex overflow-x-auto border-b border-slate-100 bg-white px-4 sm:px-6" role="tablist" aria-label="候補者情報タブ">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`mr-4 flex-shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-[-2px] ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab}
            {tab === "書類" && extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" aria-hidden="true" />
            )}
            {tab === "書類" && hasExtracted && !extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            )}
            {tab === "書類" && extractError && !extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="p-4 sm:p-6">
        {/* ── 基本情報 ── */}
        {activeTab === "基本情報" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>氏名</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                <input
                  type="text"
                  value={nameKana}
                  onChange={(e) => setNameKana(e.target.value)}
                  placeholder="ふりがな"
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>年齢</label>
                <div className="relative">
                  <input
                    type="number"
                    min="15"
                    max="80"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="28"
                    className={inputCls}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">歳</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>電話番号</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-0000-0000" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PositionSelect
                value={position}
                onChange={setPosition}
                selectClassName={selectCls}
                inputClassName={inputCls}
                labelClassName={labelCls}
              />
              <div>
                <label className={labelCls}>ステータス</label>
                <div className="relative">
                  <select value={status} onChange={(e) => setStatus(e.target.value as CandidateStatus)} className={selectCls}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <SelectArrow />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>スキル</label>
                <input
                  type="text"
                  value={skills.join(", ")}
                  onChange={(e) => setSkills(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                  placeholder="React, TypeScript, Figma"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={labelCls}>経験企業・在籍期間</label>
                <button
                  type="button"
                  onClick={() => setCompanies((prev) => [...prev, { name: "", years: "" }])}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  追加
                </button>
              </div>
              {companies.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">企業が登録されていません。</p>
              ) : (
                <div className="space-y-2">
                  {companies.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => setCompanies((prev) => prev.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item))}
                        placeholder="株式会社サンプル"
                        className={`flex-1 ${inputCls}`}
                      />
                      <div className="w-36 flex-shrink-0">
                        <input
                          type="text"
                          value={c.years}
                          onChange={(e) => setCompanies((prev) => prev.map((item, idx) => idx === i ? { ...item, years: e.target.value } : item))}
                          placeholder="例：2年6ヶ月"
                          aria-label={`${c.name || "企業"}の在籍期間`}
                          className={inputCls}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompanies((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="この企業を削除"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>メモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="メモを入力"
                className={`resize-none ${inputCls}`}
              />
            </div>

            <div>
              <label className={labelCls}>応募ソース</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Indeed、Wantedly、エージェントなど" className={inputCls} />
            </div>
          </div>
        )}

        {/* ── 書類 ── */}
        {activeTab === "書類" && (
          <div className="space-y-6">
            <DocumentUpload
              label="履歴書（アップロード後にメール・電話・年齢を自動読み取り）"
              file={resumeFile}
              onChange={handleResumeUpload}
            />

            <div className="space-y-2">
              <DocumentUpload
                label="職務経歴書（アップロード後にスキル・企業・在籍期間を自動読み取り）"
                file={cvFile}
                onChange={handleCvUpload}
              />
              {extracting && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AIで解析中...
                </div>
              )}
              {!extracting && extractError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {extractError}
                </div>
              )}
              {!extracting && extracted && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs">
                  <p className="mb-2 font-semibold text-blue-800">読み取り結果（基本情報に自動反映済み）</p>
                  {hasExtracted ? (
                    <>
                      <div className="space-y-1 text-blue-700">
                        {extracted.email && <p>メールアドレス: <span className="font-medium">{extracted.email}</span></p>}
                        {extracted.phone && <p>電話番号: <span className="font-medium">{extracted.phone}</span></p>}
                        {extracted.age && <p>年齢: <span className="font-medium">{extracted.age}歳</span></p>}
                        {!!extracted.skills?.length && <p>スキル: <span className="font-medium">{extracted.skills.join(", ")}</span></p>}
                        {!!extracted.companies?.length && (
                          <p>経験企業: <span className="font-medium">
                            {extracted.companies.map((c) =>
                              typeof c === "string" ? c : c.years ? `${c.name}（${c.years}）` : c.name
                            ).join(", ")}
                          </span></p>
                        )}
                      </div>
                      <button
                        onClick={applyExtracted}
                        className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      >
                        基本情報を確認する →
                      </button>
                    </>
                  ) : (
                    <p className="text-slate-500">自動読み取りできませんでした。基本情報タブから手動で入力してください。</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">ポートフォリオ</p>
              <div>
                <label className={labelCls}>URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://example.com"
                    className={`flex-1 ${inputCls}`}
                  />
                  {portfolioUrl.trim() && /^https?:\/\//i.test(portfolioUrl.trim()) && (
                    <a
                      href={portfolioUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 whitespace-nowrap transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      開く
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>ファイル（PDF・画像）</label>
                <DocumentUpload label="" file={portfolioFile} onChange={setPortfolioFile} />
              </div>
            </div>
          </div>
        )}

        {/* ── 評価 ── */}
        {activeTab === "評価" && (
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-sm text-slate-400">まだ面接記録がありません。</p>
            ) : (
              records.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{r.stageName}</span>
                      <span className="ml-2 text-xs text-slate-400">{r.date}{r.time ? ` ${r.time}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.result && (
                        <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${RESULT_COLORS[r.result]}`}>{r.result}</span>
                      )}
                    </div>
                  </div>
                  {r.interviewers.length > 0 && (
                    <p className="mb-2 text-xs text-slate-500">面接官: {r.interviewers.join(", ")}</p>
                  )}
                  {r.evaluations && r.evaluations.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">評価項目</th>
                            <th className="w-16 px-3 py-2 text-center font-semibold text-slate-600">評点</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">コメント</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.evaluations.map((ev) => (
                            <tr key={ev.name} className="border-b border-slate-50 last:border-b-0">
                              <td className="px-3 py-2 font-medium text-slate-700">{ev.name}</td>
                              <td className="px-3 py-2 text-center">
                                {ev.grade ? (
                                  <span className={`inline-block rounded px-1.5 py-0.5 font-bold text-white ${
                                    ev.grade === "5" ? "bg-blue-700" :
                                    ev.grade === "4" ? "bg-blue-600" :
                                    ev.grade === "3" ? "bg-blue-500" :
                                    ev.grade === "2" ? "bg-blue-400" : "bg-slate-500"
                                  }`}>{ev.grade}</span>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{ev.episode || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {r.decisionReason && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-600">合否判断の理由：</span>{r.decisionReason}
                    </div>
                  )}
                  {r.notes && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold">メモ：</span>{r.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 質問 ── */}
        {activeTab === "質問" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">この候補者用の質問リスト</p>
                <p className="mt-0.5 text-xs text-slate-500">質問リスト全体から、この候補者の面接で使う質問を選びます。必須質問は自動で表示されます。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionPicker((v) => !v)}
                aria-label={showQuestionPicker ? "選択を閉じる" : "質問を追加する"}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                {showQuestionPicker ? (
                  <>
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">選択を閉じる</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">質問を追加する</span>
                  </>
                )}
              </button>
            </div>

            {interviewQuestions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-400">質問リストに質問がありません。</p>
                <Link href="/recruitment/questions" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800">
                  質問リストで作成する →
                </Link>
              </div>
            )}

            {candidateQuestionItems.length === 0 && interviewQuestions.length > 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium text-slate-500">まだ質問が選択されていません。</p>
                <button
                  type="button"
                  onClick={() => setShowQuestionPicker(true)}
                  className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  質問を追加する
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {candidateQuestionStages.length > 2 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidateQuestionStages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        aria-pressed={candidateQuestionStageFilter === stage}
                        onClick={() => setCandidateQuestionStageFilter(stage)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          candidateQuestionStageFilter === stage
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                )}

                {visibleCandidateQuestionItems.map((q, index) => {
                  const required = requiredQuestionItems.some((item) => item.id === q.id);
                  return (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">Q{index + 1}</span>
                            {required && (
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">必須</span>
                            )}
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">{q.stage}</span>
                            {q.tags.map((t) => <span key={t} className="rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200">{t}</span>)}
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-slate-900">{q.text}</p>
                          {q.modelAnswer && (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{q.modelAnswer}</p>
                          )}
                        </div>
                        {required ? (
                          <span className="flex-shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700">自動表示</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssignedQuestions((prev) => prev.filter((id) => id !== q.id))}
                            className="flex-shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          >
                            外す
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showQuestionPicker && interviewQuestions.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">質問リストから選ぶ</p>
                  <span className="text-xs font-medium text-slate-400">{candidateQuestionItems.length}件表示中（必須含む）</span>
                </div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="search"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="質問文・タグで検索"
                    className={`min-w-0 flex-1 ${inputCls}`}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {questionStages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        aria-pressed={questionStageFilter === stage}
                        onClick={() => setQuestionStageFilter(stage)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${questionStageFilter === stage ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredQuestions.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">条件に一致する質問がありません。</p>
                  ) : filteredQuestions.map((q) => {
                    const assigned = assignedQuestions.includes(q.id);
                    return (
                      <div key={q.id} className={`rounded-xl border p-4 transition-colors ${assigned ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap gap-1">
                              {q.required && <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">必須</span>}
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{q.stage}</span>
                              {q.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{t}</span>)}
                            </div>
                            <p className="text-sm text-slate-800">{q.text}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssignedQuestions((prev) =>
                              assigned ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                            )}
                            disabled={q.required}
                            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                              q.required
                                ? "cursor-default border border-blue-200 bg-blue-50 text-blue-700"
                                : assigned ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {q.required ? "自動表示" : assigned ? "選択中" : "追加"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 履歴 ── */}
        {activeTab === "履歴" && (
          <div className="space-y-5">
            <section aria-labelledby="slack-history-heading">
              <p id="slack-history-heading" className="mb-2 text-xs font-medium text-slate-500">
                Slack通知履歴 <span className="font-normal text-slate-400">({candidateSlacks.length}件)</span>
              </p>
              {candidateSlacks.length === 0 ? (
                <p className="text-xs text-slate-400">通知履歴がありません。</p>
              ) : (
                <div className="space-y-2">
                  {candidateSlacks.map((n) => (
                    <div key={n.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <div className="mb-0.5 flex items-center justify-between text-slate-400">
                        <span>{n.channel}</span><span>{n.sentAt}</span>
                      </div>
                      <p className="text-slate-700">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="email-history-heading">
              <p id="email-history-heading" className="mb-2 text-xs font-medium text-slate-500">
                メール履歴 <span className="font-normal text-slate-400">({allEmail.length}件)</span>
              </p>
              {allEmail.length === 0 ? (
                <p className="text-xs text-slate-400">メール履歴がありません。</p>
              ) : (
                <div className="space-y-2">
                  {allEmail.map((e: any) => (
                    <div key={e.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <div className="mb-0.5 flex items-center justify-between text-slate-400">
                        <span className={`font-medium ${e.direction === "送信" ? "text-blue-600" : "text-slate-600"}`}>
                          {e.direction}
                        </span>
                        <span>{e.sentAt}</span>
                      </div>
                      <p className="font-medium text-slate-700">{e.subject}</p>
                      <p className="mt-0.5 text-slate-500">{e.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
