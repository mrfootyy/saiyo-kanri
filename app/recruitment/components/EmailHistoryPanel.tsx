"use client";

import { EmailHistory } from "../types";

type Props = {
  histories: EmailHistory[];
  fullPage?: boolean;
};

export default function EmailHistoryPanel({ histories, fullPage }: Props) {
  const sorted = [...histories].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500">
          <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-700">メール履歴</h3>
        <span className="ml-auto text-xs text-gray-400">{sorted.length}件</span>
      </div>
      <div className={`divide-y divide-gray-50 overflow-y-auto ${fullPage ? "" : "max-h-72"}`}>
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400">
            メール履歴がありません。
          </p>
        ) : (
          sorted.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.direction === "送信"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {e.direction}
                </span>
                <span className="text-xs text-gray-400">{e.sentAt}</span>
              </div>
              <p className="text-xs font-medium text-gray-700">{e.subject}</p>
              <p className="mt-0.5 text-xs text-gray-500">{e.summary}</p>
              <p className="mt-0.5 text-xs text-gray-400">対象: {e.candidateName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
