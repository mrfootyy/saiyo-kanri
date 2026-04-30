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
  InterviewRating,
  InterviewResult,
  SlackNotification,
} from "../../types";
import { INTERVIEWER_OPTIONS, POSITION_OPTIONS, INTERVIEW_FORMAT_OPTIONS } from "../../constants";
import { ExtractedInfo, extractFromFile, isExtractError } from "../../extractFromFile";
import { deriveCandidateStatusFromFlow } from "../../statusUtils";
import StatusBadge from "../../components/StatusBadge";
import DocumentUpload from "../../components/DocumentUpload";
import StepFlowBar from "../../components/StepFlowBar";

const STATUS_OPTIONS: CandidateStatus[] = ["応募受付", "内定", "不採用", "辞退"];

const RESULT_OPTIONS: InterviewResult[] = ["通過", "保留", "不採用"];

const RESULT_COLORS: Record<InterviewResult, string> = {
  通過: "bg-green-100 text-green-700",
  保留: "bg-yellow-100 text-yellow-700",
  不採用: "bg-red-100 text-red-600",
};

type Tab = "基本情報" | "書類" | "評価" | "質問" | "履歴";

function StarRating({
  value,
  onChange,
}: {
  value: InterviewRating | null;
  onChange?: (v: InterviewRating) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {([1, 2, 3, 4, 5] as InterviewRating[]).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none transition-colors ${
            value !== null && n <= value ? "text-yellow-400" : "text-gray-200"
          } ${onChange ? "hover:text-yellow-300 cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { candidates, updateCandidate, slackNotifications, addSlackNotifications, emailHistories, interviewStages, interviewers: interviewerOptions, interviewQuestions } =
    useRecruitment();

  const candidate = candidates.find((c) => c.id === params.id);

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
        <p className="text-sm">応募者が見つかりません。</p>
        <Link href="/recruitment/candidates" className="mt-3 text-xs text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>
    );
  }

  return <CandidateDetail candidate={candidate} allSlack={slackNotifications} allEmail={emailHistories.filter((e) => e.candidateId === candidate.id)} interviewStages={interviewStages} interviewerOptions={interviewerOptions} onUpdate={updateCandidate} onAddSlack={addSlackNotifications} interviewQuestions={interviewQuestions} />;
}

function CandidateDetail({
  candidate,
  allSlack,
  allEmail,
  interviewStages,
  interviewerOptions,
  onUpdate,
  onAddSlack,
  interviewQuestions,
}: {
  candidate: Candidate;
  allSlack: SlackNotification[];
  allEmail: ReturnType<typeof Array.prototype.filter>;
  interviewStages: import("../../types").InterviewStage[];
  interviewerOptions: string[];
  onUpdate: (c: Candidate) => void;
  onAddSlack: (n: SlackNotification[]) => void;
  interviewQuestions: import("../../types").InterviewQuestion[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const [saved, setSaved] = useState(false);

  // 基本情報
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
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState(candidate.source ?? "");
  const [rejectionReason, setRejectionReason] = useState(candidate.rejectionReason ?? "");
  const [assignedQuestions, setAssignedQuestions] = useState<string[]>(candidate.assignedQuestions ?? []);
  const [questionStageFilter, setQuestionStageFilter] = useState("すべて");

  // 書類
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
      rejectionReason: rejectionReason.trim() || undefined,
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
        channel: "#採用チャンネル",
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

  return (
    <div className="flex flex-col h-full">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <Link
          href="/recruitment/candidates"
          className="mb-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          応募者一覧
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              <StatusBadge status={syncedStatus} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{candidate.position} · 応募日: {candidate.appliedAt}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                saved ? "bg-green-500 shadow-green-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
              }`}
            >
              {saved ? "✓ 保存しました" : "保存する"}
            </button>
          </div>
        </div>
      </div>

      {/* 選考フロー */}
      <StepFlowBar stages={interviewStages} records={records} manualStatus={syncedStatus} candidateId={candidate.id} />

      {/* タブ */}
      <div className="flex border-b border-gray-100 bg-white px-6">
        {(["基本情報", "書類", "評価", "質問", "履歴"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mr-5 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {tab}
            {tab === "書類" && extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
            )}
            {tab === "書類" && hasExtracted && !extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            )}
            {tab === "書類" && extractError && !extracting && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
            )}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── 基本情報 ── */}
        {activeTab === "基本情報" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">氏名</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <input type="text" value={nameKana} onChange={(e) => setNameKana(e.target.value)}
                  placeholder="ふりがな"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">年齢</label>
                <div className="relative">
                  <input type="number" min="15" max="80" value={age} onChange={(e) => setAge(e.target.value)}
                    placeholder="28"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">歳</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">電話番号</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="090-0000-0000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">志望職種</label>
                <select value={POSITION_OPTIONS.includes(position as any) ? position : "その他"}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {!POSITION_OPTIONS.includes(position as any) && (
                  <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                    placeholder="職種を入力"
                    className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">ステータス</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as CandidateStatus)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">スキル</label>
                <input
                  type="text"
                  value={skills.join(", ")}
                  onChange={(e) => setSkills(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                  placeholder="React, TypeScript, Figma"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">経験企業・在籍年数</label>
                <button
                  type="button"
                  onClick={() => setCompanies((prev) => [...prev, { name: "", years: "" }])}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  追加
                </button>
              </div>
              {companies.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">企業が登録されていません。</p>
              ) : (
                <div className="space-y-2">
                  {companies.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => setCompanies((prev) => prev.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item))}
                        placeholder="株式会社サンプル"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="relative w-24 flex-shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={c.years}
                          onChange={(e) => setCompanies((prev) => prev.map((item, idx) => idx === i ? { ...item, years: e.target.value } : item))}
                          placeholder="3"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-7 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompanies((prev) => prev.filter((_, idx) => idx !== i))}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">メモ</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
                placeholder="メモを入力"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">応募ソース</label>
                <input type="text" value={source} onChange={(e) => setSource(e.target.value)}
                  placeholder="Indeed、Wantedly、エージェントなど"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">不採用・辞退理由</label>
                <input type="text" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="例：スキル不足、条件不一致、他社内定"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">タグ</label>
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const t = tagInput.trim();
                      if (!tags.includes(t)) setTags((prev) => [...prev, t]);
                      setTagInput("");
                    }
                  }}
                  placeholder="タグを入力してEnter"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <button type="button" onClick={() => {
                  const t = tagInput.trim();
                  if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
                  setTagInput("");
                }} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">追加</button>
              </div>
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {t}
                      <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-blue-400 hover:text-blue-700">×</button>
                    </span>
                  ))}
                </div>
              )}
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
                label="職務経歴書（アップロード後にスキル・企業・経験年数を自動読み取り）"
                file={cvFile}
                onChange={handleCvUpload}
              />
              {extracting && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AIで解析中...
                </div>
              )}
              {!extracting && extractError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {extractError}
                </div>
              )}
              {!extracting && extracted && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs">
                  <p className="font-medium text-green-800 mb-2">読み取り結果（基本情報に自動反映済み）</p>
                  {hasExtracted ? (
                    <>
                      <div className="space-y-1 text-green-700">
                        {extracted.email && <p>メールアドレス: <span className="font-medium">{extracted.email}</span></p>}
                        {extracted.phone && <p>電話番号: <span className="font-medium">{extracted.phone}</span></p>}
                        {extracted.age && <p>年齢: <span className="font-medium">{extracted.age}歳</span></p>}
                        {!!extracted.skills?.length && <p>スキル: <span className="font-medium">{extracted.skills.join(", ")}</span></p>}
                        {!!extracted.companies?.length && (
                          <p>経験企業: <span className="font-medium">
                            {extracted.companies.map((c) =>
                              typeof c === "string" ? c : c.years ? `${c.name}（${c.years}年）` : c.name
                            ).join(", ")}
                          </span></p>
                        )}
                      </div>
                      <button onClick={applyExtracted}
                        className="mt-3 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        基本情報を確認する →
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-500">自動読み取りできませんでした。基本情報タブから手動で入力してください。</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500">ポートフォリオ</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL</label>
                <div className="flex gap-2">
                  <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  {portfolioUrl.trim() && /^https?:\/\//i.test(portfolioUrl.trim()) && (
                    <a href={portfolioUrl.trim()} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 whitespace-nowrap">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      開く
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ファイル（PDF・画像）</label>
                <DocumentUpload label="" file={portfolioFile} onChange={setPortfolioFile} />
              </div>
            </div>
          </div>
        )}

        {/* ── 評価 ── */}
        {activeTab === "評価" && (
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-sm text-gray-400">まだ面接記録がありません。</p>
            ) : (
              records.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-gray-900">{r.stageName}</span>
                      <span className="ml-2 text-xs text-gray-400">{r.date}{r.time ? ` ${r.time}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.result && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          r.result === "通過" ? "bg-green-100 text-green-700" :
                          r.result === "保留" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-600"
                        }`}>{r.result}</span>
                      )}
                      {r.rating && (
                        <span className="text-sm text-yellow-400">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      )}
                    </div>
                  </div>
                  {r.interviewers.length > 0 && (
                    <p className="mb-2 text-xs text-gray-500">面接官: {r.interviewers.join(", ")}</p>
                  )}
                  {r.evaluations && r.evaluations.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">評価項目</th>
                            <th className="w-16 px-3 py-2 text-center font-semibold text-gray-600">評点</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">コメント</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.evaluations.map((ev) => (
                            <tr key={ev.name} className="border-b border-gray-50 last:border-b-0">
                              <td className="px-3 py-2 font-medium text-gray-700">{ev.name}</td>
                              <td className="px-3 py-2 text-center">
                                {ev.grade ? (
                                  <span className={`inline-block rounded px-1.5 py-0.5 font-bold text-white ${
                                    ev.grade === "5" ? "bg-violet-600" :
                                    ev.grade === "4" ? "bg-green-600" :
                                    ev.grade === "3" ? "bg-blue-600" :
                                    ev.grade === "2" ? "bg-amber-500" : "bg-red-600"
                                  }`}>{ev.grade}</span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{ev.episode || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {r.decisionReason && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                      <span className="font-semibold text-gray-600">合否判断の理由：</span>{r.decisionReason}
                    </div>
                  )}
                  {r.notes && (
                    <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
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
            <p className="text-xs text-gray-500">質問バンクからこの候補者の面接で使う質問を選択できます。</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {["すべて", ...Array.from(new Set(interviewQuestions.map((q) => q.stage)))].map((stage) => (
                <button key={stage} onClick={() => setQuestionStageFilter(stage)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${questionStageFilter === stage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {stage}
                </button>
              ))}
            </div>
            {interviewQuestions.filter((q) => questionStageFilter === "すべて" || q.stage === questionStageFilter).map((q) => {
              const assigned = assignedQuestions.includes(q.id);
              return (
                <div key={q.id} className={`rounded-xl border p-4 transition-colors ${assigned ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1 mb-1">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{q.stage}</span>
                        {q.tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{t}</span>)}
                      </div>
                      <p className="text-sm text-gray-800">{q.text}</p>
                    </div>
                    <button
                      onClick={() => setAssignedQuestions((prev) =>
                        assigned ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                      )}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors flex-shrink-0 ${
                        assigned ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {assigned ? "✓ 選択中" : "選択"}
                    </button>
                  </div>
                </div>
              );
            })}
            {interviewQuestions.length === 0 && (
              <p className="text-sm text-gray-400">質問バンクに質問がありません。</p>
            )}
            {assignedQuestions.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-800 mb-2">選択中: {assignedQuestions.length}件</p>
                <button onClick={() => { handleSave(); }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">保存する</button>
              </div>
            )}
          </div>
        )}

        {/* ── 履歴 ── */}
        {activeTab === "履歴" && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Slack通知履歴 <span className="font-normal text-gray-400">({candidateSlacks.length}件)</span>
              </p>
              {candidateSlacks.length === 0 ? (
                <p className="text-xs text-gray-400">通知履歴がありません。</p>
              ) : (
                <div className="space-y-2">
                  {candidateSlacks.map((n) => (
                    <div key={n.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between text-gray-400 mb-0.5">
                        <span>{n.channel}</span><span>{n.sentAt}</span>
                      </div>
                      <p className="text-gray-700">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                メール履歴 <span className="font-normal text-gray-400">({allEmail.length}件)</span>
              </p>
              {allEmail.length === 0 ? (
                <p className="text-xs text-gray-400">メール履歴がありません。</p>
              ) : (
                <div className="space-y-2">
                  {allEmail.map((e: any) => (
                    <div key={e.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between text-gray-400 mb-0.5">
                        <span className={`font-medium ${e.direction === "送信" ? "text-blue-600" : "text-green-600"}`}>
                          {e.direction}
                        </span>
                        <span>{e.sentAt}</span>
                      </div>
                      <p className="font-medium text-gray-700">{e.subject}</p>
                      <p className="text-gray-500 mt-0.5">{e.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
