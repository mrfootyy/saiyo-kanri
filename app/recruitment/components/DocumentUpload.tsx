"use client";

import { useRef, useState } from "react";
import { DocumentFile } from "../types";
import DocumentViewer from "./DocumentViewer";

type Props = {
  label: string;
  file?: DocumentFile;
  accept?: string;
  onChange: (file: DocumentFile | undefined) => void;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 3 * 1024 * 1024;

function isAcceptedFile(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
}

function getDocumentType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export default function DocumentUpload({ label, file, accept, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [error, setError] = useState("");

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setError("");

    if (!isAcceptedFile(f)) {
      setError("PDFまたは画像ファイルを選択してください。");
      return;
    }

    if (f.size > MAX_FILE_BYTES) {
      setError("3MB以下のPDFまたは画像ファイルを選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({
        name: f.name,
        type: getDocumentType(f),
        dataUrl: e.target?.result as string,
      });
    };
    reader.onerror = () => setError("ファイルの読み込みに失敗しました。");
    reader.readAsDataURL(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const isImage = file?.type.startsWith("image/");

  return (
    <>
      <div>
        {label && <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>}

        {file ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setViewing(true)}
              aria-label={`${file.name} をプレビュー`}
              className="flex-shrink-0 overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {isImage ? (
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="h-12 w-12 rounded border border-slate-200 object-cover transition-opacity hover:opacity-80"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border border-slate-200 bg-slate-100 transition-colors hover:bg-slate-200">
                  <svg className="h-6 w-6 text-slate-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                  </svg>
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400">
                {file.type === "application/pdf" ? "PDF" : "画像"}
              </p>
            </div>

            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setViewing(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded"
              >
                プレビュー
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 rounded"
              >
                削除
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              aria-label="ファイルをアップロード"
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-xs text-slate-500">
                クリックまたはドラッグでアップロード
              </p>
              <p className="text-xs text-slate-400">PDF・画像（JPEG / PNG / GIF / WebP、3MB以下）</p>
            </div>
            {error && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept ?? "image/*,application/pdf"}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {viewing && file && (
        <DocumentViewer file={file} onClose={() => setViewing(false)} />
      )}
    </>
  );
}
