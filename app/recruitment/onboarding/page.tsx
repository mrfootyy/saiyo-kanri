"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "./context";
import { useRecruitment } from "../context";
import type { OnboardingStatus } from "./types";

const STATUS_BADGE: Record<string, string> = {
  未開始: "bg-slate-100 text-slate-500",
  進行中: "bg-blue-50 text-blue-700",
  完了: "bg-emerald-50 text-emerald-700",
  要フォロー: "bg-red-50 text-red-700",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors";
const selectCls =
  "w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors bg-white";
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

function today() { return new Date().toISOString().slice(0, 10); }

export default function OnboardingPage() {
  const { members, trainingRecords, dailyReports, mentorMeetings, addMember, removeMember } = useOnboarding();
  const { candidates, interviewers } = useRecruitment();

  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [aName, setAName] = useState("");
  const [aPosition, setAPosition] = useState("");
  const [aDept, setADept] = useState("");
  const [aJoined, setAJoined] = useState(today());
  const [aMentor, setAMentor] = useState("");
  const [aOjt, setAOjt] = useState("");
  const [aCandidateId, setACandidateId] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.position.toLowerCase().includes(q) &&
        !m.mentor.toLowerCase().includes(q) &&
        !m.ojtOwner.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [members, search]);

  const totalCount = members.length;
  const inProgressCount = members.filter((m) => m.onboardingStatus === "進行中").length;
  const needFollowCount = members.filter((m) => m.onboardingStatus === "要フォロー").length;
  const onboardingCandidateIds = useMemo(
    () => new Set(members.map((member) => member.candidateId).filter(Boolean)),
    [members]
  );
  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !onboardingCandidateIds.has(candidate.id)),
    [candidates, onboardingCandidateIds]
  );

  function getLatestReport(memberId: string) {
    return dailyReports.filter((r) => r.memberId === memberId).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))[0] ?? null;
  }

  function getLatestMeeting(memberId: string) {
    return mentorMeetings.filter((m) => m.memberId === memberId).sort((a, b) => b.meetingAt.localeCompare(a.meetingAt))[0] ?? null;
  }

  function getTrainingCount(memberId: string) {
    return trainingRecords.filter((r) => r.memberId === memberId).length;
  }

  function handleAdd() {
    if (!aName.trim() || !aPosition.trim()) return;
    addMember({
      id: crypto.randomUUID(),
      candidateId: aCandidateId || undefined,
      name: aName.trim(),
      position: aPosition.trim(),
      department: aDept.trim(),
      joinedAt: aJoined,
      mentor: aMentor,
      ojtOwner: aOjt,
      onboardingStatus: "未開始" as OnboardingStatus,
      condition: "普通",
      retentionRisk: "低",
      memo: "",
      updatedAt: today(),
    });
    setAName(""); setAPosition(""); setADept(""); setAJoined(today()); setAMentor(""); setAOjt(""); setACandidateId("");
    setShowAddForm(false);
  }

  function handleSelectCandidate(candidateId: string) {
    setACandidateId(candidateId);
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    setAName(candidate.name);
    setAPosition(candidate.position);
    setADept("");
    setAJoined(today());
    setAMentor(candidate.interviewers[0] ?? "");
    setAOjt(candidate.interviewers[1] ?? candidate.interviewers[0] ?? "");
  }

  function resetAddForm() {
    setAName("");
    setAPosition("");
    setADept("");
    setAJoined(today());
    setAMentor("");
    setAOjt("");
    setACandidateId("");
  }

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`「${name}」を削除しますか？関連する記録もすべて削除されます。`)) return;
    removeMember(id);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">オンボーディング管理</h1>
        <p className="mt-0.5 text-xs text-slate-500">入社者の研修・OJT・状態を一元管理します</p>
      </div>

      {/* サマリーカード */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">入社者数</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}<span className="ml-1 text-sm font-normal text-slate-400">名</span></p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-medium text-blue-600">研修中</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{inProgressCount}<span className="ml-1 text-sm font-normal text-blue-400">名</span></p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-600">要フォロー</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{needFollowCount}<span className="ml-1 text-sm font-normal text-amber-400">名</span></p>
          </div>
        </div>
      </div>

      {/* 検索・追加 */}
      <div className="border-b border-slate-100 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="氏名・職種・メンター・OJT担当で検索"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
          />
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showAddForm ? "キャンセル" : "メンバーを追加"}
          </button>
        </div>
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div className="border-b border-blue-100 bg-blue-50 px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">新しいメンバーを追加</p>
          <div className="mb-4 rounded-lg border border-blue-200 bg-white px-3 py-3">
            <label className={labelCls}>応募者から登録</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={aCandidateId} onChange={(e) => handleSelectCandidate(e.target.value)} className={selectCls}>
                  <option value="">手入力で追加</option>
                  {availableCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} / {candidate.position} / {candidate.status}
                    </option>
                  ))}
                </select>
                <SelectArrow />
              </div>
              {aCandidateId && (
                <button
                  type="button"
                  onClick={resetAddForm}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  選択解除
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-blue-700">応募者を選ぶと、氏名・職種・担当者を自動入力します。</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>氏名 <span className="text-red-500">*</span></label>
              <input type="text" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="田中 花子" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>職種 <span className="text-red-500">*</span></label>
              <input type="text" value={aPosition} onChange={(e) => setAPosition(e.target.value)} placeholder="フロントエンドエンジニア" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>部署</label>
              <input type="text" value={aDept} onChange={(e) => setADept(e.target.value)} placeholder="開発部" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>入社日</label>
              <input type="date" value={aJoined} onChange={(e) => setAJoined(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>メンター</label>
              <div className="relative">
                <select value={aMentor} onChange={(e) => setAMentor(e.target.value)} className={selectCls}>
                  <option value="">未設定</option>
                  {interviewers.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>OJT担当</label>
              <div className="relative">
                <select value={aOjt} onChange={(e) => setAOjt(e.target.value)} className={selectCls}>
                  <option value="">未設定</option>
                  {interviewers.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <SelectArrow />
              </div>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!aName.trim() || !aPosition.trim()}
            className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            追加する
          </button>
        </div>
      )}

      {/* テーブル */}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-slate-500">該当する入社者がいません。</p>
            <p className="mt-1 text-xs text-slate-400">検索条件やフィルターを変更してください。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">氏名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">職種</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">入社日</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">メンター</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">OJT担当</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">研修記録</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">最新日報</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">最終面談</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => {
                  const latestReport = getLatestReport(m.id);
                  const latestMeeting = getLatestMeeting(m.id);
                  const trainingCount = getTrainingCount(m.id);
                  const hasConsultation = latestReport?.consultation?.trim();
                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/recruitment/onboarding/${m.id}`)}
                      className={`cursor-pointer border-b border-slate-50 transition-colors hover:bg-blue-50 last:border-b-0 ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-blue-600">
                          {m.name}
                          {(m.condition === "不安あり" || m.condition === "要対応") && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="要フォロー" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.position}</td>
                      <td className="px-4 py-3 text-slate-500">{m.joinedAt}</td>
                      <td className="px-4 py-3 text-slate-600">{m.mentor || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{m.ojtOwner || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[m.onboardingStatus]}`}>{m.onboardingStatus}</span>
                          {trainingCount > 0 && <span className="text-xs text-slate-400">{trainingCount}件</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {latestReport ? (
                          <div>
                            <p className="text-xs text-slate-500">{latestReport.reportedAt}</p>
                            {hasConsultation && (
                              <span className="mt-0.5 inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">相談あり</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">未提出</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {latestMeeting ? latestMeeting.meetingAt : <span className="text-slate-300">なし</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => handleDelete(e, m.id, m.name)}
                          aria-label={`${m.name}を削除`}
                          className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
