"use client";

import { DocumentFile } from "../types";

type Props = {
  file: DocumentFile;
  onClose: () => void;
};

export default function DocumentViewer({ file, onClose }: Props) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${file.name} のプレビュー`}
      className="fixed inset-0 z-[60] flex flex-col bg-black/80"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between bg-black/60 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="max-w-[70%] truncate text-sm text-white">{file.name}</span>
        <div className="flex items-center gap-3">
          <a
            href={file.dataUrl}
            download={file.name}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={(e) => e.stopPropagation()}
          >
            ダウンロード
          </a>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={file.dataUrl}
            alt={file.name}
            className="max-h-full max-w-full rounded object-contain shadow-2xl"
          />
        )}
        {isPdf && (
          <iframe
            src={file.dataUrl}
            title={file.name}
            className="h-full w-full rounded bg-white shadow-2xl"
            style={{ minHeight: "80vh" }}
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
    </div>
  );
}
