"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Candidate } from "../types";

type InterviewEvent = {
  date: string;
  time?: string;
  candidateId: string;
  candidateName: string;
  stageName: string;
  recordId: string;
};

type Props = {
  candidates: Candidate[];
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function InterviewCalendar({ candidates }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // 全面接イベントをフラットに収集
  const allEvents = useMemo<InterviewEvent[]>(() => {
    const events: InterviewEvent[] = [];
    for (const candidate of candidates) {
      for (const record of candidate.interviewRecords) {
        if (!record.date) continue;
        events.push({
          date: record.date,
          time: record.time,
          candidateId: candidate.id,
          candidateName: candidate.name,
          stageName: record.stageName,
          recordId: record.id,
        });
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [candidates]);

  // 表示月のイベントを日付別にまとめる
  const eventsByDate = useMemo(() => {
    const map = new Map<string, InterviewEvent[]>();
    for (const ev of allEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [allEvents]);

  // 直近の面接（今日以降、最大5件）
  const upcomingEvents = useMemo(
    () => allEvents.filter((e) => e.date >= todayStr).slice(0, 5),
    [allEvents, todayStr]
  );

  const { daysInMonth, firstDayOfWeek } = useMemo(() => ({
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    firstDayOfWeek: new Date(year, month, 1).getDay(),
  }), [year, month]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  // 右パネルに表示するイベント（日付選択中ならその日、なければ直近）
  const rightPanelDate = selectedDate;
  const rightPanelEvents = rightPanelDate ? selectedEvents : upcomingEvents;
  const hiddenEventCount = rightPanelDate ? 0 : Math.max(0, allEvents.filter((e) => e.date >= todayStr).length - upcomingEvents.length);
  const rightPanelTitle = rightPanelDate
    ? `${rightPanelDate.replace(/-/g, "/")} の面接`
    : "直近の面接予定者";

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-bold text-gray-700">面接カレンダー</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-gray-700">{year}年{month + 1}月</span>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2カラム */}
      <div className="grid min-h-[460px] grid-cols-1 divide-y divide-gray-100 lg:grid-cols-[minmax(0,1.35fr)_320px] lg:divide-x lg:divide-y-0">
        {/* 左：カレンダーグリッド */}
        <div className="p-8">
          <div className="mb-3 grid grid-cols-7">
            {DOW.map((d, i) => (
              <div key={d} className={`py-2 text-center text-sm font-bold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-500" : "text-gray-400"}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e${i}`} className="min-h-16" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(year, month, day);
              const events = eventsByDate.get(dateStr) ?? [];
              const hasEvents = events.length > 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dow = (firstDayOfWeek + i) % 7;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`relative flex min-h-16 flex-col items-center justify-center rounded-xl text-base font-semibold transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white"
                    : isToday
                        ? "bg-blue-50 font-bold text-blue-700"
                        : dow === 0
                          ? "text-red-400 hover:bg-red-50"
                          : dow === 6
                            ? "text-blue-400 hover:bg-blue-50"
                            : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />
                  )}
                  {hasEvents && events.length > 1 && !isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-bold text-white">
                      {events.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 右：直近の面接 / 選択日の面接 */}
        <div className="flex flex-col">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-base font-bold text-gray-700">{rightPanelTitle}</p>
            <p className="mt-1 text-xs text-gray-400">
              {rightPanelDate ? "選択した日の予定です" : "今日以降の予定を表示しています"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanelEvents.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">予定はありません。</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {rightPanelEvents.map((ev) => (
                  <Link
                    key={ev.recordId}
                    href={`/recruitment/candidates/${ev.candidateId}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-blue-50"
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    <div className="min-w-0 flex-1">
                      {!rightPanelDate && (
                        <p className="text-xs font-medium text-gray-400">{ev.date.replace(/-/g, "/")}</p>
                      )}
                      <p className="truncate text-sm font-bold text-gray-900">{ev.candidateName}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{ev.stageName}{ev.time ? ` · ${ev.time}` : ""}</p>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                {hiddenEventCount > 0 && (
                  <p className="px-5 py-3 text-xs font-medium text-gray-400">
                    ほか {hiddenEventCount} 件の予定があります
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
