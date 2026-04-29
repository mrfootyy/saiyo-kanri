"use client";

import { useState } from "react";
import { useRecruitment } from "../context";

export default function SettingsPage() {
  const { interviewers, addInterviewer, removeInterviewer, interviewerMentions, updateInterviewerMention } = useRecruitment();
  const [input, setInput] = useState("");
  const [mentionInput, setMentionInput] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    if (interviewers.includes(name)) {
      setError("同じ名前がすでに登録されています。");
      return;
    }
    addInterviewer(name);
    if (mentionInput.trim()) updateInterviewerMention(name, mentionInput);
    setInput("");
    setMentionInput("");
    setError("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-sm text-gray-500">面接官の登録・管理を行います。</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">面接官</h2>
              <p className="mt-0.5 text-sm text-gray-500">登録した面接官は面接設定で選択できます。Slackメンションもここで設定します。</p>
              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Slackメンションの設定方法</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                  <li>Slackで該当メンバーのプロフィールを開く</li>
                  <li>「…」→「メンバーIDをコピー」を選択</li>
                  <li>コピーしたID（例: <code className="font-mono bg-blue-100 px-1 rounded">U12345ABC</code>）を下の欄に貼り付ける</li>
                </ol>
                <p className="text-blue-600 mt-1">入力値は自動で <code className="font-mono bg-blue-100 px-1 rounded">&lt;@U12345ABC&gt;</code> に変換されます。</p>
              </div>
            </div>

            {/* 追加フォーム */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="面接官名（例：山田部長）"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="text"
                  value={mentionInput}
                  onChange={(e) => setMentionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="SlackメンバーID（例：U12345ABC）"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={handleAdd}
                  disabled={!input.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  追加
                </button>
              </div>
              {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            </div>

            {/* 一覧 */}
            {interviewers.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                面接官が登録されていません
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {interviewers.map((name) => (
                  <li key={name} className="flex items-center justify-between gap-3 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {name[0]}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{name}</span>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {interviewerMentions[name]
                            ? `メンション: ${interviewerMentions[name].startsWith("<@") ? interviewerMentions[name] : `<@${interviewerMentions[name]}>`}`
                            : "メンションID未設定"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={interviewerMentions[name] ?? ""}
                        onChange={(e) => updateInterviewerMention(name, e.target.value)}
                        placeholder="U12345ABC"
                        className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        onClick={() => removeInterviewer(name)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="削除"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
