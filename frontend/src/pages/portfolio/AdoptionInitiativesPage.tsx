/**
 * AdoptionInitiativesPage — Portfolio: Adoption Initiatives
 * Full migration from Streamlit adoption_initiatives.py
 *
 * Features:
 *  - Cascading multiselect filters: CLIENT → SOLUTION → CSM → STATUS
 *  - Two bar charts: In Progress (1,2,3,7,8,9) / Completed (10)
 *  - Data table with pagination + delayed badge
 *  - Excel export (xlsx)
 *  - i18n (PT / EN / ES)
 */
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Download, X } from "lucide-react";
import * as XLSX from "xlsx";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { tasksApi } from "@/api/tasks";
import TaskDetailPanel from "@/pages/tasks/TaskDetailPanel";

// ─── Types ────────────────────────────────────────────────
interface InitiativeRow {
  task_id?: number | string | null;
  task_customer_name?: string | null;
  task_type_name?: string | null;
  task_owner_name?: string | null;
  task_status_name?: string | null;
  task_status_id?: number | string | null;
  task_start?: string | null;
  task_end?: string | null;
  [k: string]: unknown;
}

interface DisplayRow {
  CLIENT: string;
  SOLUTION: string;
  CSM: string;
  STATUS: string;
  START_DATE: string;
  END_DATE: string;
  IS_DELAYED: boolean;
  TASK_STATUS_ID: number;
  TASK_ID: number;
}

// Status IDs — delayed rule does NOT apply to these (closed/terminal)
const CLOSED_STATUS_IDS = new Set([4, 5, 6, 10]);
// Chart groupings
const IN_PROGRESS_STATUS_IDS = new Set([1, 2, 3, 7, 8, 9]);
const COMPLETED_STATUS_ID = 10;
const NOT_COMPLETED_STATUS_IDS = new Set([4, 5, 6]); // Cancelled, Declined, Expired

// ─── CSS helpers ──────────────────────────────────────────
const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inputCls =
  "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const Spinner = () => (
  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
);

