"use client";

import { useMemo, useState } from "react";
import { useRecruitment } from "../context";
import { CandidateStatus, StatusFilterValue } from "../types";
import { ACTIVE_STATUSES } from "../constants";
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

const BULK_STATUS_OPTIONS: CandidateStatus[] = ["書類選考", "一次面接", "最終面接", "内定", "不採用", "辞退"];

export default function CandidatesPage() {
  const { candidates, bulkUpdateStatus, deleteCandidate } = useRecruitment();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue | "選考中">("選考中");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("appliedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusValue, setBulkStatusValue] = useState<CandidateStatus>("不採用");

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
        (c.email ?? "").toLowerCase().includes(q) ||
        c.interviewers.some((i) => i.toLowerCase().includes(q)) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (c.source ?? "").toLowerCase().includes(q) ||
        (c.skills ?? []).some((s) => s.toLowerCase().includes(q));
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

  const allFilteredIds = filtered.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleBulkStatus() {
    bulkUpdateStatus([...selectedIds], bulkStatusValue);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    if (!window.confirm(`選択した${selectedIds.size}件を削除します。この操作は元に戻せません。`)) return;
    [...selectedIds].forEach((id) => deleteCandidate(id));
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">応募者管理</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            応募者の検索・ステータス管理・書類確認・面接記録の管理ができます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            応募者を登録
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => setStatusFilter(v as StatusFilterValue | "選考中")}
        />
      </div>

      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="一括操作"
          className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <span className="text-sm font-semibold text-blue-800">{selectedIds.size}件選択中</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value as CandidateStatus)}
                aria-label="変更後のステータス"
                className="appearance-none rounded-lg border border-blue-300 bg-white pl-2.5 pr-7 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {BULK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2" aria-hidden="true">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleBulkStatus}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              ステータス変更
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
            >
              削除
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
          >
            選択解除
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              応募者一覧
            </h2>
            <span className="text-xs font-medium text-slate-400">{filtered.length}件</span>
          </div>
        </div>
        <CandidateTable
          candidates={filtered}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={toggleSort}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          onDelete={deleteCandidate}
        />
      </div>

      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
