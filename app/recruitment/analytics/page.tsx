"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRecruitment } from "../context";
import { ACTIVE_STATUSES } from "../constants";
import { Candidate, CandidateStatus, HireGoal } from "../types";
import { authFetch } from "../../../lib/authFetch";

const ALL_STATUSES: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接", "内定", "不採用", "辞退"];
const FUNNEL_STAGES: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接", "内定"];
const TERMINAL_STATUSES: CandidateStatus[] = ["内定", "不採用", "辞退"];
const STATUS_BAR_COLORS: Record<CandidateStatus, string> = {
  応募受付: "bg-slate-400",
  書類選考: "bg-blue-500",
  一次面接: "bg-blue-500",
  最終面接: "bg-blue-600",
  内定: "bg-blue-700",
  不採用: "bg-slate-500",
  辞退: "bg-slate-400",
};

type DateRange = "all" | "30d" | "90d" | "thisMonth" | "custom";
type SortKey = "stale" | "applied" | "updated";

type SelectOption = {
  label: string;
  value: string;
};

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const AI_CACHE_KEY = "recruitment_ai_insights";
const AI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1週間

function loadCachedInsights(): { insights: string[]; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { insights: string[]; cachedAt: number };
    if (Date.now() - parsed.cachedAt < AI_CACHE_TTL_MS) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveCachedInsights(insights: string[]) {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ insights, cachedAt: Date.now() }));
  } catch {}
}

