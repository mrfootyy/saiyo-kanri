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

type Tab = "基本情報" | "書類" | "面接記録" | "履歴";

type AiSummary = {
  strengths: string[];
  concerns: string[];
  nextQuestions: string[];
  overallComment: string;
};

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

function AiSummaryList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "green" | "amber" | "blue";
}) {
  const colorClass = {
    green: "text-green-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  }[color];

  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4">
      <p className={`text-xs font-bold uppercase tracking-wide ${colorClass}`}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">項目がありません。</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-700">
              <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : "bg-blue-500"}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { candidates, updateCandidate, slackNotifications, addSlackNotifications, emailHistories, interviewStages, interviewers: interviewerOptions } =
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

  return <CandidateDetail candidate={candidate} allSlack={slackNotifications} allEmail={emailHistories.filter((e) => e.candidateId === candidate.id)} interviewStages={interviewStages} interviewerOptions={interviewerOptions} onUpdate={updateCandidate} onAddSlack={addSlackNotifications} />;
}

function CandidateDetail({
  candidate,
  allSlack,
  allEmail,
  interviewStages,
  interviewerOptions,
  onUpdate,
  onAddSlack,
}: {
  candidate: Candidate;
  allSlack: SlackNotification[];
  allEmail: ReturnType<typeof Array.prototype.filter>;
  interviewStages: import("../../types").InterviewStage[];
  interviewerOptions: string[];
  onUpdate: (c: Candidate) => void;
  onAddSlack: (n: SlackNotification[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const [saved, setSaved] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // 基本情報
  const [name, setName] = useState(candidate.name);
  const [nameKana, setNameKana] = useState(candidate.nameKana ?? "");
  const [position, setPosition] = useState(candidate.position);
  const [email, setEmail] = useState(candidate.email);
  const [phone, setPhone] = useState(candidate.phone);
  const [age, setAge] = useState(candidate.age);
  const [skills, setSkills] = useState<string[]>(candidate.skills ?? []);
  const [companies, setCompanies] = useState<string[]>(candidate.companies ?? []);
  const [experienceYears, setExperienceYears] = useState(candidate.experienceYears ?? "");
  const [githubUrl, setGithubUrl] = useState(candidate.githubUrl ?? "");
  const [status, setStatus] = useState<CandidateStatus>(candidate.status);
  const [interviewers, setInterviewers] = useState<string[]>(candidate.interviewers);
  const [memo, setMemo] = useState(candidate.memo);

  // 書類
  const [resumeFile, setResumeFile] = useState<DocumentFile | undefined>(candidate.resumeFile);
  const [cvFile, setCvFile] = useState<DocumentFile | undefined>(candidate.cvFile);
  const [portfolioUrl, setPortfolioUrl] = useState(candidate.portfolioUrl ?? "");
  const [portfolioFile, setPortfolioFile] = useState<DocumentFile | undefined>(candidate.portfolioFile);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInfo | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // 面接記録
  const [records, setRecords] = useState<InterviewRecord[]>(candidate.interviewRecords);
  const [editingRecord, setEditingRecord] = useState<InterviewRecord | null>(null);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState<Omit<InterviewRecord, "id">>({
    stageName: "",
    date: new Date().toISOString().slice(0, 10),
    interviewers: [],
    notes: "",
    rating: null,
    result: null,
  });

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
      experienceYears,
      githubUrl: githubUrl.trim() || undefined,
      interviewRecords: records,
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
      setExtracted(result);
    }
  }

  async function handleResumeUpload(file: DocumentFile | undefined) {
    await readDocument(file, setResumeFile, { resumeFile: file });
  }

  async function handleCvUpload(file: DocumentFile | undefined) {
    await readDocument(file, setCvFile, { cvFile: file });
  }

  function applyExtracted() {
    if (!extracted) return;
    const nextSkills = extracted.skills?.length ? [...new Set([...skills, ...extracted.skills])] : skills;
    const nextCompanies = extracted.companies?.length ? [...new Set([...companies, ...extracted.companies])] : companies;
    const nextEmail = extracted.email ?? email;
    const nextPhone = extracted.phone ?? phone;
    const nextAge = extracted.age ?? age;
    const nextExperienceYears = extracted.experienceYears ?? experienceYears;
    const nextGithubUrl = extracted.githubUrl ?? githubUrl;

    if (extracted.email) setEmail(extracted.email);
    if (extracted.phone) setPhone(extracted.phone);
    if (extracted.age) setAge(extracted.age);
    if (extracted.skills?.length) setSkills(nextSkills);
    if (extracted.companies?.length) setCompanies(nextCompanies);
    if (extracted.experienceYears) setExperienceYears(extracted.experienceYears);
    if (extracted.githubUrl) setGithubUrl(extracted.githubUrl);
    onUpdate(buildCandidateUpdate({
      email: nextEmail,
      phone: nextPhone,
      age: nextAge,
      skills: nextSkills,
      companies: nextCompanies,
      experienceYears: nextExperienceYears,
      githubUrl: nextGithubUrl.trim() || undefined,
    }));
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

  async function generateAiSummary() {
    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("/api/ai/candidate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          position,
          status: syncedStatus,
          appliedAt: candidate.appliedAt,
          age,
          skills,
          companies,
          experienceYears,
          githubUrl,
          portfolioUrl,
          memo,
          interviewers,
          interviewRecords: records,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "AI要約の生成に失敗しました。");
      }

      setAiSummary(data.summary);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI要約の生成に失敗しました。");
    } finally {
      setAiLoading(false);
    }
  }

  // 面接記録フォーム
  function openAddRecord() {
    setRecordForm({
      stageName: interviewStages[0]?.name ?? "",
      date: new Date().toISOString().slice(0, 10),
      interviewers: [],
      notes: "",
      rating: null,
      result: null,
    });
    setEditingRecord(null);
    setIsAddingRecord(true);
  }

  function openEditRecord(record: InterviewRecord) {
    setRecordForm({
      stageName: record.stageName,
      date: record.date,
      interviewers: record.interviewers,
      notes: record.notes,
      rating: record.rating,
      result: record.result,
    });
    setEditingRecord(record);
    setIsAddingRecord(false);
  }

  function saveRecord() {
    if (!recordForm.stageName) return;
    if (editingRecord) {
      setRecords((prev) => prev.map((r) => r.id === editingRecord.id ? { ...editingRecord, ...recordForm } : r));
    } else {
      setRecords((prev) => [...prev, { id: `ir_${Date.now()}`, ...recordForm }]);
    }
    setIsAddingRecord(false);
    setEditingRecord(null);
  }

  function deleteRecord(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const hasExtracted = extracted && (
    extracted.email ||
    extracted.phone ||
    extracted.age ||
    extracted.skills?.length ||
    extracted.companies?.length ||
    extracted.experienceYears ||
    extracted.githubUrl
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
              onClick={generateAiSummary}
              disabled={aiLoading}
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLoading ? "AI要約中..." : "AI要約"}
            </button>
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

      {(aiSummary || aiError) && (
        <div className="border-b border-violet-100 bg-violet-50/70 px-6 py-4">
          {aiError ? (
            <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600">
              {aiError}
            </div>
          ) : aiSummary ? (
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-violet-100 bg-white p-4 lg:col-span-1">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-500">総評</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{aiSummary.overallComment}</p>
              </div>
              <AiSummaryList title="強み" items={aiSummary.strengths} color="green" />
              <AiSummaryList title="懸念点" items={aiSummary.concerns} color="amber" />
              <AiSummaryList title="次に聞くこと" items={aiSummary.nextQuestions} color="blue" />
            </div>
          ) : null}
        </div>
      )}

      {/* タブ */}
      <div className="flex border-b border-gray-100 bg-white px-6">
        {(["基本情報", "書類", "面接記録", "履歴"] as Tab[]).map((tab) => (
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
            {tab === "面接記録" && records.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                {records.length}
              </span>
            )}
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">経験企業</label>
                <input
                  type="text"
                  value={companies.join(", ")}
                  onChange={(e) => setCompanies(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
                  placeholder="株式会社サンプル, Example Inc."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">経験年数</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="5"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">年</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">メモ</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
                placeholder="メモを入力"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        )}

        {/* ── 書類 ── */}
        {activeTab === "書類" && (
          <div className="space-y-6">
            <DocumentUpload
              label="職務経歴書（アップロード後にスキル・企業・経験年数を自動読み取り）"
              file={resumeFile}
              onChange={handleResumeUpload}
            />

            <div className="space-y-2">
              <DocumentUpload
                label="履歴書（アップロード後にメール・電話・年齢・GitHub URLを自動読み取り）"
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
                  <p className="font-medium text-green-800 mb-2">読み取り結果</p>
                  {hasExtracted ? (
                    <>
                      <div className="space-y-1 text-green-700">
                        {extracted.email && <p>メールアドレス: <span className="font-medium">{extracted.email}</span></p>}
                        {extracted.phone && <p>電話番号: <span className="font-medium">{extracted.phone}</span></p>}
                        {extracted.age && <p>年齢: <span className="font-medium">{extracted.age}歳</span></p>}
                        {!!extracted.skills?.length && <p>スキル: <span className="font-medium">{extracted.skills.join(", ")}</span></p>}
                        {!!extracted.companies?.length && <p>経験企業: <span className="font-medium">{extracted.companies.join(", ")}</span></p>}
                        {extracted.experienceYears && <p>経験年数: <span className="font-medium">{extracted.experienceYears}年</span></p>}
                        {extracted.githubUrl && <p>GitHub: <span className="font-medium">{extracted.githubUrl}</span></p>}
                      </div>
                      <button onClick={applyExtracted}
                        className="mt-3 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        基本情報に反映して確認する →
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

        {/* ── 面接記録 ── */}
        {activeTab === "面接記録" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">面接ごとの評価・コメントを記録します。</p>
              <button onClick={openAddRecord}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                記録を追加
              </button>
            </div>

            {/* 追加・編集フォーム */}
            {(isAddingRecord || editingRecord) && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">{editingRecord ? "記録を編集" : "新しい面接記録"}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ステージ</label>
                    <select value={recordForm.stageName}
                      onChange={(e) => setRecordForm((f) => ({ ...f, stageName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                      {interviewStages.length > 0
                        ? interviewStages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)
                        : STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">実施日</label>
                    <input type="date" value={recordForm.date}
                      onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    面接官
                    {recordForm.interviewers.length > 0 && (
                      <span className="ml-1 font-normal text-gray-400">({recordForm.interviewers.length}名)</span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-white p-1.5">
                    {interviewerOptions.map((opt) => {
                      const checked = recordForm.interviewers.includes(opt);
                      return (
                        <label key={opt}
                          className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                            checked ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                          }`}>
                          <input type="checkbox" checked={checked} className="h-3 w-3 accent-blue-600"
                            onChange={() => setRecordForm((f) => ({
                              ...f,
                              interviewers: checked
                                ? f.interviewers.filter((i) => i !== opt)
                                : [...f.interviewers, opt],
                            }))} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">評価メモ</label>
                  <textarea value={recordForm.notes}
                    onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={4} placeholder="面接の印象・評価・気になった点など"
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">総合評価</label>
                    <StarRating
                      value={recordForm.rating}
                      onChange={(v) => setRecordForm((f) => ({ ...f, rating: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">判定</label>
                    <select value={recordForm.result ?? ""}
                      onChange={(e) => setRecordForm((f) => ({ ...f, result: (e.target.value || null) as InterviewResult | null }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                      <option value="">未判定</option>
                      {RESULT_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => { setIsAddingRecord(false); setEditingRecord(null); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white">
                    キャンセル
                  </button>
                  <button onClick={saveRecord} disabled={!recordForm.stageName}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* 記録一覧 */}
            {records.length === 0 && !isAddingRecord && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 text-gray-400">
                <svg className="mb-3 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">面接記録がありません。</p>
              </div>
            )}

            <div className="space-y-3">
              {[...records].sort((a, b) => b.date.localeCompare(a.date)).map((record) => (
                <div key={record.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800">{record.stageName}</span>
                        <span className="text-xs text-gray-400">{record.date}</span>
                        {record.result && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_COLORS[record.result]}`}>
                            {record.result}
                          </span>
                        )}
                      </div>

                      {record.interviewers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {record.interviewers.map((i) => (
                            <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{i}</span>
                          ))}
                        </div>
                      )}

                      {record.rating && (
                        <div className="mb-2">
                          <StarRating value={record.rating} />
                        </div>
                      )}

                      {record.notes && (
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditRecord(record)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                        編集
                      </button>
                      <button onClick={() => deleteRecord(record.id)}
                        className="rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
