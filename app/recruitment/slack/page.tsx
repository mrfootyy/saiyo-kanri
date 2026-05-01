"use client";

import Link from "next/link";
import { useRecruitment } from "../context";
import SlackHistoryPanel from "../components/SlackHistoryPanel";

export default function SlackPage() {
  const { slackNotifications, slackChannelConfig } = useRecruitment();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Slack通知履歴</h1>
          <p className="mt-0.5 text-sm text-slate-500">ステータス変更・面接官登録時に記録された通知の一覧です。</p>
        </div>
        <Link
          href="/recruitment/settings#slack"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          通知先を設定
        </Link>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm" aria-label="現在のSlack通知先">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "ステータス変更", value: slackChannelConfig.statusChange },
            { label: "面接官アサイン", value: slackChannelConfig.interviewAssign },
            { label: "合否決定", value: slackChannelConfig.offerDecision },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{item.value || "未設定"}</p>
            </div>
          ))}
        </div>
      </section>
      <SlackHistoryPanel notifications={slackNotifications} fullPage />
    </div>
  );
}