// ─── MultiSelect ──────────────────────────────────────────
function MultiSelect({
  label, options, value, onChange, maxSelections, disabled, className,
}: {
  label: string; options: string[]; value: string[];
  onChange: (v: string[]) => void; maxSelections?: number; disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, opt]);
    }
  };

  const filtered = search.trim()
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayLabel =
    value.length === 0 ? "All" : value.length === 1 ? value[0] : `${value.length} selected`;

  return (
    <div className={`relative flex flex-col gap-1 ${className ?? "min-w-[180px]"}`}>
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className={`${inputCls} text-left flex items-center justify-between gap-1 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${value.length > 0 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]"
            >✕</span>
          )}
          <span className="text-gray-400 text-[10px]">▾</span>
        </div>
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            className="absolute top-full mt-1 z-30 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col"
            style={{ maxHeight: "260px" }}
          >
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                autoFocus type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {value.length > 0 && !search && (
                <button
                  type="button"
                  onClick={() => { onChange([]); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-gray-100 dark:border-gray-700"
                >
                  Clear all
                </button>
              )}
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
              {filtered.map((opt) => {
                const isMaxed = maxSelections !== undefined && !value.includes(opt) && value.length >= maxSelections;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${isMaxed ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(opt)}
                      onChange={() => { if (!isMaxed) toggle(opt); }}
                      className="rounded accent-blue-600"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
            {maxSelections !== undefined && value.length >= maxSelections && (
              <div className="px-3 py-1.5 text-[10px] text-amber-500 border-t border-gray-100 dark:border-gray-700">
                Max {maxSelections} selections
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function PaginationBar({ total, page, pageSize, onPage, onPageSize }: {
  total: number; page: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (ps: number) => void;
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const btnBase = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const btnActive = `${btnBase} bg-blue-600 text-white`;
  const btnInactive = `${btnBase} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("common.showing")} <strong>{from}</strong>–<strong>{to}</strong> {t("common.of")} <strong>{total}</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{t("common.perPage")}</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((ps) => <option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnInactive}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={btnInactive}>‹</button>
        {start > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
        {pages.map((p) => (
          <button key={p} onClick={() => onPage(p)} className={p === page ? btnActive : btnInactive}>{p}</button>
        ))}
        {end < totalPages && <span className="text-xs text-gray-400 px-1">…</span>}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={btnInactive}>›</button>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} className={btnInactive}>»</button>
      </div>
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────
function InitiativesTable({
  rows, colLabels, canOpenTask, onRowClick,
}: {
  rows: DisplayRow[];
  colLabels: Record<string, string>;
  canOpenTask: boolean;
  onRowClick: (taskId: number) => void;
}) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        {t("common.noData")}
      </div>
    );
  }

  const visibleCols: (keyof DisplayRow)[] = ["CLIENT", "SOLUTION", "CSM", "STATUS", "START_DATE", "END_DATE"];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {visibleCols.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                {colLabels[c] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isClickable = canOpenTask && row.TASK_ID > 0;
            return (
            <tr
              key={i}
              onClick={isClickable ? () => onRowClick(row.TASK_ID) : undefined}
              className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${isClickable ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
            >
              {visibleCols.map((c) => {
                if (c === "STATUS") {
                  return (
                    <td key={c} className="px-3 py-2 align-top">
                      {row.IS_DELAYED ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 uppercase tracking-wide">
                          ⚠ {t("portfolio.adoptionInitiatives.statusDelayed")}
                        </span>
                      ) : row[c] ? (
                        <span className="text-gray-700 dark:text-gray-300">{row[c]}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  );
                }
                return (
                  <td key={c} className={`px-3 py-2 text-gray-700 dark:text-gray-300 align-top ${c === "CLIENT" ? "font-medium" : ""}`}>
                    {row[c] ? (
                      <span className="whitespace-pre-wrap break-words">{String(row[c])}</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Unique values helper ─────────────────────────────────
function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort();
}

// ─── Chart helpers ────────────────────────────────────────
function toSortedChart(counts: Record<string, number>) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return { x: entries.map(([k]) => k), y: entries.map(([, v]) => v) };
}

const BAR_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4","#84cc16"];

// ─── Excel export ─────────────────────────────────────────
function exportExcel(rows: DisplayRow[], colLabels: Record<string, string>) {
  const headers = ["CLIENT", "SOLUTION", "CSM", "STATUS", "START_DATE", "END_DATE"];
  const wsData = [
    headers.map((h) => colLabels[h] ?? h),
    ...rows.map((r) => headers.map((h) => r[h as keyof DisplayRow] ?? "")),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Adoption Initiatives");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `${date}_Adoption_Initiatives_Report.xlsx`);
}

// ─── Main Page ────────────────────────────────────────────
export default function AdoptionInitiativesPage() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canOpenTask = hasPermission("task.task");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch full task detail when a row is clicked
  const taskDetailQ = useQuery({
    queryKey: ["initiative-task-detail", selectedTaskId],
    queryFn: () => tasksApi.getTask(selectedTaskId!).then((r) => r.data),
    enabled: canOpenTask && selectedTaskId !== null,
    staleTime: 2 * 60 * 1000,
  });

  function handleRowClick(taskId: number) {
    setSelectedTaskId(taskId);
    // Scroll to panel after render
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // ─── Data fetch ─────────────────────────────────────────
  const dataQ = useQuery({
    queryKey: ["portfolio-adoption-initiatives"],
    queryFn: () =>
      apiClient.get<InitiativeRow[]>("/portfolio/adoption-tasks").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const allData = dataQ.data ?? [];

  // Column labels (driven by i18n)
  const colLabels: Record<string, string> = {
    CLIENT: t("portfolio.adoptionInitiatives.colClient"),
    SOLUTION: t("portfolio.adoptionInitiatives.colSolution"),
    CSM: t("portfolio.adoptionInitiatives.colCsm"),
    STATUS: t("portfolio.adoptionInitiatives.colStatus"),
    START_DATE: t("portfolio.adoptionInitiatives.colStartDate"),
    END_DATE: t("portfolio.adoptionInitiatives.colEndDate"),
  };

  // ─── Map to DisplayRow — with delayed + status ID ────────
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const displayData = useMemo<DisplayRow[]>(() => {
    return allData.map((row) => {
      const statusId = Number(row.task_status_id ?? 0);
      const endDate = row.task_end ? String(row.task_end).slice(0, 10) : "";
      const isDelayed =
        !CLOSED_STATUS_IDS.has(statusId) && !!endDate && endDate < today;
      return {
        CLIENT: String(row.task_customer_name ?? ""),
        SOLUTION: String(row.task_type_name ?? ""),
        CSM: String(row.task_owner_name ?? ""),
        STATUS: String(row.task_status_name ?? ""),
        START_DATE: row.task_start ? String(row.task_start).slice(0, 10) : "",
        END_DATE: endDate,
        IS_DELAYED: isDelayed,
        TASK_STATUS_ID: statusId,
        TASK_ID: Number(row.task_id ?? 0),
      };
    });
  }, [allData, today]);

  // ─── Cascading filters ───────────────────────────────────
  const [fClient, setFClient] = useState<string[]>([]);
  const [fSolution, setFSolution] = useState<string[]>([]);
  const [fCsm, setFCsm] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);

  const afterClient = useMemo(
    () => (fClient.length ? displayData.filter((r) => fClient.includes(r.CLIENT)) : displayData),
    [displayData, fClient]
  );
  const afterSolution = useMemo(
    () => (fSolution.length ? afterClient.filter((r) => fSolution.includes(r.SOLUTION)) : afterClient),
    [afterClient, fSolution]
  );
  const afterCsm = useMemo(
    () => (fCsm.length ? afterSolution.filter((r) => fCsm.includes(r.CSM)) : afterSolution),
    [afterSolution, fCsm]
  );
  const filtered = useMemo(
    () => (fStatus.length ? afterCsm.filter((r) => fStatus.includes(r.STATUS)) : afterCsm),
    [afterCsm, fStatus]
  );

  const clientOptions = useMemo(() => uniq(displayData.map((r) => r.CLIENT)), [displayData]);
  const solutionOptions = useMemo(() => uniq(afterClient.map((r) => r.SOLUTION)), [afterClient]);
  const csmOptions = useMemo(() => uniq(afterSolution.map((r) => r.CSM)), [afterSolution]);
  const statusOptions = useMemo(() => uniq(afterCsm.map((r) => r.STATUS)), [afterCsm]);

  const hasFilters = fClient.length > 0 || fSolution.length > 0 || fCsm.length > 0 || fStatus.length > 0;

  function clearFilters() {
    setFClient([]); setFSolution([]); setFCsm([]); setFStatus([]);
  }

  // ─── Chart data: In Progress vs Completed ────────────────
  const { chartInProgress, chartCompleted, chartNotCompleted } = useMemo(() => {
    const inProg: Record<string, number> = {};
    const done: Record<string, number> = {};
    const notDone: Record<string, number> = {};
    for (const row of filtered) {
      if (!row.SOLUTION) continue;
      if (IN_PROGRESS_STATUS_IDS.has(row.TASK_STATUS_ID)) {
        inProg[row.SOLUTION] = (inProg[row.SOLUTION] ?? 0) + 1;
      } else if (row.TASK_STATUS_ID === COMPLETED_STATUS_ID) {
        done[row.SOLUTION] = (done[row.SOLUTION] ?? 0) + 1;
      } else if (NOT_COMPLETED_STATUS_IDS.has(row.TASK_STATUS_ID)) {
        notDone[row.SOLUTION] = (notDone[row.SOLUTION] ?? 0) + 1;
      }
    }
    return {
      chartInProgress: toSortedChart(inProg),
      chartCompleted: toSortedChart(done),
      chartNotCompleted: toSortedChart(notDone),
    };
  }, [filtered]);

  // ─── Pagination ───────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useMemo(() => { setPage(1); }, [filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  // ─── Dark mode for Plotly ─────────────────────────────────
  const isDark = document.documentElement.classList.contains("dark");
  const plotBg = isDark ? "#111827" : "#ffffff";
  const plotPaper = isDark ? "#111827" : "#ffffff";
  const plotFont = isDark ? "#d1d5db" : "#374151";
  const isLoading = dataQ.isLoading;

  const hasCharts = filtered.length > 0 && (chartInProgress.x.length > 0 || chartCompleted.x.length > 0 || chartNotCompleted.x.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("portfolio.adoptionInitiatives.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("portfolio.adoptionInitiatives.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExcel(filtered, colLabels)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            {t("portfolio.adoptionInitiatives.exportExcel")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={card}>
        <div className="space-y-3">
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <MultiSelect
              label={t("portfolio.adoptionInitiatives.colClient")}
              options={clientOptions}
              value={fClient}
              onChange={(v) => { setFClient(v); setFSolution([]); setFCsm([]); setFStatus([]); }}
              maxSelections={5}
              disabled={isLoading}
              className="w-full"
            />
            <MultiSelect
              label={t("portfolio.adoptionInitiatives.colCsm")}
              options={csmOptions}
              value={fCsm}
              onChange={(v) => { setFCsm(v); setFStatus([]); }}
              disabled={isLoading || solutionOptions.length === 0}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <MultiSelect
              label={t("portfolio.adoptionInitiatives.colSolution")}
              options={solutionOptions}
              value={fSolution}
              onChange={(v) => { setFSolution(v); setFCsm([]); setFStatus([]); }}
              maxSelections={5}
              disabled={isLoading || clientOptions.length === 0}
              className="w-full"
            />
            <MultiSelect
              label={t("portfolio.adoptionInitiatives.colStatus")}
              options={statusOptions}
              value={fStatus}
              onChange={setFStatus}
              disabled={isLoading || csmOptions.length === 0}
              className="w-full"
            />
          </div>
          {hasFilters && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  <X size={12} /> {t("common.clearFilters")}
                </button>
              </div>
            </div>
          )}
        </div>
        {dataQ.isError && (
          <p className="text-xs text-red-500 mt-2">{t("errors.generic")}</p>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={`${card} flex justify-center py-10`}><Spinner /></div>
      )}

      {/* Three charts side by side */}
      {!isLoading && hasCharts && (
        <div className="grid grid-cols-3 gap-4">
          {/* Chart 1: In Progress */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              {t("portfolio.adoptionInitiatives.chartInProgress")}
              <span className="ml-auto text-xs font-normal text-gray-400">
                ({chartInProgress.y.reduce((s, v) => s + v, 0)})
              </span>
            </h2>
            {chartInProgress.x.length > 0 ? (
              <Plot
                data={[{
                  type: "bar",
                  x: chartInProgress.x,
                  y: chartInProgress.y,
                  text: chartInProgress.y.map(String),
                  textposition: "outside",
                  marker: { color: chartInProgress.x.map((_, i) => BAR_COLORS[i % 10]) },
                }]}
                layout={{
                  autosize: true, height: 280,
                  margin: { l: 40, r: 10, t: 10, b: 90 },
                  paper_bgcolor: plotPaper, plot_bgcolor: plotBg,
                  font: { color: plotFont, size: 10 },
                  showlegend: false,
                  xaxis: { tickangle: -30 },
                  yaxis: { title: { text: t("portfolio.adoptionInitiatives.chartYAxis") } },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%" }}
                useResizeHandler
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">{t("common.noData")}</p>
            )}
          </div>

          {/* Chart 2: Completed */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              {t("portfolio.adoptionInitiatives.chartCompleted")}
              <span className="ml-auto text-xs font-normal text-gray-400">
                ({chartCompleted.y.reduce((s, v) => s + v, 0)})
              </span>
            </h2>
            {chartCompleted.x.length > 0 ? (
              <Plot
                data={[{
                  type: "bar",
                  x: chartCompleted.x,
                  y: chartCompleted.y,
                  text: chartCompleted.y.map(String),
                  textposition: "outside",
                  marker: { color: chartCompleted.x.map((_, i) => ["#10b981","#34d399","#6ee7b7","#a7f3d0","#d1fae5"][i % 5]) },
                }]}
                layout={{
                  autosize: true, height: 280,
                  margin: { l: 40, r: 10, t: 10, b: 90 },
                  paper_bgcolor: plotPaper, plot_bgcolor: plotBg,
                  font: { color: plotFont, size: 10 },
                  showlegend: false,
                  xaxis: { tickangle: -30 },
                  yaxis: { title: { text: t("portfolio.adoptionInitiatives.chartYAxis") } },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%" }}
                useResizeHandler
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">{t("common.noData")}</p>
            )}
          </div>
          {/* Chart 3: Not Completed */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
              {t("portfolio.adoptionInitiatives.chartNotCompleted")}
              <span className="ml-auto text-xs font-normal text-gray-400">
                ({chartNotCompleted.y.reduce((s, v) => s + v, 0)})
              </span>
            </h2>
            {chartNotCompleted.x.length > 0 ? (
              <Plot
                data={[{
                  type: "bar",
                  x: chartNotCompleted.x,
                  y: chartNotCompleted.y,
                  text: chartNotCompleted.y.map(String),
                  textposition: "outside",
                  marker: { color: chartNotCompleted.x.map((_, i) => ["#ef4444","#f87171","#fca5a5","#fecaca","#fee2e2"][i % 5]) },
                }]}
                layout={{
                  autosize: true, height: 280,
                  margin: { l: 40, r: 10, t: 10, b: 90 },
                  paper_bgcolor: plotPaper, plot_bgcolor: plotBg,
                  font: { color: plotFont, size: 10 },
                  showlegend: false,
                  xaxis: { tickangle: -30 },
                  yaxis: { title: { text: t("portfolio.adoptionInitiatives.chartYAxis") } },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%" }}
                useResizeHandler
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">{t("common.noData")}</p>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className={card}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portfolio.adoptionInitiatives.recordsFound", { count: filtered.length })}
          </p>
          <InitiativesTable
            rows={paginated}
            colLabels={colLabels}
            canOpenTask={canOpenTask}
            onRowClick={handleRowClick}
          />
          <PaginationBar
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </div>
      )}

      {/* ─── Inline Task Detail Panel ─────────────────── */}
      {canOpenTask && selectedTaskId !== null && (
        <div ref={panelRef} className="space-y-4">
          {taskDetailQ.isLoading && (
            <div className={`${card} flex justify-center py-10`}><Spinner /></div>
          )}
          {taskDetailQ.isError && (
            <div className={card}>
              <p className="text-xs text-red-500 text-center">{t("errors.generic")}</p>
            </div>
          )}
          {taskDetailQ.data && (
            <TaskDetailPanel
              tasks={[taskDetailQ.data]}
              initialIndex={0}
              onClose={() => setSelectedTaskId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
