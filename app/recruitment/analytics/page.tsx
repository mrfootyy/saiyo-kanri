"use client";

import { useMemo, useState } from "react";
import { useRecruitment } from "../context";
import { CandidateStatus, HireGoal } from "../types";
import { ACTIVE_STATUSES, POSITION_OPTIONS } from "../constants";

const ALL_STATUSES: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接", "内定", "不採用", "辞退"];

const STATUS_COLORS: Record<CandidateStatus, string> = {
  応募受付: "bg-gray-400",
  書類選考: "bg-blue-400",
  一次面接: "bg-indigo-500",
  最終面接: "bg-purple-500",
  内定: "bg-green-500",
  不採用: "bg-red-400",
  辞退: "bg-orange-400",
};

export default function AnalyticsPage() {
  const { candidates, interviewers, hireGoals, setHireGoals } = useRecruitment();
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState<HireGoal[]>(hireGoals);

  const activeCandidates = useMemo(() => candidates.filter((c) => !c.archivedAt), [candidates]);

  // ステータス別カウント
  const statusCounts = useMemo(() => {
    const map: Record<CandidateStatus, number> = {} as Record<CandidateStatus, number>;
    for (const s of ALL_STATUSES) map[s] = 0;
    for (const c of activeCandidates) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [activeCandidates]);

  // 選考通過率（応募→内定）
  const funnelStages: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接", "内定"];
  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of funnelStages) {
      counts[s] = activeCandidates.filter((c) =>
        funnelStages.indexOf(c.status) >= funnelStages.indexOf(s)
      ).length;
    }
    return counts;
  }, [activeCandidates]);

  const totalApplied = activeCandidates.length || 1;

  // 選考期間の平均（応募日→最終更新）
  const avgDays = useMemo(() => {
    const terminal = activeCandidates.filter((c) => ["内定", "不採用", "辞退"].includes(c.status));
    if (terminal.length === 0) return null;
    const totalMs = terminal.reduce((sum, c) => {
      const start = new Date(c.appliedAt).getTime();
      const end = new Date(c.updatedAt.slice(0, 10)).getTime();
      return sum + Math.max(0, end - start);
    }, 0);
    return Math.round(totalMs / terminal.length / 86400000);
  }, [activeCandidates]);

  // 応募ソース別
  const sourceCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of activeCandidates) {
      const s = c.source || "不明";
      map[s] = (map[s] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeCandidates]);

  // 面接官ごとの担当数・通過数
  const interviewerStats = useMemo(() => {
    const stats: Record<string, { assigned: number; passed: number; total: number }> = {};
    for (const iv of interviewers) stats[iv] = { assigned: 0, passed: 0, total: 0 };
    for (const c of activeCandidates) {
      for (const r of c.interviewRecords) {
        for (const iv of r.interviewers) {
          if (!stats[iv]) stats[iv] = { assigned: 0, passed: 0, total: 0 };
          stats[iv].assigned++;
          stats[iv].total++;
          if (r.result === "通過") stats[iv].passed++;
        }
      }
    }
    return Object.entries(stats).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total);
  }, [activeCandidates, interviewers]);

  // 職種別
  const positionCounts = useMemo(() => {
    const map: Record<string, { total: number; offered: number }> = {};
    for (const c of activeCandidates) {
      const p = c.position;
      if (!map[p]) map[p] = { total: 0, offered: 0 };
      map[p].total++;
      if (c.status === "内定") map[p].offered++;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [activeCandidates]);

  // 採用目標の進捗
  const goalProgress = useMemo(() => {
    return hireGoals.map((g) => {
      const offered = activeCandidates.filter((c) => c.status === "内定" && c.position === g.position).length;
      return { ...g, offered };
    });
  }, [hireGoals, activeCandidates]);

  function saveGoals() {
    setHireGoals(goalDraft);
    setEditingGoals(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">採用分析</h1>
        <p className="mt-0.5 text-sm text-gray-600">選考状況の統計と分析レポートです。</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "応募者総数", value: activeCandidates.length, unit: "名", color: "text-blue-700" },
          { label: "選考中", value: activeCandidates.filter((c) => ACTIVE_STATUSES.includes(c.status)).length, unit: "名", color: "text-yellow-700" },
          { label: "内定", value: statusCounts["内定"], unit: "名", color: "text-green-700" },
          { label: "平均選考期間", value: avgDays ?? "—", unit: avgDays != null ? "日" : "", color: "text-purple-700" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`mt-1 flex items-baseline gap-1 text-3xl font-bold ${card.color}`}>
              {card.value}
              {card.unit && <span className="text-xs font-normal text-gray-400">{card.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* 採用ファネル */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-sm font-bold text-gray-700">選考ファネル</h2>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const count = funnelCounts[stage] ?? 0;
            const pct = Math.round((count / totalApplied) * 100);
            const prevCount = i > 0 ? (funnelCounts[funnelStages[i - 1]] || 1) : null;
            const conversionRate = prevCount ? Math.round((count / prevCount) * 100) : null;
            return (
              <div key={stage} className="flex items-center gap-4">
                <span className="w-20 text-right text-xs font-semibold text-gray-500 flex-shrink-0">{stage}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${STATUS_COLORS[stage]} flex items-center px-3 transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    <span className="text-xs font-bold text-white whitespace-nowrap">{count}名</span>
                  </div>
                </div>
                <span className="w-20 text-xs text-gray-400 flex-shrink-0">
                  {pct}%
                  {conversionRate !== null && <span className="ml-1 text-gray-300">({conversionRate}%)</span>}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">括弧内は前ステージからの通過率</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ステータス分布 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-700">ステータス分布</h2>
          <div className="space-y-2">
            {ALL_STATUSES.map((s) => {
              const count = statusCounts[s];
              const pct = activeCandidates.length > 0 ? Math.round((count / activeCandidates.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-20 text-right text-xs text-gray-500 flex-shrink-0">{s}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div className={`h-full ${STATUS_COLORS[s]}`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs font-semibold text-gray-600 flex-shrink-0">{count}名 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 応募ソース */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-700">応募ソース別</h2>
          {sourceCounts.length === 0 ? (
            <p className="text-sm text-gray-400">応募ソースデータがありません。</p>
          ) : (
            <div className="space-y-2">
              {sourceCounts.slice(0, 10).map(([source, count]) => {
                const pct = Math.round((count / activeCandidates.length) * 100);
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{source}</span>
                    <div className="w-24 h-4 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <div className="h-full bg-blue-400" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs font-semibold text-gray-600 flex-shrink-0">{count}名</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 面接官別統計 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-700">面接官別担当状況</h2>
          {interviewerStats.length === 0 ? (
            <p className="text-sm text-gray-400">面接記録がありません。</p>
          ) : (
            <div className="space-y-3">
              {interviewerStats.map(([name, stats]) => {
                const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
                      <div className="mt-0.5 h-1.5 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-green-400" style={{ width: `${passRate}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-gray-700">{stats.total}件</p>
                      <p className="text-[10px] text-gray-400">通過率 {passRate}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 職種別 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-700">職種別応募・内定数</h2>
          {positionCounts.length === 0 ? (
            <p className="text-sm text-gray-400">データがありません。</p>
          ) : (
            <div className="space-y-2">
              {positionCounts.slice(0, 10).map(([pos, data]) => (
                <div key={pos} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{pos}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">応募{data.total}名</span>
                  <span className="text-xs font-bold text-green-600 flex-shrink-0">内定{data.offered}名</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 採用目標 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">採用目標</h2>
          <button
            onClick={() => {
              setGoalDraft(hireGoals.length > 0 ? hireGoals : [{ position: POSITION_OPTIONS[0], target: 1 }]);
              setEditingGoals(!editingGoals);
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {editingGoals ? "キャンセル" : "目標を設定"}
          </button>
        </div>

        {editingGoals ? (
          <div className="space-y-3">
            {goalDraft.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <select value={g.position} onChange={(e) => setGoalDraft((d) => d.map((x, idx) => idx === i ? { ...x, position: e.target.value } : x))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="relative w-24">
                  <input type="number" min={1} max={100} value={g.target}
                    onChange={(e) => setGoalDraft((d) => d.map((x, idx) => idx === i ? { ...x, target: Number(e.target.value) } : x))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-7 text-sm focus:border-blue-400 focus:outline-none" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">名</span>
                </div>
                <button onClick={() => setGoalDraft((d) => d.filter((_, idx) => idx !== i))}
                  className="rounded p-1.5 text-gray-400 hover:text-red-500">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setGoalDraft((d) => [...d, { position: POSITION_OPTIONS[0], target: 1 }])}
                className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">
                + 目標を追加
              </button>
              <button onClick={saveGoals}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700">保存</button>
            </div>
          </div>
        ) : goalProgress.length === 0 ? (
          <p className="text-sm text-gray-400">採用目標が設定されていません。</p>
        ) : (
          <div className="space-y-4">
            {goalProgress.map((g) => {
              const pct = Math.min(100, Math.round((g.offered / g.target) * 100));
              return (
                <div key={g.position}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{g.position}</span>
                    <span className={`text-sm font-bold ${pct >= 100 ? "text-green-600" : "text-blue-600"}`}>
                      {g.offered} / {g.target}名 ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
