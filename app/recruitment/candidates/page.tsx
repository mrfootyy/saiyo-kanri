"use client";

import { useMemo, useState } from "react";
import { useRecruitment } from "../context";
import { CandidateStatus, StatusFilterValue } from "../types";

const ACTIVE_STATUSES: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接"];
import SearchFilter from "../components/SearchFilter";
import CandidateTable from "../components/CandidateTable";
import AddCandidateModal from "../components/AddCandidateModal";

export type SortKey = "appliedAt" | "updatedAt" | "name" | "status";
export type SortOrder = "asc" | "desc";

const STATUS_ORDER: Record<CandidateStatus, number> = {
  応募受付: 0,
  書類選考: 1,
  一次面接: 2,
  最終面接: 3,
  内定: 4,
  不採用: 5,
  辞退: 6,
};

export default function CandidatesPage() {
  const { candidates } = useRecruitment();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue | "選考中">("選考中");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("appliedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = candidates.filter((c) => {
      const matchesSearch =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.interviewers.some((i) => i.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "すべて" ? true :
        statusFilter === "選考中" ? ACTIVE_STATUSES.includes(c.status) :
        c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, "ja");
      } else if (sortKey === "status") {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [candidates, searchQuery, statusFilter, sortKey, sortOrder]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">応募者管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            応募者の検索・ステータス管理・書類確認・面接記録の管理ができます。
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          応募者を登録
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => setStatusFilter(v as StatusFilterValue | "選考中")}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-900">応募者一覧</h2>
            <span className="text-sm font-medium text-gray-500">{filtered.length}件</span>
          </div>
        </div>
        <CandidateTable candidates={filtered} sortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
      </div>

      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
