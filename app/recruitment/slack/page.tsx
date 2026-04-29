"use client";

import { useRecruitment } from "../context";
import SlackHistoryPanel from "../components/SlackHistoryPanel";

export default function SlackPage() {
  const { slackNotifications } = useRecruitment();
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Slack通知履歴</h1>
        <p className="mt-0.5 text-sm text-gray-500">ステータス変更・面接官登録時に記録された擬似通知の一覧です。</p>
      </div>
      <SlackHistoryPanel notifications={slackNotifications} fullPage />
    </div>
  );
}
