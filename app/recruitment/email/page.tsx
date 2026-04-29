"use client";

import { useRecruitment } from "../context";
import EmailHistoryPanel from "../components/EmailHistoryPanel";

export default function EmailPage() {
  const { emailHistories } = useRecruitment();
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">メール履歴</h1>
        <p className="mt-0.5 text-sm text-gray-500">候補者とのメール送受信の擬似履歴です。</p>
      </div>
      <EmailHistoryPanel histories={emailHistories} fullPage />
    </div>
  );
}
