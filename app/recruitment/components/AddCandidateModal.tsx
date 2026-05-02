"use client";

import { useState } from "react";
import { useRecruitment } from "../context";
import { Candidate, DocumentFile } from "../types";
import { extractFromFile, isExtractError } from "../extractFromFile";
import DocumentUpload from "./DocumentUpload";
import PositionSelect from "./PositionSelect";

type Props = {
  onClose: () => void;
};

export default function AddCandidateModal({ onClose }: Props) {
  const { addCandidate, positionOptions } = useRecruitment();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<string>(positionOptions[0] ?? "");
  const [customPosition, setCustomPosition] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [email, setEmail] = useState("");
  const [resumeFile, setResumeFile] = useState<DocumentFile | undefined>();
  const [cvFile, setCvFile] = useState<DocumentFile | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [error, setError] = useState("");

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState("");

  const [extractedPhone, setExtractedPhone] = useState("");
  const [extractedAge, setExtractedAge] = useState("");
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedCompanies, setExtractedCompanies] = useState<{ name: string; years: string }[]>([]);
  const [extractedGithubUrl, setExtractedGithubUrl] = useState("");

  async function handleFileUpload(file: DocumentFile | undefined, setter: (f: DocumentFile | undefined) => void) {
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

    if (result.name && !name) {
      setName(result.name);
      setError("");
    }
    if (result.nameKana && !nameKana) setNameKana(result.nameKana);
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
      tags: tags.length ? tags : undefined,
      source: source.trim() || undefined,
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

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
  const selectCls = "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-slate-900">応募者を登録</h2>
            <p className="mt-0.5 text-xs text-slate-500">書類をアップロードするとAIが情報を自動入力します</p>
          </div>
          <button
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">書類</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1.5 text-xs text-slate-500">履歴書</p>
                <DocumentUpload label="" file={resumeFile} onChange={(f) => handleFileUpload(f, setResumeFile)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-slate-500">職務経歴書</p>
                <DocumentUpload label="" file={cvFile} onChange={(f) => handleFileUpload(f, setCvFile)} />
              </div>
            </div>

            {extracting && (
              <div role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AIで解析中...
              </div>
            )}
            {!extracting && extractSuccess && (
              <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AI読み取り完了。情報を自動入力しました。
              </div>
            )}
            {!extracting && extractError && (
              <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {extractError}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="modal-name" className="mb-1.5 block text-xs font-semibold text-slate-600">
              氏名 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="modal-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="例：山田 太郎"
              autoFocus
              required
              aria-required="true"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="modal-kana" className="mb-1.5 block text-xs font-semibold text-slate-600">ふりがな</label>
            <input
              id="modal-kana"
              type="text"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              placeholder="例：やまだ たろう"
              className={inputCls}
            />
          </div>

          <PositionSelect
            id="modal-position"
            value={position}
            onChange={setPosition}
            customValue={customPosition}
            onCustomChange={setCustomPosition}
            selectClassName={selectCls}
            inputClassName={inputCls}
          />

          <div>
            <label htmlFor="modal-email" className="mb-1.5 block text-xs font-semibold text-slate-600">メールアドレス</label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="modal-source" className="mb-1.5 block text-xs font-semibold text-slate-600">応募ソース</label>
            <input
              id="modal-source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="例：Indeed、Wantedly、エージェント（○○社）"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">タグ</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
                    setTagInput("");
                  }
                }}
                placeholder="タグを入力してEnter"
                aria-label="タグを追加"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const t = tagInput.trim();
                  if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
                  setTagInput("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              >
                追加
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                    {t}
                    <button
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                      aria-label={`タグ「${t}」を削除`}
                      className="text-blue-400 hover:text-blue-700 focus-visible:outline-none"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={extracting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
}
