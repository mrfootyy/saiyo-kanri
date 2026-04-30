"use client";

import { useState } from "react";
import { useRecruitment } from "../context";
import { Candidate, DocumentFile } from "../types";
import { extractFromFile, isExtractError } from "../extractFromFile";
import { POSITION_OPTIONS } from "../constants";
import DocumentUpload from "./DocumentUpload";

type Props = {
  onClose: () => void;
};

export default function AddCandidateModal({ onClose }: Props) {
  const { addCandidate } = useRecruitment();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<string>(POSITION_OPTIONS[0]);
  const [customPosition, setCustomPosition] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [email, setEmail] = useState("");
  const [resumeFile, setResumeFile] = useState<DocumentFile | undefined>();
  const [cvFile, setCvFile] = useState<DocumentFile | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [error, setError] = useState("");

  const [extractedPhone, setExtractedPhone] = useState("");
  const [extractedAge, setExtractedAge] = useState("");
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedCompanies, setExtractedCompanies] = useState<{ name: string; years: string }[]>([]);
  const [extractedGithubUrl, setExtractedGithubUrl] = useState("");

  async function handleFileUpload(
    file: DocumentFile | undefined,
    setter: (f: DocumentFile | undefined) => void
  ) {
    setter(file);
    if (!file) return;

    setExtracting(true);
    setExtractError("");
    setExtractSuccess(false);

    const result = await extractFromFile(file.dataUrl, file.type);

    setExtracting(false);

    if (isExtractError(result)) {
      setExtractError(result.message);
      return;
    }

    if (result.email && !email) setEmail(result.email);
    if (result.phone && !extractedPhone) setExtractedPhone(result.phone);
    if (result.age && !extractedAge) setExtractedAge(result.age);
    if (result.skills?.length) setExtractedSkills((prev) => [...new Set([...prev, ...result.skills!])]);
    if (result.companies?.length) {
      setExtractedCompanies((prev) => {
        const existing = new Set(prev.map((c) => c.name));
        const added = result.companies!.filter((c) => !existing.has(c.name));
        return [...prev, ...added];
      });
    }
    if (result.githubUrl && !extractedGithubUrl) setExtractedGithubUrl(result.githubUrl);

    setExtractSuccess(true);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("氏名は必須です。");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);

    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      nameKana: nameKana.trim(),
      position: position === "その他" ? customPosition.trim() || "その他" : position,
      status: "応募受付",
      appliedAt: today,
      email: email.trim(),
      phone: extractedPhone,
      age: extractedAge,
      companies: extractedCompanies,
      skills: extractedSkills.length ? extractedSkills : undefined,
      githubUrl: extractedGithubUrl || undefined,
      interviewers: [],
      memo: "",
      updatedAt: today,
      resumeFile,
      cvFile,
      interviewRecords: [],
    };

    addCandidate(newCandidate);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">応募者を登録</h2>
            <p className="mt-0.5 text-sm text-gray-500">書類をアップロードするとAIが情報を自動入力します</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* 氏名 */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="例：山田 太郎"
              autoFocus
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ふりがな */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">ふりがな</label>
            <input
              type="text"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              placeholder="例：やまだ たろう"
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 志望職種 */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">志望職種</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {position === "その他" && (
              <input
                type="text"
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="職種を入力"
                className="mt-2 w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
          </div>

          {/* メールアドレス */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 書類アップロード（2カラム） */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">書類</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">履歴書</p>
                <DocumentUpload
                  label=""
                  file={resumeFile}
                  onChange={(f) => handleFileUpload(f, setResumeFile)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">職務経歴書</p>
                <DocumentUpload
                  label=""
                  file={cvFile}
                  onChange={(f) => handleFileUpload(f, setCvFile)}
                />
              </div>
            </div>

            {/* AI読み取り状態 */}
            {extracting && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AIで解析中...
              </div>
            )}
            {!extracting && extractSuccess && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AI読み取り完了。情報を自動入力しました。
              </div>
            )}
            {!extracting && extractError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {extractError}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={extracting}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
}
