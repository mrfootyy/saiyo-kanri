"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOnboarding } from "./context";
import type { ConditionFilterValue, MemberCondition, RetentionRisk, RiskFilterValue } from "./types";

const CONDITION_FILTER_OPTIONS: ConditionFilterValue[] = ["すべて", "良好", "普通", "不安あり", "要対応"];
const RISK_FILTER_OPTIONS: RiskFilterValue[] = ["すべて", "低", "中", "高"];

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

const STATUS_BADGE: Record<string, string> = {
  未開始: "bg-slate-100 text-slate-500",
  進行中: "bg-blue-50 text-blue-700",
  完了: "bg-emerald-50 text-emerald-700",
  要フォロー: "bg-red-50 text-red-700",
};

export default function OnboardingPage() {
  const { members, trainingRecords, dailyReports, mentorMeetings } = useOnboarding();

  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState<ConditionFilterValue>("すべて");
  const [riskFilter, setRiskFilter] = useState<RiskFilterValue>("すべて");

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
      if (conditionFilter !== "すべて" && m.condition !== conditionFilter) return false;
      if (riskFilter !== "すべて" && m.retentionRisk !== riskFilter) return false;
      return true;
    });
  }, [members, search, conditionFilter, riskFilter]);

  const totalCount = members.length;
  const inProgressCount = members.filter((m) => m.onboardingStatus === "進行中").length;
  const needFollowCount = members.filter((m) => m.condition === "不安あり" || m.condition === "要対応").length;
  const highRiskCount = members.filter((m) => m.retentionRisk === "高").length;

  function getLatestReport(memberId: string) {
    return dailyReports.filter((r) => r.memberId === memberId).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))[0] ?? null;
  }

  function getLatestMeeting(memberId: string) {
    return mentorMeetings.filter((m) => m.memberId === memberId).sort((a, b) => b.meetingAt.localeCompare(a.meetingAt))[0] ?? null;
  }

  function getTrainingCount(memberId: string) {
    return trainingRecords.filter((r) => r.memberId === memberId).length;
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
        <div className="grid grid-cols-4 gap-4">
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
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium text-red-600">高リスク</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{highRiskCount}<span className="ml-1 text-sm font-normal text-red-400">名</span></p>
          </div>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-6 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="氏名・職種・メンター・OJT担当で検索"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">状態:</span>
          {CONDITION_FILTER_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setConditionFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                conditionFilter === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">リスク:</span>
          {RISK_FILTER_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                riskFilter === r ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">状態</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">リスク</th>
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
                      className={`border-b border-slate-50 last:border-b-0 ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/recruitment/onboarding/${m.id}`}
                          className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {m.name}
                          {(m.condition === "不安あり" || m.condition === "要対応") && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="要フォロー" />
                          )}
                        </Link>
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
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${CONDITION_BADGE[m.condition]}`}>{m.condition}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${RISK_BADGE[m.retentionRisk]}`}>{m.retentionRisk}</span>
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
