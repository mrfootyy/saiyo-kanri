"use client";

import { useRecruitment } from "../context";
import SlackHistoryPanel from "../components/SlackHistoryPanel";

export default function SlackPage() {
  const { slackNotifications } = useRecruitment();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Slack通知履歴</h1>
        <p className="mt-0.5 text-sm text-slate-500">ステータス変更・面接官登録時に記録された擬似通知の一覧です。</p>
      </div>
      <SlackHistoryPanel notifications={slackNotifications} fullPage />
    </div>
  );
}
