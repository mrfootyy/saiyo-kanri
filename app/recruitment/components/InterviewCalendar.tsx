"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Candidate } from "../types";

type InterviewEvent = {
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, InterviewEvent[]>();
    for (const candidate of candidates) {
      for (const record of candidate.interviewRecords) {
        if (!record.date) continue;
        const list = map.get(record.date) ?? [];
        list.push({
          candidateId: candidate.id,
          candidateName: candidate.name,
          stageName: record.stageName,
          recordId: record.id,
        });
        map.set(record.date, list);
      }
    }
    return map;
  }, [candidates]);

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

  const totalScheduled = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateStr(year, month, d);
      count += eventsByDate.get(ds)?.length ?? 0;
    }
    return count;
  }, [eventsByDate, year, month, daysInMonth]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-bold text-gray-700">面接カレンダー</h2>
          {totalScheduled > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {totalScheduled}件
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[6rem] text-center text-sm font-semibold text-gray-700">
            {year}年{month + 1}月
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 曜日ヘッダー */}
        <div className="mb-1 grid grid-cols-7">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`py-1 text-center text-xs font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
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
                className={`relative flex flex-col items-center rounded-lg py-1.5 text-xs transition-colors ${
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
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-blue-500"
                    }`}
                  />
                )}
                {hasEvents && !isSelected && events.length > 1 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                    {events.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 選択日の面接一覧 */}
        {selectedDate && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-gray-500">
              {selectedDate.replace(/-/g, "/")} の面接
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-gray-400">面接の予定はありません。</p>
            ) : (
              <div className="space-y-1.5">
                {selectedEvents.map((ev) => (
                  <Link
                    key={ev.recordId}
                    href={`/recruitment/candidates/${ev.candidateId}`}
                    className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 transition-colors hover:bg-blue-100"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-gray-800">{ev.candidateName}</span>
                    <span className="text-xs text-gray-500">{ev.stageName}</span>
                    <svg className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {totalScheduled === 0 && (
          <p className="mt-3 text-center text-xs text-gray-400">
            この月に面接の予定はありません。
          </p>
        )}
      </div>
    </div>
  );
}
