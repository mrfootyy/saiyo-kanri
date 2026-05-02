"use client";

import { useState } from "react";
import { useRecruitment } from "../context";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  labelClassName?: string;
  selectClassName: string;
  inputClassName: string;
};

export default function PositionSelect({
  id,
  label = "志望職種",
  value,
  onChange,
  customValue = "",
  onCustomChange,
  labelClassName = "mb-1.5 block text-xs font-semibold text-slate-600",
  selectClassName,
  inputClassName,
}: Props) {
  const { positionOptions, addPositionOption, removePositionOption } = useRecruitment();
  const [editingOptions, setEditingOptions] = useState(false);
  const [newOption, setNewOption] = useState("");

  const isKnownPosition = positionOptions.includes(value);
  const selectValue = isKnownPosition ? value : "その他";
  const shownCustomValue = value === "その他" ? customValue : value;

  function handleSelect(nextValue: string) {
    if (nextValue === "その他") {
      onChange("その他");
      return;
    }
    onChange(nextValue);
    onCustomChange?.("");
  }

  function handleAddOption() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    addPositionOption(trimmed);
    onChange(trimmed);
    onCustomChange?.("");
    setNewOption("");
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className={labelClassName}>{label}</label>
        <button
          type="button"
          onClick={() => setEditingOptions((current) => !current)}
          className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
        >
          {editingOptions ? "閉じる" : "選択肢を編集"}
        </button>
      </div>

      <div className="relative">
        <select id={id} value={selectValue} onChange={(event) => handleSelect(event.target.value)} className={selectClassName}>
          {positionOptions.map((position) => (
            <option key={position} value={position}>{position}</option>
          ))}
          <option value="その他">その他</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {selectValue === "その他" && (
        <input
          type="text"
          value={shownCustomValue}
          onChange={(event) => {
            if (value === "その他") (onCustomChange ?? onChange)(event.target.value);
            else onChange(event.target.value);
          }}
          placeholder="職種を入力"
          className={`mt-2 ${inputClassName}`}
        />
      )}

      {editingOptions && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(event) => setNewOption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddOption();
                }
              }}
              placeholder="例：Webデザイナー"
              className={`flex-1 bg-white ${inputClassName}`}
            />
            <button
              type="button"
              onClick={handleAddOption}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              追加
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {positionOptions.map((position) => (
              <span key={position} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                {position}
                <button
                  type="button"
                  onClick={() => removePositionOption(position)}
                  disabled={positionOptions.length <= 1}
                  className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  aria-label={`${position}を選択肢から削除`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
