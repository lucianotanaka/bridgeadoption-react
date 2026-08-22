/**
 * CiscoEATrueForwardHelpers — shared constants, pure helpers and sub-components
 * used by CiscoEATrueForwardTab.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

// ── constants ──────────────────────────────────────────────────────────────────
export const DC = 30;   // DAYS_CRITICAL
export const DW = 90;   // DAYS_WARNING

export const EA_PRODUCTS = new Set(["EA3-M", "ELA2-M", "A-FLEX", "A-FLEX-3"]);

export const RISK_COLORS: Record<string, string> = {
  Expirado: "#667085", CRITICO: "#F04438", ATENCAO: "#FDB022", OK: "#12B76A", "Sem data": "#D0D5DD",
};
export const URGENCY_PIE: Record<string, string> = {
  Expirado: "#667085", "Crítico (≤30d)": "#F04438", "Atenção (≤90d)": "#FDB022", "OK (>90d)": "#12B76A", "Sem data": "#D0D5DD",
};
export const TASK_PIE: Record<string, string> = {
  "Tarefa Aberta": "#175CD3", "Tarefa Encerrada": "#667085", "Sem Tarefa": "#F04438",
};
export const CCW_COV_ORDER = ["Expired","< 30 Days","31-60 Days","61-90 Days","91-120 Days","121-365 D.","> 1 Year","Sem data"];
export const CCW_RNG_ORDER = ["1) Not Applicable","3) Up to 50%","4) 51%-80%","5) 81%-93%","6) 100%","7) 101%-110%","8) 111%-115%","9) Above 115%"];
export const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";

// ── pure helpers ───────────────────────────────────────────────────────────────
export const fmtN = (v: number | null | undefined, d = 0) =>
  v == null ? "–" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtD = (v: unknown) => !v ? "–" : String(v).split("T")[0];
export const fmtPct = (v: number | null | undefined) => v == null ? "–" : v.toFixed(1) + "%";

export function urgBucket(d: number | null | undefined): string {
  if (d == null) return "Sem data";
  if (d < 0) return "Expirado";
  if (d <= DC) return "Crítico (≤30d)";
  if (d <= DW) return "Atenção (≤90d)";
  return "OK (>90d)";
}
export function urgLabel(d: number | null | undefined): string {
  if (d == null) return "Sem data";
  if (d < 0) return `Expirado há ${Math.abs(d)}d`;
  if (d <= DC) return `CRÍTICO ${d}d`;
  if (d <= DW) return `ATENÇÃO ${d}d`;
  return `OK ${d}d`;
}
export function riskLvl(d: number | null | undefined): string {
  if (d == null) return "Sem data";
  if (d < 0) return "Expirado";
  if (d <= DC) return "CRITICO";
  if (d <= DW) return "ATENCAO";
  return "OK";
}
export function covBucket(d: number | null | undefined): string {
  if (d == null) return "Sem data";
  if (d < 0) return "Expired";
  if (d <= 30) return "< 30 Days";
  if (d <= 60) return "31-60 Days";
  if (d <= 90) return "61-90 Days";
  if (d <= 120) return "91-120 Days";
  if (d <= 365) return "121-365 D.";
  return "> 1 Year";
}
export function consBucket(pct: number | null | undefined): string {
  if (pct == null || pct <= 0) return "1) Not Applicable";
  if (pct <= 50) return "3) Up to 50%";
  if (pct <= 80) return "4) 51%-80%";
  if (pct <= 93) return "5) 81%-93%";
  if (pct <= 100) return "6) 100%";
  if (pct <= 110) return "7) 101%-110%";
  if (pct <= 115) return "8) 111%-115%";
  return "9) Above 115%";
}
export function toYM(iso: string | null | undefined): string { return !iso ? "" : iso.slice(0, 7); }
export function sortYM(arr: string[]): string[] {
  return [...arr].sort((a, b) => {
    try { return new Date(a + "-01").getTime() - new Date(b + "-01").getTime(); } catch { return 0; }
  });
}
export function ymLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }); } catch { return iso; }
}

// ── badges ─────────────────────────────────────────────────────────────────────
export function UrgBadge({ days }: { days: number | null | undefined }) {
  let bg = "#C6F6D5", fg = "#276749";
  if (days == null || days < 0) { bg = "#E2E8F0"; fg = "#718096"; }
  else if (days <= DC) { bg = "#FED7D7"; fg = "#9B2335"; }
  else if (days <= DW) { bg = "#FEEBC8"; fg = "#7B341E"; }
  return (
    <span style={{ background: bg, color: fg, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {urgLabel(days)}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const c = RISK_COLORS[level] ?? "#D0D5DD";
  const fg = c === "#12B76A" ? "#166534" : c;
  return (
    <span style={{ background: c + "22", color: fg, border: `1px solid ${c}55`, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
      {level}
    </span>
  );
}

export function KPI({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={card}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={"text-2xl font-bold " + (danger ? "text-red-500" : "text-blue-600 dark:text-blue-400")}>{value}</p>
    </div>
  );
}

// ── data table ─────────────────────────────────────────────────────────────────
export type Col = {
  key: string;
  label: string;
  fmt?: (v: unknown) => string;
  right?: boolean;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export function Tbl({
  rows, cols, title, onExport,
}: {
  rows: Record<string, unknown>[];
  cols: Col[];
  title?: string;
  onExport?: () => void;
}) {
  const { t } = useTranslation();
  const [pg, setPg] = useState(1);
  const [ps, setPs] = useState(25);
  const tp = Math.max(1, Math.ceil(rows.length / ps));
  const paged = rows.slice((pg - 1) * ps, pg * ps);
  let ws = Math.max(1, pg - 2);
  const we = Math.min(tp, ws + 4);
  if (we - ws < 4) ws = Math.max(1, we - 4);
  const pns = Array.from({ length: we - ws + 1 }, (_, i) => ws + i);
  const bB = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const bA = bB + " bg-blue-600 text-white";
  const bI = bB + " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        {title && <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title} ({rows.length})</p>}
        {onExport && (
          <button onClick={onExport} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg ml-auto">
            <Download size={13} /> Excel
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
                      <th key={c.key} className={"py-2 px-2 text-gray-500 font-semibold whitespace-nowrap " + (c.right ? "text-right" : "text-left")}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-1.5 px-2 text-gray-400">{(pg - 1) * ps + i + 1}</td>
                      {cols.map(c => {
                        const v = row[c.key];
                        return (
                          <td key={c.key} className={"py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] overflow-hidden text-ellipsis " + (c.right ? "text-right" : "")}>
                            {c.render ? c.render(row) : c.fmt ? c.fmt(v) : v == null ? "–" : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {t("common.showing")} <b>{rows.length === 0 ? 0 : (pg - 1) * ps + 1}</b>–
                  <b>{Math.min(pg * ps, rows.length)}</b> {t("common.of")} <b>{rows.length}</b>
                </span>
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
