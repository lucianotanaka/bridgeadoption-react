/**
 * CsmAccountPage — Adoption: CSM Account
 * Migração completa do Streamlit report_csm_account.py para React.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, Download } from "lucide-react";
import Plot from "react-plotly.js";
import * as XLSX from "xlsx";
import apiClient from "@/api/client";

// ─── Types ───────────────────────────────────────────────
interface AccountRow {
  csm_name: string;
  client_name: string;
  client_type: string;
  [key: string]: unknown;
}
interface Summary {
  total_accounts: number;
  total_csms: number;
  total_clients: number;
  types: { type: string; count: number }[];
}

// ─── Color palette ────────────────────────────────────────
const TYPE_PALETTE: Record<string, string> = {
  "HIGH TOUCH": "#005B96",
  "SCALE TOUCH": "#6B48A2",
  "DIGITAL TOUCH": "#00897B",
};
const FALLBACK_COLORS = ["#005B96", "#6B48A2", "#00897B", "#E67E22", "#E74C3C", "#2980B9", "#8E44AD", "#16A085"];
const typeColor = (type: string, idx: number) => TYPE_PALETTE[type] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

// ─── Shared CSS ───────────────────────────────────────────
const cardCls = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const selectCls = "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

// ─── Type badge colors ────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  "HIGH TOUCH": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  "SCALE TOUCH": "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  "DIGITAL TOUCH": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
};
const DEFAULT_BADGE = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";

// ─── Plotly layout factory ────────────────────────────────
function mkLayout(isDark: boolean, title: string, height: number) {
  const bg = isDark ? "#111827" : "white";
  const grid = isDark ? "#374151" : "#e5e7eb";
  const fc = isDark ? "#d1d5db" : "#374151";
  return {
    title: { text: title, font: { color: fc, size: 13 }, x: 0 },
    paper_bgcolor: bg, plot_bgcolor: bg,
    font: { color: fc, size: 11 },
    margin: { l: 50, r: 40, t: 48, b: 60 },
    height,
    xaxis: { gridcolor: grid, automargin: true },
    yaxis: { gridcolor: grid, automargin: true },
    showlegend: false,
  };
}

// ─── KPI Card ─────────────────────────────────────────────
function KPICard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardCls}>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
    </div>
  );
}

// ─── Per-CSM chart (no filter) ────────────────────────────
function CsmTypeChart({ csm, rows, allTypes, isDark }: { csm: string; rows: AccountRow[]; allTypes: string[]; isDark: boolean }) {
  const { t } = useTranslation();
  const totalClients = new Set(rows.map(r => r.client_name)).size;
  const countMap: Record<string, number> = {};
  rows.forEach(r => { countMap[r.client_type] = (countMap[r.client_type] ?? 0) + 1; });
  const x = allTypes.filter(tp => (countMap[tp] ?? 0) > 0);
  const y = x.map(tp => countMap[tp] ?? 0);
  const colors = x.map((tp, i) => typeColor(tp, i));
  const hoverTpl = "%{x}: %{y} " + t("adoption.csmAccount.clients") + "<extra></extra>";
  return (
    <div className={cardCls}>
      <Plot
        data={[{ type: "bar", x, y, marker: { color: colors }, text: y.map(String), textposition: "outside", cliponaxis: false, hovertemplate: hoverTpl }]}
        layout={mkLayout(isDark, csm + " (Total: " + totalClients + ")", 320)}
        useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}

// ─── Type-filtered chart ──────────────────────────────────
function CsmCountChart({ data, typeLabel, isDark }: { data: { csm: string; count: number }[]; typeLabel: string; isDark: boolean }) {
  const { t } = useTranslation();
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const hoverTpl = "%{x}: %{y} " + t("adoption.csmAccount.clients") + "<extra></extra>";
  const title = t("adoption.csmAccount.chart2Title") + " (" + t("common.type") + ": " + typeLabel + ")";
  return (
    <div className={cardCls}>
      <Plot
        data={[{ type: "bar", x: sorted.map(d => d.csm), y: sorted.map(d => d.count), marker: { color: "#005B96" }, text: sorted.map(d => String(d.count)), textposition: "outside", cliponaxis: false, hovertemplate: hoverTpl }]}
        layout={mkLayout(isDark, title, 420)}
        useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}

// ─── Pagination Bar (same pattern as AccountTeamPage) ─────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface PaginationBarProps {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
}

function PaginationBar({ total, page, pageSize, onPage, onPageSize }: PaginationBarProps) {
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
  const btnActive = btnBase + " bg-blue-600 text-white";
  const btnInactive = btnBase + " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";

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
            onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map(ps => <option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnInactive} title="First">«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={btnInactive} title="Previous">‹</button>
        {start > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)} className={p === page ? btnActive : btnInactive}>{p}</button>
        ))}
        {end < totalPages && <span className="text-xs text-gray-400 px-1">…</span>}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={btnInactive} title="Next">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} className={btnInactive} title="Last">»</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function CsmAccountPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");

  const [filterCSM, setFilterCSM] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Queries ────────────────────────────────────────────
  const accountsQ = useQuery({
    queryKey: ["csm-accounts"],
    queryFn: () => apiClient.get<AccountRow[]>("/adoption/csm-account/accounts").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const summaryQ = useQuery({
    queryKey: ["csm-summary"],
    queryFn: () => apiClient.get<Summary>("/adoption/csm-account/summary").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const rows = accountsQ.data ?? [];
  const summary = summaryQ.data;

  // ── Filter options (cascading) ─────────────────────────
  const csms = useMemo(() => [...new Set(rows.map(r => r.csm_name))].filter(Boolean).sort(), [rows]);
  const clientOptions = useMemo(
    () => [...new Set(rows.filter(r => !filterCSM || r.csm_name === filterCSM).map(r => r.client_name))].filter(Boolean).sort(),
    [rows, filterCSM],
  );
  const typeOptions = useMemo(() => [...new Set(rows.map(r => r.client_type))].filter(Boolean).sort(), [rows]);

  // ── Filtered + deduped ────────────────────────────────
  const filtered = useMemo(
    () => rows.filter(r =>
      (!filterCSM || r.csm_name === filterCSM) &&
      (!filterClient || r.client_name === filterClient) &&
      (!filterType || r.client_type === filterType)
    ),
    [rows, filterCSM, filterClient, filterType],
  );

  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return filtered.filter(r => {
      const key = r.csm_name + "||" + r.client_name + "||" + r.client_type;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filtered]);

  // Reset page when filters change
  useMemo(() => { setPage(1); }, [filterCSM, filterClient, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pagination slice ───────────────────────────────────
  const paginated = useMemo(
    () => deduped.slice((page - 1) * pageSize, page * pageSize),
    [deduped, page, pageSize],
  );

  // ── Chart conditions (mirrors Streamlit logic) ─────────
  const showPerCsmCharts = !filterClient && !filterType;
  const showTypeChart = !filterClient && !!filterType;

  const allTypes = useMemo(() => [...new Set(deduped.map(r => r.client_type))].filter(Boolean).sort(), [deduped]);
  const csmList = useMemo(() => [...new Set(deduped.map(r => r.csm_name))].filter(Boolean).sort(), [deduped]);

  const typeChartRows = useMemo(() => {
    if (!showTypeChart) return [];
    const csmMap: Record<string, number> = {};
    deduped.forEach(r => { csmMap[r.csm_name] = (csmMap[r.csm_name] ?? 0) + 1; });
    return Object.entries(csmMap).map(([csm, count]) => ({ csm, count }));
  }, [deduped, showTypeChart]);

  // ── Clear filters ──────────────────────────────────────
  const hasActiveFilters = !!(filterCSM || filterClient || filterType);
  const clearFilters = () => { setFilterCSM(""); setFilterClient(""); setFilterType(""); };

  // ── Export ─────────────────────────────────────────────
  const exportExcel = () => {
    const data = deduped.map((r, i) => ({ "#": i + 1, CSM: r.csm_name, CLIENT: r.client_name, TYPE: r.client_type }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CSM Account");
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, date + "_CSM_Account_Report.xlsx");
  };

  const spinner = <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  const allCsmsLabel = t("adoption.csmAccount.allCsms");
  const allClientsLabel = t("adoption.csmAccount.allClients");
  const allTypesLabel = t("adoption.csmAccount.allTypes");
  const clientLabel = t("adoption.csmAccount.client");
  const typeLabel = t("common.type");
  const recordsLabel = t("adoption.csmAccount.records");
  const exportLabel = t("adoption.csmAccount.exportExcel");

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("adoption.csmAccount.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("adoption.csmAccount.subtitle")}</p>
        </div>
      </div>

      {/* KPI Cards */}
      {summaryQ.isLoading ? (
        <div className="flex justify-center py-4">{spinner}</div>
      ) : summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label={t("adoption.csmAccount.totalAccounts")} value={summary.total_accounts} />
          <KPICard label={t("adoption.csmAccount.csms")} value={summary.total_csms} />
          <KPICard label={t("adoption.csmAccount.uniqueClients")} value={summary.total_clients} />
          {summary.types[0] && (
            <KPICard label={t("adoption.csmAccount.topType") + ": " + summary.types[0].type} value={summary.types[0].count} />
          )}
        </div>
      )}

      {/* Filters */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">CSM</label>
            <select value={filterCSM} onChange={e => { setFilterCSM(e.target.value); setFilterClient(""); }} className={selectCls}>
              <option value="">{allCsmsLabel}</option>
              {csms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-[2] min-w-[180px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">{clientLabel}</label>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={selectCls}>
              <option value="">{allClientsLabel}</option>
              {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">{typeLabel}</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls}>
              <option value="">{allTypesLabel}</option>
              {typeOptions.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <X size={12} /> {t("common.clearFilters")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Charts: per-CSM (no client, no type filter) */}
      {showPerCsmCharts && !accountsQ.isLoading && csmList.length > 0 && (
        <div className="space-y-4">
          {csmList.map(csm => (
            <CsmTypeChart
              key={csm}
              csm={csm}
              rows={deduped.filter(r => r.csm_name === csm)}
              allTypes={allTypes}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Chart: clients per CSM for selected type */}
      {showTypeChart && !accountsQ.isLoading && typeChartRows.length > 0 && (
        <CsmCountChart data={typeChartRows} typeLabel={filterType} isDark={isDark} />
      )}

      {/* Records table */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {deduped.length} {recordsLabel}
          </p>
          <button
            onClick={exportExcel}
            disabled={deduped.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Download size={13} /> {exportLabel}
          </button>
        </div>

        {accountsQ.isLoading ? (
          <div className="flex justify-center py-8">{spinner}</div>
        ) : deduped.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">{t("common.noData")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold w-10">#</th>
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold">CSM</th>
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold">{clientLabel}</th>
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold">{typeLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => {
                    const globalIdx = (page - 1) * pageSize + i + 1;
                    return (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-1.5 px-3 text-gray-400">{globalIdx}</td>
                        <td className="py-1.5 px-3 font-semibold text-gray-700 dark:text-gray-300">{r.csm_name}</td>
                        <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">{r.client_name}</td>
                        <td className="py-1.5 px-3">
                          <span className={"px-2 py-0.5 rounded-full text-[10px] font-semibold " + (TYPE_BADGE[r.client_type] ?? DEFAULT_BADGE)}>
                            {r.client_type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={deduped.length}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </>
        )}
      </div>

    </div>
  );
}
