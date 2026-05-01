"use client";

import { useRecruitment } from "../context";
import EmailHistoryPanel from "../components/EmailHistoryPanel";

export default function EmailPage() {
  const { emailHistories } = useRecruitment();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">メール履歴</h1>
        <p className="mt-0.5 text-sm text-slate-500">候補者とのメール送受信の擬似履歴です。</p>
      </div>
      <EmailHistoryPanel histories={emailHistories} fullPage />
    </div>
  );
}