export default function AnalyticsPage() {
  const { candidates, interviewers, positionOptions, hireGoals, setHireGoals } = useRecruitment();
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState<HireGoal[]>(hireGoals);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [positionFilter, setPositionFilter] = useState("すべて");
  const [sourceFilter, setSourceFilter] = useState("すべて");
  const [statusFilter, setStatusFilter] = useState("すべて");
  const [interviewerFilter, setInterviewerFilter] = useState("すべて");
  const [sortKey, setSortKey] = useState<SortKey>("stale");
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiCachedAt, setAiCachedAt] = useState<number | null>(null);

  const activeCandidates = useMemo(() => candidates.filter((candidate) => !candidate.archivedAt), [candidates]);

  const sourceOptions = useMemo<SelectOption[]>(() => {
    const sources = Array.from(new Set(activeCandidates.map((candidate) => candidate.source || "不明"))).sort();
    return [{ label: "すべて", value: "すべて" }, ...sources.map((source) => ({ label: source, value: source }))];
  }, [activeCandidates]);

  const filteredCandidates = useMemo(() => {
    const { start, end } = resolveDateRange(dateRange, customStart, customEnd);
    return activeCandidates.filter((candidate) => {
      const appliedAt = parseDate(candidate.appliedAt);
      if (start && appliedAt < start) return false;
      if (end && appliedAt > end) return false;
      if (positionFilter !== "すべて" && candidate.position !== positionFilter) return false;
      if (sourceFilter !== "すべて" && (candidate.source || "不明") !== sourceFilter) return false;
      if (statusFilter !== "すべて" && candidate.status !== statusFilter) return false;
      if (interviewerFilter !== "すべて" && !candidate.interviewRecords.some((record) => record.interviewers.includes(interviewerFilter))) return false;
      return true;
    });
  }, [activeCandidates, customEnd, customStart, dateRange, interviewerFilter, positionFilter, sourceFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const map = Object.fromEntries(ALL_STATUSES.map((status) => [status, 0])) as Record<CandidateStatus, number>;
    for (const candidate of filteredCandidates) map[candidate.status]++;
    return map;
  }, [filteredCandidates]);

  const totalApplied = filteredCandidates.length || 1;
  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of FUNNEL_STAGES) {
      counts[stage] = filteredCandidates.filter((candidate) => FUNNEL_STAGES.indexOf(candidate.status) >= FUNNEL_STAGES.indexOf(stage)).length;
    }
    return counts;
  }, [filteredCandidates]);

  const durationStats = useMemo(() => buildDurationStats(filteredCandidates), [filteredCandidates]);
  const sourceStats = useMemo(() => buildSourceStats(filteredCandidates), [filteredCandidates]);
  const positionStats = useMemo(() => buildPositionStats(filteredCandidates), [filteredCandidates]);
  const interviewerStats = useMemo(() => buildInterviewerStats(filteredCandidates, interviewers), [filteredCandidates, interviewers]);
  const stageStats = useMemo(() => buildStageStats(filteredCandidates), [filteredCandidates]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(filteredCandidates), [filteredCandidates]);
  const staleCandidates = useMemo(() => buildStaleCandidates(filteredCandidates, sortKey), [filteredCandidates, sortKey]);
  const insightItems = useMemo(
    () => buildInsights(filteredCandidates, durationStats, sourceStats, stageStats),
    [durationStats, filteredCandidates, sourceStats, stageStats]
  );

  const goalProgress = useMemo(() => {
    return hireGoals.map((goal) => {
      const offered = filteredCandidates.filter((candidate) => candidate.status === "内定" && candidate.position === goal.position).length;
      return { ...goal, offered };
    });
  }, [hireGoals, filteredCandidates]);

  const summaryCards = [
    { label: "応募者総数", value: filteredCandidates.length, unit: "名", text: "text-blue-600" },
    { label: "選考中", value: filteredCandidates.filter((candidate) => ACTIVE_STATUSES.includes(candidate.status)).length, unit: "名", text: "text-blue-600" },
    { label: "内定率", value: percent(statusCounts["内定"], filteredCandidates.length), unit: "%", text: "text-blue-700" },
    { label: "平均選考期間", value: durationStats.avgDays ?? "-", unit: durationStats.avgDays != null ? "日" : "", text: "text-slate-700" },
    { label: "初回面接まで", value: durationStats.avgFirstInterviewDays ?? "-", unit: durationStats.avgFirstInterviewDays != null ? "日" : "", text: "text-blue-600" },
    { label: "評価未完了", value: durationStats.pendingEvaluations, unit: "件", text: "text-slate-700" },
  ];

  // 起動時にキャッシュ読み込み
  useEffect(() => {
    const cached = loadCachedInsights();
    if (cached) {
      setAiInsights(cached.insights);
      setAiCachedAt(cached.cachedAt);
    }
  }, []);

  const fetchAiInsights = useCallback(async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const stats = {
        totalCandidates: filteredCandidates.length,
        statusCounts,
        sourceStats,
        stageStats,
        durationStats,
        hireGoals,
      };
      const res = await authFetch("/api/recruitment-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json() as { insights: string[] };
      setAiInsights(data.insights);
      setAiCachedAt(Date.now());
      saveCachedInsights(data.insights);
    } catch {
      setAiError("分析の取得に失敗しました。再試行してください。");
    } finally {
      setAiLoading(false);
    }
  }, [filteredCandidates.length, statusCounts, sourceStats, stageStats, durationStats, hireGoals]);

  function saveGoals() {
    setHireGoals(goalDraft);
    setEditingGoals(false);
  }

  function resetFilters() {
    setDateRange("all");
    setCustomStart("");
    setCustomEnd("");
    setPositionFilter("すべて");
    setSourceFilter("すべて");
    setStatusFilter("すべて");
    setInterviewerFilter("すべて");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">採用分析</h1>
          <p className="mt-0.5 text-sm text-slate-500">条件で絞り込みながら、選考状況・歩留まり・停滞ポイントを確認できます。</p>
        </div>
        <button
          onClick={resetFilters}
          aria-label="条件をリセット"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
        >
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">条件をリセット</span>
        </button>
      </div>

      <Card title="分析条件">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select label="期間" value={dateRange} onChange={(value) => setDateRange(value as DateRange)} options={[
            { label: "全期間", value: "all" },
            { label: "直近30日", value: "30d" },
            { label: "直近90日", value: "90d" },
            { label: "今月", value: "thisMonth" },
            { label: "カスタム", value: "custom" },
          ]} />
          <Select label="職種" value={positionFilter} onChange={setPositionFilter} options={[{ label: "すべて", value: "すべて" }, ...positionOptions.map((position) => ({ label: position, value: position }))]} />
          <Select label="応募ソース" value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} />
          <Select label="ステータス" value={statusFilter} onChange={setStatusFilter} options={[{ label: "すべて", value: "すべて" }, ...ALL_STATUSES.map((status) => ({ label: status, value: status }))]} />
          <Select label="面接官" value={interviewerFilter} onChange={setInterviewerFilter} options={[{ label: "すべて", value: "すべて" }, ...interviewers.map((interviewer) => ({ label: interviewer, value: interviewer }))]} />
          <Select label="停滞候補の並び順" value={sortKey} onChange={(value) => setSortKey(value as SortKey)} options={[
            { label: "停滞日数", value: "stale" },
            { label: "応募日", value: "applied" },
            { label: "更新日", value: "updated" },
          ]} />
        </div>
        {dateRange === "custom" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DateInput label="開始日" value={customStart} onChange={setCustomStart} />
            <DateInput label="終了日" value={customEnd} onChange={setCustomEnd} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 tabular-nums text-3xl font-semibold ${card.text}`}>
              {card.value}
              {card.unit && <span className="ml-1 text-sm font-normal text-slate-400">{card.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <Card
        title="AI分析"
        action={
          <div className="flex items-center gap-3">
            {aiCachedAt && (
              <span className="text-xs text-slate-400">
                {new Date(aiCachedAt).toLocaleDateString("ja-JP")} 生成
              </span>
            )}
            <button
              onClick={fetchAiInsights}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {aiLoading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  分析中…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {aiInsights.length > 0 ? "再分析" : "AI分析を実行"}
                </>
              )}
            </button>
          </div>
        }
      >
        {aiLoading && aiInsights.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            AIが採用データを分析しています…
          </div>
        ) : aiError ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{aiError}</div>
        ) : aiInsights.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {aiInsights.map((item, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{i + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm text-slate-400">「AI分析を実行」で採用データのインサイトを生成します。<br />結果は1週間キャッシュされます。</p>
          </div>
        )}
      </Card>

      <Card title="選考ファネル">
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage, index) => {
            const count = funnelCounts[stage] ?? 0;
            const pct = Math.round((count / totalApplied) * 100);
            const prevCount = index > 0 ? (funnelCounts[FUNNEL_STAGES[index - 1]] || 1) : null;
            const conversionRate = prevCount ? Math.round((count / prevCount) * 100) : null;
            return (
              <BarRow
                key={stage}
                label={stage}
                valueLabel={`${count}名`}
                rightLabel={`${pct}%${conversionRate !== null ? ` (${conversionRate}%)` : ""}`}
                pct={pct}
                barClassName={STATUS_BAR_COLORS[stage]}
              />
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-400">括弧内は前ステージからの通過率です。</p>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="ステータス分布">
          <div className="space-y-2.5">
            {ALL_STATUSES.map((status) => {
              const count = statusCounts[status];
              const pct = filteredCandidates.length > 0 ? Math.round((count / filteredCandidates.length) * 100) : 0;
              return <BarRow key={status} label={status} valueLabel={`${count}名`} rightLabel={`${pct}%`} pct={pct} barClassName={STATUS_BAR_COLORS[status]} compact />;
            })}
          </div>
        </Card>

        <Card title="応募ソース別の質">
          {sourceStats.length === 0 ? <Empty text="応募ソースデータがありません。" /> : (
            <div className="space-y-3">
              {sourceStats.slice(0, 10).map((source) => (
                <div key={source.name} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-800">{source.name}</span>
                    <span className="text-xs text-slate-400">応募 {source.total}名 / 内定 {source.offered}名</span>
                  </div>
                  <BarRow label="内定率" valueLabel={`${source.offerRate}%`} rightLabel={`面接到達 ${source.interviewRate}%`} pct={source.offerRate} barClassName="bg-blue-500" compact />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="職種別応募・内定">
          {positionStats.length === 0 ? <Empty text="職種データがありません。" /> : (
            <div className="space-y-3">
              {positionStats.slice(0, 10).map((position) => (
                <div key={position.name} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{position.name}</span>
                  <span className="text-xs text-slate-400">応募 {position.total}名</span>
                  <span className="text-xs font-semibold text-blue-700">内定 {position.offered}名</span>
                  <span className="w-14 text-right text-xs text-slate-500">{position.offerRate}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="面接官別担当状況">
          {interviewerStats.length === 0 ? <Empty text="面接記録がありません。" /> : (
            <div className="space-y-4">
              {interviewerStats.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700" aria-hidden="true">
                    {item.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.total}件</p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={item.passRate} aria-valuemin={0} aria-valuemax={100} aria-label={`通過率 ${item.passRate}%`}>
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${item.passRate}%` }} />
                    </div>
                  </div>
                  <div className="w-16 flex-shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-700">{item.passRate}%</p>
                    <p className="text-[10px] text-slate-400">通過率</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="ステージ別ボトルネック">
          {stageStats.length === 0 ? <Empty text="面接記録がありません。" /> : (
            <div className="space-y-3">
              {stageStats.map((stage) => (
                <div key={stage.name} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">{stage.name}</span>
                    <span className="text-xs text-slate-400">{stage.total}件 / 通過率 {stage.passRate}%</span>
                  </div>
                  <BarRow label="保留・未判定" valueLabel={`${stage.pending}件`} rightLabel={`通過率 ${stage.passRate}%`} pct={percent(stage.pending, stage.total)} barClassName="bg-blue-400" compact />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="月別トレンド">
          {monthlyTrend.length === 0 ? <Empty text="応募データがありません。" /> : (
            <div className="space-y-2.5">
              {monthlyTrend.map((month) => (
                <BarRow key={month.month} label={month.month} valueLabel={`応募 ${month.applied}名`} rightLabel={`内定 ${month.offered}名`} pct={percent(month.applied, Math.max(...monthlyTrend.map((item) => item.applied), 1))} barClassName="bg-blue-500" compact />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="停滞・対応優先候補"
        action={null}
      >
        {staleCandidates.length === 0 ? <Empty text="対応が必要な候補者はありません。" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2">候補者</th>
                  <th className="whitespace-nowrap px-3 py-2">職種</th>
                  <th className="whitespace-nowrap px-3 py-2">ステータス</th>
                  <th className="whitespace-nowrap px-3 py-2">最終更新</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">停滞</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staleCandidates.slice(0, 8).map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{candidate.name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{candidate.position}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{candidate.status}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{candidate.updatedAt}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-700">{candidate.staleDays}日</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">採用目標</h2>
          <button
            onClick={() => {
              setGoalDraft(hireGoals.length > 0 ? hireGoals : [{ position: positionOptions[0] ?? "", target: 1 }]);
              setEditingGoals(!editingGoals);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          >
            {editingGoals ? "キャンセル" : "目標を設定"}
          </button>
        </div>
        <div className="p-6">
          {editingGoals ? (
            <div className="space-y-3">
              {goalDraft.map((goal, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select value={goal.position} onChange={(event) => setGoalDraft((draft) => draft.map((item, idx) => idx === index ? { ...item, position: event.target.value } : item))} className="w-full appearance-none rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" aria-label={`職種 ${index + 1}`}>
                      {positionOptions.map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative w-24">
                    <input type="number" min={1} max={100} value={goal.target} onChange={(event) => setGoalDraft((draft) => draft.map((item, idx) => idx === index ? { ...item, target: Number(event.target.value) } : item))} aria-label={`目標人数 ${index + 1}`} className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-7 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true">名</span>
                  </div>
                  <button onClick={() => setGoalDraft((draft) => draft.filter((_, idx) => idx !== index))} aria-label={`目標 ${index + 1} を削除`} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setGoalDraft((draft) => [...draft, { position: positionOptions[0] ?? "", target: 1 }])} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1">
                  + 目標を追加
                </button>
                <button onClick={saveGoals} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1">
                  保存
                </button>
              </div>
            </div>
          ) : goalProgress.length === 0 ? (
            <p className="text-sm text-slate-400">採用目標が設定されていません。</p>
          ) : (
            <div className="space-y-5">
              {goalProgress.map((goal) => {
                const progress = Math.min(100, Math.round((goal.offered / goal.target) * 100));
                return (
                  <div key={goal.position}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{goal.position}</span>
                      <span className={`tabular-nums text-sm font-semibold ${progress >= 100 ? "text-blue-700" : "text-blue-600"}`}>
                        {goal.offered} / {goal.target}名 <span className="text-xs font-normal text-slate-400">({progress}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.position}: ${progress}%`}>
                      <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-blue-700" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function BarRow({ label, valueLabel, rightLabel, pct, barClassName, compact = false }: { label: string; valueLabel: string; rightLabel: string; pct: number; barClassName: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${compact ? "w-16 sm:w-20" : "w-16 sm:w-24"} flex-shrink-0 truncate text-right text-xs font-medium text-slate-500`}>{label}</span>
      {!compact && (
        <span className="w-8 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">{valueLabel}</span>
      )}
      <div className={`${compact ? "h-4" : "h-5"} flex-1 overflow-hidden rounded bg-slate-100`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${valueLabel}`}>
        <div className={`h-full ${barClassName} transition-all`} style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
      </div>
      <span className="w-20 flex-shrink-0 truncate text-right text-xs text-slate-400 sm:w-28">{rightLabel}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>;
}

function resolveDateRange(range: DateRange, customStart: string, customEnd: string) {
  const today = startOfDay(new Date());
  if (range === "all") return { start: null as Date | null, end: null as Date | null };
  if (range === "30d") return { start: addDays(today, -30), end: today };
  if (range === "90d") return { start: addDays(today, -90), end: today };
  if (range === "thisMonth") return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
  return {
    start: customStart ? parseDate(customStart) : null,
    end: customEnd ? parseDate(customEnd) : null,
  };
}

function buildDurationStats(candidates: Candidate[]) {
  const terminal = candidates.filter((candidate) => TERMINAL_STATUSES.includes(candidate.status));
  const avgDays = average(terminal.map((candidate) => daysBetween(candidate.appliedAt, candidate.updatedAt.slice(0, 10))).filter((day) => day >= 0));
  const firstInterviewDays = candidates
    .map((candidate) => {
      const first = [...candidate.interviewRecords].sort((a, b) => a.date.localeCompare(b.date))[0];
      return first ? daysBetween(candidate.appliedAt, first.date) : null;
    })
    .filter((value): value is number => value !== null && value >= 0);
  const pendingEvaluations = candidates.reduce((sum, candidate) => {
    return sum + candidate.interviewRecords.filter((record) => record.result === null || !record.decisionReason).length;
  }, 0);

  return {
    avgDays,
    avgFirstInterviewDays: average(firstInterviewDays),
    pendingEvaluations,
  };
}

function buildSourceStats(candidates: Candidate[]) {
  const map = new Map<string, { name: string; total: number; offered: number; interviewed: number }>();
  for (const candidate of candidates) {
    const name = candidate.source || "不明";
    const item = map.get(name) ?? { name, total: 0, offered: 0, interviewed: 0 };
    item.total++;
    if (candidate.status === "内定") item.offered++;
    if (candidate.interviewRecords.length > 0 || ["一次面接", "最終面接", "内定"].includes(candidate.status)) item.interviewed++;
    map.set(name, item);
  }
  return Array.from(map.values())
    .map((item) => ({ ...item, offerRate: percent(item.offered, item.total), interviewRate: percent(item.interviewed, item.total) }))
    .sort((a, b) => b.total - a.total);
}

function buildPositionStats(candidates: Candidate[]) {
  const map = new Map<string, { name: string; total: number; offered: number }>();
  for (const candidate of candidates) {
    const item = map.get(candidate.position) ?? { name: candidate.position, total: 0, offered: 0 };
    item.total++;
    if (candidate.status === "内定") item.offered++;
    map.set(candidate.position, item);
  }
  return Array.from(map.values())
    .map((item) => ({ ...item, offerRate: percent(item.offered, item.total) }))
    .sort((a, b) => b.total - a.total);
}

function buildInterviewerStats(candidates: Candidate[], interviewers: string[]) {
  const stats = new Map<string, { name: string; passed: number; total: number }>();
  for (const interviewer of interviewers) stats.set(interviewer, { name: interviewer, passed: 0, total: 0 });
  for (const candidate of candidates) {
    for (const record of candidate.interviewRecords) {
      for (const interviewer of record.interviewers) {
        const item = stats.get(interviewer) ?? { name: interviewer, passed: 0, total: 0 };
        item.total++;
        if (record.result === "通過") item.passed++;
        stats.set(interviewer, item);
      }
    }
  }
  return Array.from(stats.values())
    .filter((item) => item.total > 0)
    .map((item) => ({ ...item, passRate: percent(item.passed, item.total) }))
    .sort((a, b) => b.total - a.total);
}

function buildStageStats(candidates: Candidate[]) {
  const stats = new Map<string, { name: string; total: number; passed: number; pending: number }>();
  for (const candidate of candidates) {
    for (const record of candidate.interviewRecords) {
      const item = stats.get(record.stageName) ?? { name: record.stageName, total: 0, passed: 0, pending: 0 };
      item.total++;
      if (record.result === "通過") item.passed++;
      if (record.result === null || record.result === "保留") item.pending++;
      stats.set(record.stageName, item);
    }
  }
  return Array.from(stats.values())
    .map((item) => ({ ...item, passRate: percent(item.passed, item.total) }))
    .sort((a, b) => b.pending - a.pending || b.total - a.total);
}

function buildMonthlyTrend(candidates: Candidate[]) {
  const map = new Map<string, { month: string; applied: number; offered: number }>();
  for (const candidate of candidates) {
    const month = candidate.appliedAt.slice(0, 7);
    const item = map.get(month) ?? { month, applied: 0, offered: 0 };
    item.applied++;
    if (candidate.status === "内定") item.offered++;
    map.set(month, item);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

function buildStaleCandidates(candidates: Candidate[], sortKey: SortKey) {
  const today = startOfDay(new Date());
  return candidates
    .filter((candidate) => ACTIVE_STATUSES.includes(candidate.status))
    .map((candidate) => ({ ...candidate, staleDays: Math.max(0, Math.round((today.getTime() - parseDate(candidate.updatedAt.slice(0, 10)).getTime()) / 86400000)) }))
    .sort((a, b) => {
      if (sortKey === "applied") return a.appliedAt.localeCompare(b.appliedAt);
      if (sortKey === "updated") return a.updatedAt.localeCompare(b.updatedAt);
      return b.staleDays - a.staleDays;
    });
}

function buildInsights(candidates: Candidate[], durationStats: ReturnType<typeof buildDurationStats>, sourceStats: ReturnType<typeof buildSourceStats>, stageStats: ReturnType<typeof buildStageStats>) {
  const insights: string[] = [];
  const topSource = sourceStats[0];
  const bestSource = [...sourceStats].filter((item) => item.total >= 2).sort((a, b) => b.offerRate - a.offerRate)[0];
  const bottleneck = stageStats[0];

  if (topSource) insights.push(`応募数が最も多い流入元は「${topSource.name}」で${topSource.total}名です。内定率は${topSource.offerRate}%です。`);
  if (bestSource && bestSource.offerRate > 0) insights.push(`内定率が高い流入元は「${bestSource.name}」で${bestSource.offerRate}%です。応募数の拡大余地を確認してください。`);
  if (bottleneck && bottleneck.pending > 0) insights.push(`停滞しやすいステージは「${bottleneck.name}」です。保留・未判定が${bottleneck.pending}件あります。`);
  if (durationStats.avgFirstInterviewDays != null && durationStats.avgFirstInterviewDays > 7) insights.push(`応募から初回面接まで平均${durationStats.avgFirstInterviewDays}日です。日程調整の短縮余地があります。`);
  if (candidates.length === 0) insights.push("条件に一致する候補者がいません。フィルター条件を広げて確認してください。");
  return insights.slice(0, 3);
}

function parseDate(value: string) {
  return startOfDay(new Date(value));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start: string, end: string) {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
