"use client";

import { SlackNotification } from "../types";

type Props = {
  notifications: SlackNotification[];
  fullPage?: boolean;
};

export default function SlackHistoryPanel({ notifications, fullPage }: Props) {
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#4A154B]">
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-700">Slack通知履歴</h3>
        <span className="ml-auto text-xs text-gray-400">{sorted.length}件</span>
      </div>
      <div className={`divide-y divide-gray-50 overflow-y-auto ${fullPage ? "" : "max-h-72"}`}>
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400">
            通知履歴がありません。
          </p>
        ) : (
          sorted.map((n) => (
            <div key={n.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#4A154B]">
                  {n.channel}
                </span>
                <span className="text-xs text-gray-400">{n.sentAt}</span>
              </div>
              <p className="text-xs text-gray-700">{n.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">対象: {n.candidateName}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
