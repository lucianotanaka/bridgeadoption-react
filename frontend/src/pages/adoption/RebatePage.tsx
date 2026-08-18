/**
 * RebatePage — Adoption Opportunities
 * Source: vwTaskSIPNewOpportunity (squad_id=30)
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import * as XLSX from "xlsx";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────
interface Summary {
  fy: number; ea_generated_pct: string;
  count_sip_in_progress: number; count_sip_approved: number;
  count_tasks: number; count_completed: number;
  count_in_progress: number; count_under_review: number;
  total_approved_usd: number; total_backlog_usd: number;
}
type Row = Record<string, unknown>;

const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const selCls = "text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors w-full";

// ─── Formatters ───────────────────────────────────────────
const fmtD = (v: unknown): string => {
  if (!v) return "";
  try { const d = new Date(String(v)); return isNaN(d.getTime()) ? String(v) : d.toISOString().split("T")[0]; }
  catch { return String(v); }
};
const fmtN = (v: unknown, dec = 2): string => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

// ─── KPI Card ─────────────────────────────────────────────
function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={card}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
    </div>
  );
}

// ─── DataTable ────────────────────────────────────────────
interface CD { key: string; label: string; fmt?: (v: unknown) => string; r?: boolean; }

function Tbl({ rows, cols, onExp, expLbl = "Excel", loading = false, title }: {
  rows: Row[]; cols: CD[]; onExp?: () => void; expLbl?: string; loading?: boolean; title?: string;
}) {
  const { t } = useTranslation();
  const [pg, setPg] = useState(1);
  const [ps, setPs] = useState(25);
  const tp = Math.max(1, Math.ceil(rows.length / ps));
  const fr = rows.length === 0 ? 0 : (pg - 1) * ps + 1;
  const to = Math.min(pg * ps, rows.length);
  const paged = rows.slice((pg - 1) * ps, pg * ps);
  let ws = Math.max(1, pg - 2); const we = Math.min(tp, ws + 4);
  if (we - ws < 4) ws = Math.max(1, we - 4);
  const pns = Array.from({ length: we - ws + 1 }, (_, i) => ws + i);
  const bB = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const bA = bB + " bg-blue-600 text-white";
  const bI = bB + " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";
  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        {title && <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title} ({rows.length})</p>}
        {onExp && (
          <button onClick={onExp} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg ml-auto">
            <Download size={13} /> {expLbl}
          </button>
        )}
      </div>
      {rows.length === 0
        ? <p className="text-center text-xs text-gray-400 py-8">{t("common.noData")}</p>
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-2 text-gray-500 font-semibold w-8">#</th>
                    {cols.map(c => (
                      <th key={c.key} className={"py-2 px-2 text-gray-500 font-semibold whitespace-nowrap " + (c.r ? "text-right" : "text-left")}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-1.5 px-2 text-gray-400">{(pg - 1) * ps + i + 1}</td>
                      {cols.map(c => {
                        const v = row[c.key];
                        const d = c.fmt ? c.fmt(v) : (v === null || v === undefined ? "" : String(v));
                        return <td key={c.key} className={"py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] overflow-hidden text-ellipsis " + (c.r ? "text-right" : "")}>{d}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{t("common.showing")} <b>{fr}</b>–<b>{to}</b> {t("common.of")} <b>{rows.length}</b></span>
                <select value={ps} onChange={e => { setPs(Number(e.target.value)); setPg(1); }}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {[25, 50, 100, 200].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPg(1)} disabled={pg === 1} className={bI}>«</button>
                <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={pg === 1} className={bI}>‹</button>
                {ws > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
                {pns.map(p => <button key={p} onClick={() => setPg(p)} className={p === pg ? bA : bI}>{p}</button>)}
                {we < tp && <span className="text-xs text-gray-400 px-1">…</span>}
                <button onClick={() => setPg(p => Math.min(tp, p + 1))} disabled={pg >= tp} className={bI}>›</button>
                <button onClick={() => setPg(tp)} disabled={pg >= tp} className={bI}>»</button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

// ─── Excel export ─────────────────────────────────────────
function doExport(rows: Row[], cols: CD[], fn: string) {
  const data = rows.map((r, i) => {
    const o: Row = { "#": i + 1 };
    cols.forEach(c => { o[c.label] = c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? ""); });
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, fn);
}

// ─── Column definitions ───────────────────────────────────
const COLS_SIP: CD[] = [
  { key: "task_id", label: "ID" },
  { key: "task_tasktype_name", label: "Type" },
  { key: "task_owner_name", label: "CSM" },
  { key: "task_client_name", label: "Client" },
  { key: "task_reference", label: "Reference" },
  { key: "task_start", label: "Start", fmt: fmtD },
  { key: "task_end", label: "End", fmt: fmtD },
  { key: "task_days", label: "Days" },
  { key: "task_end_fy", label: "FY" },
  { key: "task_status_name", label: "Status" },
  { key: "task_currency", label: "Cur" },
  { key: "task_deal_value", label: "Deal Value", fmt: v => fmtN(v), r: true },
  { key: "task_note", label: "Note" },
];

// ─── Main Page ────────────────────────────────────────────
export default function RebatePage() {
  const { t } = useTranslation();
  const today = new Date();

  const [selectedFy, setSelectedFy] = useState<number | null>(null);
  const [filterCsm, setFilterCsm] = useState("");
  const [filterClient, setFilterClient] = useState("");

  // ── Fiscal years ──────────────────────────────────────
  const fyQ = useQuery({
    queryKey: ["rebate-fiscal-years"],
    queryFn: () => apiClient.get<number[]>("/adoption/rebate/fiscal-years").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const fyOptions = fyQ.data ?? [];

  // Auto-select current FY on first load
  const fy = useMemo(() => {
    if (selectedFy !== null) return selectedFy;
    if (fyOptions.length === 0) return null;
    const m = today.getMonth() + 1;
    const curFy = m >= 4 ? today.getFullYear() : today.getFullYear() - 1;
    return fyOptions.includes(curFy) ? curFy : fyOptions[fyOptions.length - 1];
  }, [selectedFy, fyOptions]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── SIP Opportunities query (all data, filter client-side) ─
  const sipQ = useQuery({
    queryKey: ["rebate-sip"],
    queryFn: () => apiClient.get<Row[]>("/adoption/rebate/sip-opportunities").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // ── Filter SIP rows by FY (task_end_fy), CSM and Client ───
  const filteredSip = useMemo(() => {
    const rows = sipQ.data ?? [];
    return rows.filter(r => {
      if (fy !== null && Number(r.task_end_fy) !== fy) return false;
      if (filterCsm && String(r.task_owner_name ?? "") !== filterCsm) return false;
      if (filterClient && String(r.task_client_name ?? "") !== filterClient) return false;
      return true;
    });
  }, [sipQ.data, fy, filterCsm, filterClient]);

  // ── Filter options (from FY-filtered data, before cascading) ─
  const fyFilteredSip = useMemo(() => {
    const rows = sipQ.data ?? [];
    return rows.filter(r => fy === null || Number(r.task_end_fy) === fy);
  }, [sipQ.data, fy]);

  const csmOptions = useMemo(() =>
    [...new Set(fyFilteredSip.map(r => String(r.task_owner_name ?? "")).filter(Boolean))].sort(),
    [fyFilteredSip]
  );

  const clientOptions = useMemo(() => {
    const base = filterCsm
      ? fyFilteredSip.filter(r => String(r.task_owner_name ?? "") === filterCsm)
      : fyFilteredSip;
    return [...new Set(base.map(r => String(r.task_client_name ?? "")).filter(Boolean))].sort();
  }, [fyFilteredSip, filterCsm]);

  // ── KPIs computed from filtered rows ──────────────────
  const kpiInProgress = useMemo(() =>
    filteredSip.filter(r => [1, 2, 3, 7, 8].includes(Number(r.task_status_id))).length,
    [filteredSip]
  );
  const kpiApproved = useMemo(() =>
    filteredSip.filter(r => [9, 10].includes(Number(r.task_status_id))).length,
    [filteredSip]
  );

  const hasActiveFilters = !!(filterCsm || filterClient);
  const clearFilters = () => { setFilterCsm(""); setFilterClient(""); };

  const spin = <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      {/* Header with inline NTT FY selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("adoption.rebate.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("adoption.rebate.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">NTT FISCAL YEAR</label>
          <select
            value={fy ?? ""}
            onChange={e => { setSelectedFy(Number(e.target.value)); setFilterCsm(""); setFilterClient(""); }}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {fyOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {fyQ.isLoading && <div className="flex items-center">{spin}</div>}
        </div>
      </div>

      {/* KPI Cards — computed from filtered data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KPI label={t("adoption.rebate.sipInProgress")} value={kpiInProgress} />
        <KPI label={t("adoption.rebate.sipApproved")} value={kpiApproved} />
      </div>

      {/* CSM + Client filters */}
      <div className={card}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">CSM</label>
            <select value={filterCsm} onChange={e => { setFilterCsm(e.target.value); setFilterClient(""); }} className={selCls}>
              <option value="">All CSMs</option>
              {csmOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Client</label>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={selCls}>
              <option value="">All Clients</option>
              {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex flex-col justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <X size={12} /> {t("common.clearFilters")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SIP Opportunities Table */}
      <div className={card}>
        <Tbl
          rows={filteredSip}
          cols={COLS_SIP}
          loading={sipQ.isLoading}
          title={t("adoption.rebate.sipOpportunities")}
          onExp={() => doExport(filteredSip, COLS_SIP, new Date().toISOString().split("T")[0] + "_task_sip.xlsx")}
        />
      </div>
    </div>
  );
}
