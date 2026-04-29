"use client";

import { useState } from "react";
import { useRecruitment } from "../context";
import { Candidate } from "../types";
import { POSITION_OPTIONS } from "../constants";

type Props = {
  onClose: () => void;
};

export default function AddCandidateModal({ onClose }: Props) {
  const { addCandidate } = useRecruitment();

  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [position, setPosition] = useState<string>(POSITION_OPTIONS[0]);
  const [customPosition, setCustomPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!name.trim()) {
      setError("氏名は必須です。");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const finalPosition = position === "その他" ? customPosition.trim() || "その他" : position;

    const newCandidate: Candidate = {
      id: `c_${Date.now()}`,
      name: name.trim(),
      nameKana: nameKana.trim(),
      position: finalPosition,
      status: "応募受付",
      appliedAt: today,
      email: email.trim(),
      phone: phone.trim(),
      age: age.trim(),
      interviewers: [],
      memo: memo.trim(),
      updatedAt: today,
      interviewRecords: [],
    };

    addCandidate(newCandidate);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">応募者を登録</h2>
            <p className="mt-0.5 text-sm text-gray-500">新しい応募者の基本情報を入力してください</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* 氏名 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              氏名 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="例：山田 太郎"
              autoFocus
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="text"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              placeholder="ふりがな（例：やまだ たろう）"
              className="mt-1.5 w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 志望職種 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">志望職種</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {position === "その他" && (
              <input
                type="text"
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="職種を入力"
                className="mt-2 w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
          </div>

          {/* メール・電話 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">電話番号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-0000-0000"
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* 年齢 */}
          <div className="w-1/3">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">年齢</label>
            <div className="relative">
              <input
                type="number"
                min="15"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="28"
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-2.5 pr-10 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">歳</span>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="応募経路・特記事項など"
              className="w-full resize-none rounded-xl border-2 border-gray-300 px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
}
