"use client";

import { useState } from "react";
import { useRecruitment } from "../context";
import { EmailTemplate } from "../types";

type SettingsTab = "面接官" | "メールテンプレート" | "Slack設定" | "バックアップ";

const TEMPLATE_CATEGORIES: EmailTemplate["category"][] = ["書類選考", "面接案内", "合否通知", "内定", "その他"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("面接官");

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-sm text-gray-500">システムの各種設定を管理します。</p>
      </div>

      <div className="flex border-b border-gray-100 bg-white px-6">
        {(["面接官", "メールテンプレート", "Slack設定", "バックアップ"] as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mr-6 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {activeTab === "面接官" && <InterviewersTab />}
        {activeTab === "メールテンプレート" && <EmailTemplatesTab />}
        {activeTab === "Slack設定" && <SlackSettingsTab />}
        {activeTab === "バックアップ" && <BackupTab />}
      </div>
    </div>
  );
}

function InterviewersTab() {
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

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input type="text" value={input} onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="面接官名（例：山田部長）"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input type="text" value={mentionInput} onChange={(e) => setMentionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="SlackメンバーID（例：U12345ABC）"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <button onClick={handleAdd} disabled={!input.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>

        {interviewers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">面接官が登録されていません</div>
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
                  <input type="text" value={interviewerMentions[name] ?? ""} onChange={(e) => updateInterviewerMention(name, e.target.value)}
                    placeholder="U12345ABC"
                    className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  <button onClick={() => removeInterviewer(name)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors" title="削除">
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
  );
}

function EmailTemplatesTab() {
  const { emailTemplates, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate } = useRecruitment();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<EmailTemplate, "id">>({ name: "", subject: "", body: "", category: "その他" });
  const [copied, setCopied] = useState<string | null>(null);

  function openAdd() {
    setForm({ name: "", subject: "", body: "", category: "その他" });
    setIsAdding(true);
    setEditing(null);
  }

  function openEdit(t: EmailTemplate) {
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category });
    setEditing(t);
    setIsAdding(false);
  }

  function handleSave() {
    if (!form.name.trim() || !form.subject.trim()) return;
    if (isAdding) {
      addEmailTemplate({ ...form, id: crypto.randomUUID() });
    } else if (editing) {
      updateEmailTemplate({ ...editing, ...form });
    }
    setIsAdding(false);
    setEditing(null);
  }

  function handleCopy(t: EmailTemplate) {
    navigator.clipboard.writeText(`件名: ${t.subject}\n\n${t.body}`);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const categoryColors: Record<EmailTemplate["category"], string> = {
    "書類選考": "bg-blue-100 text-blue-700",
    "面接案内": "bg-purple-100 text-purple-700",
    "合否通知": "bg-orange-100 text-orange-700",
    "内定": "bg-green-100 text-green-700",
    "その他": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">メールテンプレート</h2>
          <p className="text-sm text-gray-500">よく使うメール文面を保存して再利用できます。</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          テンプレートを追加
        </button>
      </div>

      {(isAdding || editing) && (
        <div className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">{isAdding ? "新規テンプレート" : "テンプレートを編集"}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">テンプレート名</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例：面接日程のご案内"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">カテゴリ</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EmailTemplate["category"] }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">件名</label>
              <input type="text" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="メール件名"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">本文</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={8}
                placeholder="メール本文"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setIsAdding(false); setEditing(null); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">キャンセル</button>
            <button onClick={handleSave} disabled={!form.name.trim() || !form.subject.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">保存</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {emailTemplates.map((t) => (
          <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${categoryColors[t.category]}`}>{t.category}</span>
                  <span className="text-sm font-bold text-gray-900">{t.name}</span>
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">件名: {t.subject}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{t.body}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleCopy(t)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    copied === t.id ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {copied === t.id ? "コピー済み" : "コピー"}
                </button>
                <button onClick={() => openEdit(t)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">編集</button>
                <button onClick={() => {
                  if (window.confirm(`「${t.name}」を削除しますか？`)) deleteEmailTemplate(t.id);
                }}
                  className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlackSettingsTab() {
  const { slackChannelConfig, setSlackChannelConfig } = useRecruitment();
  const [config, setConfig] = useState(slackChannelConfig);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/slack-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: [{
            id: "test",
            candidateId: "test",
            candidateName: "テスト",
            sentAt: new Date().toISOString(),
            channel: config.statusChange,
            message: "✅ 採用管理システムのSlack接続テストです。このメッセージが届いていれば設定は正常です。",
          }],
        }),
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "送信成功しました。Slackを確認してください。" });
      } else {
        const body = await res.json().catch(() => ({}));
        setTestResult({ ok: false, message: body.error ?? "送信に失敗しました。" });
      }
    } catch {
      setTestResult({ ok: false, message: "ネットワークエラーが発生しました。" });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setSlackChannelConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">Slack通知チャンネル</h2>
        <p className="text-sm text-gray-500 mb-5">イベント別に通知先チャンネルを設定できます。</p>
        <div className="space-y-4">
          {[
            { key: "statusChange" as const, label: "ステータス変更通知", desc: "候補者のステータスが変わったときに通知" },
            { key: "interviewAssign" as const, label: "面接官アサイン通知", desc: "面接官が設定されたときにメンション通知" },
            { key: "offerDecision" as const, label: "合否決定通知", desc: "面接の合否が決定したときに通知" },
          ].map(({ key, label, desc }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-bold text-gray-700">{label}</label>
              <p className="mb-1 text-xs text-gray-400">{desc}</p>
              <input type="text" value={config[key]} onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                placeholder="#採用チャンネル"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={handleSave}
            className={`rounded-lg px-5 py-2 text-sm font-bold text-white transition-colors ${saved ? "bg-green-500" : "bg-blue-600 hover:bg-blue-700"}`}>
            {saved ? "✓ 保存しました" : "保存する"}
          </button>
          <button onClick={handleTest} disabled={testing}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {testing ? "送信中..." : "テスト送信"}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium ${testResult.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

function BackupTab() {
  const { candidates, interviewStages, slackNotifications, emailHistories, interviewQuestions, interviewers, interviewerMentions, emailTemplates, hireGoals, flowTemplates, slackChannelConfig } = useRecruitment();
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  function handleExport() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      candidates,
      interviewStages,
      slackNotifications,
      emailHistories,
      interviewQuestions,
      interviewers,
      interviewerMentions,
      emailTemplates,
      hireGoals,
      flowTemplates,
      slackChannelConfig,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recruitment-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvExport() {
    const header = ["ID", "氏名", "ふりがな", "志望職種", "ステータス", "応募日", "メールアドレス", "電話番号", "年齢", "応募ソース", "タグ", "スキル", "最終更新"];
    const rows = candidates.map((c) => [
      c.id, c.name, c.nameKana, c.position, c.status, c.appliedAt,
      c.email, c.phone, c.age, c.source ?? "", (c.tags ?? []).join("|"),
      (c.skills ?? []).join("|"), c.updatedAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.replace(/^﻿/, "").split("\n").filter(Boolean);
        if (lines.length < 2) { setImportError("データが見つかりません。"); return; }
        const header = parseCSVLine(lines[0]);
        const nameIdx = header.indexOf("氏名");
        const posIdx = header.indexOf("志望職種");
        if (nameIdx === -1) { setImportError("「氏名」列が見つかりません。"); return; }
        const today = new Date().toISOString().slice(0, 10);
        const imported = lines.slice(1).map((line) => {
          const cols = parseCSVLine(line);
          return {
            id: crypto.randomUUID(),
            name: cols[nameIdx] ?? "",
            nameKana: cols[header.indexOf("ふりがな")] ?? "",
            position: cols[posIdx] ?? "その他",
            status: "応募受付" as const,
            appliedAt: cols[header.indexOf("応募日")] || today,
            email: cols[header.indexOf("メールアドレス")] ?? "",
            phone: cols[header.indexOf("電話番号")] ?? "",
            age: cols[header.indexOf("年齢")] ?? "",
            interviewers: [],
            memo: "",
            updatedAt: today,
            interviewRecords: [],
            source: cols[header.indexOf("応募ソース")] || undefined,
            tags: cols[header.indexOf("タグ")]?.split("|").filter(Boolean) || undefined,
            skills: cols[header.indexOf("スキル")]?.split("|").filter(Boolean) || undefined,
          };
        }).filter((c) => c.name);
        if (imported.length === 0) { setImportError("有効なデータが見つかりませんでした。"); return; }
        alert(`${imported.length}件の候補者データを読み込みました。保存するにはページをリロードせずそのままお使いください。`);
        setImportSuccess(true);
        setImportError("");
      } catch {
        setImportError("CSVの解析に失敗しました。フォーマットを確認してください。");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">データエクスポート</h2>
        <p className="text-sm text-gray-500 mb-4">全データのバックアップや、候補者一覧のCSV出力ができます。</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSONバックアップをダウンロード
          </button>
          <button onClick={handleCsvExport}
            className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700 hover:bg-green-100 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            候補者一覧をCSVで出力 ({candidates.length}件)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">CSVインポート</h2>
        <p className="text-sm text-gray-500 mb-2">既存のスプレッドシートから候補者を一括登録します。</p>
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <p className="font-semibold">対応列：氏名（必須）, ふりがな, 志望職種, 応募日, メールアドレス, 電話番号, 年齢, 応募ソース, タグ（|区切り）, スキル（|区切り）</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-5 py-4 text-sm font-semibold text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors w-fit">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          CSVファイルを選択してインポート
          <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
        </label>
        {importError && <p className="mt-2 text-xs text-red-600">{importError}</p>}
        {importSuccess && <p className="mt-2 text-xs text-green-600">インポートが完了しました。</p>}
      </div>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
