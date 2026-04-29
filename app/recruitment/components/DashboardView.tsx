"use client";

import Link from "next/link";
import { Candidate, EmailHistory, InterviewStage, SlackNotification } from "../types";
import { getAllTasks } from "../taskUtils";
import SummaryCards from "./SummaryCards";
import InterviewCalendar from "./InterviewCalendar";

type Props = {
  candidates: Candidate[];
  slackNotifications: SlackNotification[];
  emailHistories: EmailHistory[];
  interviewStages: InterviewStage[];
};

export default function DashboardView({ candidates, slackNotifications, emailHistories, interviewStages }: Props) {
  const recentSlack = [...slackNotifications]
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, 5);

  const recentEmail = [...emailHistories]
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, 5);

  const tasks = getAllTasks(candidates, interviewStages, emailHistories);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-gray-600">採用状況の概要を確認できます。</p>
      </div>

      <SummaryCards candidates={candidates} />

      {/* タスク */}
      {tasks.length > 0 && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 shadow-sm">
          <div className="flex items-center justify-between border-b border-orange-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-orange-900">対応が必要なタスク</h2>
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{tasks.length}</span>
            </div>
            <Link href="/recruitment/candidates" className="text-xs font-semibold text-orange-700 hover:text-orange-900">
              一覧で見る →
            </Link>
          </div>
          <div className="divide-y divide-orange-100">
            {tasks.map((task) => (
              <Link
                key={`${task.candidateId}-${task.kind}-${task.stageId || task.stageName}`}
                href={
                  task.kind === "reply"
                    ? `/recruitment/candidates/${task.candidateId}`
                    : `/recruitment/candidates/${task.candidateId}/stages/${task.stageId}`
                }
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-orange-100 transition-colors"
              >
                <svg className="h-4 w-4 flex-shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-bold text-gray-900">{task.candidateName}</span>さんの{task.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-orange-800/70">{task.detail}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    task.severity === "overdue"
                      ? "bg-red-100 text-red-700"
                      : task.severity === "due_soon"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-white text-orange-700"
                  }`}
                >
                  {task.dueLabel}
                </span>
                <svg className="h-4 w-4 flex-shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 面接カレンダー */}
      <InterviewCalendar candidates={candidates} />

      {/* 通知・メール */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#4A154B]">
                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-700">Slack通知</h3>
            </div>
            <Link href="/recruitment/slack" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              すべて見る →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSlack.length === 0 ? (
              <p className="px-5 py-4 text-center text-sm text-gray-500">通知がありません。</p>
            ) : (
              recentSlack.map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4A154B]">{n.channel}</span>
                    <span className="text-xs text-gray-400">{n.sentAt}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-700 line-clamp-1">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-700">メール</h3>
            </div>
            <Link href="/recruitment/email" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              すべて見る →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentEmail.length === 0 ? (
              <p className="px-5 py-4 text-center text-sm text-gray-500">メールがありません。</p>
            ) : (
              recentEmail.map((e) => (
                <div key={e.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${e.direction === "送信" ? "text-blue-600" : "text-green-600"}`}>
                      {e.direction}
                    </span>
                    <span className="text-xs text-gray-400">{e.sentAt}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700 line-clamp-1">{e.subject}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{e.candidateName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
