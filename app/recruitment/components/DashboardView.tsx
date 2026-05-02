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

  const allTasks = getAllTasks(candidates, interviewStages, emailHistories);
  const tasks = allTasks.slice(0, 5);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-slate-500">採用状況の概要を確認できます。</p>
      </div>

      <SummaryCards candidates={candidates} />

      {tasks.length > 0 && (
        <section aria-labelledby="tasks-heading" className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 id="tasks-heading" className="text-sm font-semibold text-blue-900">対応が必要なタスク</h2>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white" aria-live="polite">
                {allTasks.length}
              </span>
            </div>
            <Link
              href="/recruitment/candidates"
              className="rounded text-xs font-medium text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              一覧で見る
            </Link>
          </div>
          <ul className="divide-y divide-blue-100">
            {tasks.map((task) => (
              <li key={`${task.candidateId}-${task.kind}-${task.stageId || task.stageName}`}>
                <Link
                  href={
                    task.kind === "reply"
                      ? `/recruitment/candidates/${task.candidateId}`
                      : `/recruitment/candidates/${task.candidateId}/stages/${task.stageId}`
                  }
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">{task.candidateName}</span>さんの{task.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-blue-700/70">{task.detail}</p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      task.severity === "overdue"
                        ? "bg-slate-200 text-slate-700"
                        : task.severity === "due_soon"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-white text-blue-600"
                    }`}
                  >
                    {task.dueLabel}
                  </span>
                  <svg className="h-4 w-4 flex-shrink-0 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <InterviewCalendar candidates={candidates} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="slack-heading" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
              </svg>
              <h3 id="slack-heading" className="text-sm font-semibold text-slate-700">Slack通知</h3>
            </div>
            <Link
              href="/recruitment/slack"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
            >
              すべて見る
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentSlack.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-slate-400">通知がありません。</li>
            ) : (
              recentSlack.map((n) => (
                <li key={n.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{n.channel}</span>
                    <span className="text-xs text-slate-400">{n.sentAt}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-slate-700">{n.message}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="email-heading" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 id="email-heading" className="text-sm font-semibold text-slate-700">メール</h3>
            </div>
            <Link
              href="/recruitment/email"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
            >
              すべて見る
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentEmail.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-slate-400">メールがありません。</li>
            ) : (
              recentEmail.map((e) => (
                <li key={e.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${e.direction === "送信" ? "text-blue-600" : "text-slate-600"}`}>
                      {e.direction}
                    </span>
                    <span className="text-xs text-slate-400">{e.sentAt}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm font-medium text-slate-700">{e.subject}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{e.candidateName}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
