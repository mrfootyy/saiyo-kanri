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
  const { candidates, bulkUpdateStatus, archiveCandidate, unarchiveCandidate, deleteCandidate, duplicateCandidate } = useRecruitment();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue | "選考中">("選考中");
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("appliedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusValue, setBulkStatusValue] = useState<CandidateStatus>("不採用");
  const [showBulkMenu, setShowBulkMenu] = useState(false);

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
      if (showArchived ? !c.archivedAt : c.archivedAt) return false;
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
  }, [candidates, searchQuery, statusFilter, sortKey, sortOrder, showArchived]);

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
    setShowBulkMenu(false);
  }

  function handleBulkArchive() {
    [...selectedIds].forEach((id) => archiveCandidate(id));
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    if (!window.confirm(`選択した${selectedIds.size}件を削除します。この操作は元に戻せません。`)) return;
    [...selectedIds].forEach((id) => deleteCandidate(id));
    setSelectedIds(new Set());
  }

  const archivedCount = candidates.filter((c) => !!c.archivedAt).length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">応募者管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            応募者の検索・ステータス管理・書類確認・面接記録の管理ができます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <button
              onClick={() => { setShowArchived((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${showArchived ? "border-gray-500 bg-gray-100 text-gray-700" : "border-gray-300 text-gray-500 hover:bg-gray-50"}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
              </svg>
              {showArchived ? "通常表示" : `アーカイブ (${archivedCount})`}
            </button>
          )}
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
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => setStatusFilter(v as StatusFilterValue | "選考中")}
        />
      </div>

      {/* 一括操作バー */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-bold text-blue-800">{selectedIds.size}件選択中</span>
          <div className="flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1.5 relative">
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value as CandidateStatus)}
                className="rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
              >
                {BULK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={handleBulkStatus}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                ステータス変更
              </button>
            </div>
            <button
              onClick={handleBulkArchive}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              アーカイブ
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              削除
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-blue-600 hover:underline">
            選択解除
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-900">
              {showArchived ? "アーカイブ済み応募者" : "応募者一覧"}
            </h2>
            <span className="text-sm font-medium text-gray-500">{filtered.length}件</span>
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
          onDuplicate={duplicateCandidate}
          onArchive={showArchived ? undefined : archiveCandidate}
          onUnarchive={showArchived ? unarchiveCandidate : undefined}
          onDelete={deleteCandidate}
          showArchived={showArchived}
        />
      </div>

      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
