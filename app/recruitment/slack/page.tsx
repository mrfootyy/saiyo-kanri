"use client";

import Link from "next/link";
import { useRecruitment } from "../context";
import SlackHistoryPanel from "../components/SlackHistoryPanel";

export default function SlackPage() {
  const { slackNotifications, clearSlackNotifications } = useRecruitment();
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
      <SlackHistoryPanel
        notifications={slackNotifications}
        fullPage
        onClearNotifications={clearSlackNotifications}
      />
    </div>
  );
}
