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
  stageId?: string;
};

type Props = {
  candidates: Candidate[];
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const CALENDAR_CELL_COUNT = 42;
const RIGHT_PANEL_EVENT_SLOTS = 5;

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function InterviewCalendar({ candidates }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

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
          stageId: record.stageId,
        });
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [candidates]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, InterviewEvent[]>();
    for (const ev of allEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [allEvents]);

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

  const rightPanelDate = selectedDate;
  const rightPanelEvents = rightPanelDate ? selectedEvents : upcomingEvents;
  const hiddenEventCount = rightPanelDate ? 0 : Math.max(0, allEvents.filter((e) => e.date >= todayStr).length - upcomingEvents.length);
  const rightPanelTitle = rightPanelDate
    ? `${rightPanelDate.replace(/-/g, "/")} の面接`
    : "直近の面接予定者";

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-700">面接カレンダー</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            aria-label="前の月"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-700">
            {year}年{month + 1}月
          </span>
          <button
            onClick={nextMonth}
            aria-label="次の月"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid min-h-[460px] grid-cols-1 divide-y divide-slate-100 lg:grid-cols-[minmax(0,1fr)_360px] lg:divide-x lg:divide-y-0">
        {/* カレンダーグリッド */}
        <div className="p-6">
          <div className="mb-3 grid grid-cols-7">
            {DOW.map((d, i) => (
              <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 6 ? "text-blue-500" : "text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: CALENDAR_CELL_COUNT }, (_, cellIndex) => {
              const day = cellIndex - firstDayOfWeek + 1;
              const isOutsideMonth = day < 1 || day > daysInMonth;

              if (isOutsideMonth) {
                return <div key={`empty-${cellIndex}`} className="h-14 min-w-0 rounded-xl" aria-hidden="true" />;
              }

              const dateStr = toDateStr(year, month, day);
              const events = eventsByDate.get(dateStr) ?? [];
              const hasEvents = events.length > 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dow = cellIndex % 7;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  aria-label={`${year}年${month + 1}月${day}日${hasEvents ? `、面接${events.length}件` : ""}`}
                  aria-pressed={isSelected}
                  className={`relative flex h-14 min-w-0 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : isToday
                        ? "bg-blue-50 font-bold text-blue-700"
                        : dow === 0
                          ? "text-slate-400 hover:bg-slate-100"
                          : dow === 6
                            ? "text-blue-400 hover:bg-blue-50"
                            : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  <span className="mt-1.5 flex h-4 w-4 items-center justify-center">
                    {hasEvents && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} aria-hidden="true" />
                    )}
                  </span>
                  {hasEvents && events.length > 1 && !isSelected && (
                    <span
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {events.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 直近の面接 / 選択日の面接 */}
        <div className="flex flex-col">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-700">{rightPanelTitle}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {rightPanelDate ? "選択した日の予定です" : "今日以降の予定を表示しています"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-slate-50">
              {Array.from({ length: RIGHT_PANEL_EVENT_SLOTS }, (_, slotIndex) => {
                const ev = rightPanelEvents[slotIndex];

                if (!ev) {
                  return (
                    <div key={`empty-slot-${slotIndex}`} className="flex h-[74px] items-center px-5">
                      {slotIndex === 0 && rightPanelEvents.length === 0 ? (
                        <p className="text-sm text-slate-400">予定はありません。</p>
                      ) : (
                        <span className="sr-only">予定なし</span>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={ev.recordId}
                    href={ev.stageId ? `/recruitment/candidates/${ev.candidateId}/stages/${ev.stageId}` : `/recruitment/candidates/${ev.candidateId}`}
                    className="flex h-[74px] items-center gap-3 px-5 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                  >
                    <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      {!rightPanelDate && (
                        <p className="text-xs font-medium text-slate-400">{ev.date.replace(/-/g, "/")}</p>
                      )}
                      <p className="truncate text-sm font-semibold text-slate-900">{ev.candidateName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{ev.stageName}{ev.time ? ` · ${ev.time}` : ""}</p>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
              {hiddenEventCount > 0 && (
                <p className="px-5 py-3 text-xs font-medium text-slate-400">
                  ほか {hiddenEventCount} 件の予定があります
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
