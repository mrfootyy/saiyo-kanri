"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // パスが変わったらサイドバーを閉じる（ナビリンク押下後のページ遷移完了を検知）
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* Mobile overlay sidebar */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
        <div
          className={`absolute inset-y-0 left-0 z-50 transition-transform duration-200 ease-out ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onMobileClose={() => setMobileNavOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="メニューを開く"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">採用管理</p>
            <p className="text-[11px] leading-tight text-slate-400">株式会社ガジェログ</p>
          </div>
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
