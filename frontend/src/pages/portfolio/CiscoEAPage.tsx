/**
 * CiscoEAPage — Portfolio: Cisco Enterprise Agreement
 * Relatório de licenças Cisco EA.
 * Migrado do módulo Adoption Rebate (RebatePage.tsx).
 *
 * Componentes movidos:
 *   - Card "EA Generated"
 *   - Gráfico "EA LICENSES GENERATED % BY SUITE"
 *   - Tabela "Cisco EA (x)"
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw, Download } from "lucide-react";
import Plot from "react-plotly.js";
import * as XLSX from "xlsx";
import apiClient from "@/api/client";
import CiscoEATrueForwardTab from "@/pages/ciscoEA/CiscoEATrueForwardTab";

// ─── Types ────────────────────────────────────────────────
interface Summary {
  fy: number;
  ea_generated_pct: string;
  count_sip_in_progress: number;
  count_sip_approved: number;
  count_tasks: number;
  count_completed: number;
  count_in_progress: number;
  count_under_review: number;
  total_approved_usd: number;
  total_backlog_usd: number;
}
type Row = Record<string, unknown>;

// ─── Colour maps ──────────────────────────────────────────
const FB = ["#005B96", "#6B48A2", "#00897B", "#E67E22", "#E74C3C", "#2980B9"];
const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";

// ─── Formatters ───────────────────────────────────────────
const fmtD = (v: unknown): string => {
  if (!v) return "";
  try {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? String(v) : d.toISOString().split("T")[0];
  } catch {
    return String(v);
  }
};
const fmtN = (v: unknown, dec = 2): string => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return isNaN(n)
    ? String(v)
    : n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};
const mkLay = (dark: boolean, h: number, xT = "", yT = "") => {
  const bg = dark ? "#111827" : "white";
  const gr = dark ? "#374151" : "#e5e7eb";
  const fc = dark ? "#d1d5db" : "#374151";
  return {
    paper_bgcolor: bg,
    plot_bgcolor: bg,
    font: { color: fc, size: 11 },
    margin: { l: 60, r: 20, t: 40, b: 70 },
    height: h,
    xaxis: { title: xT, gridcolor: gr, automargin: true },
    yaxis: { title: yT, gridcolor: gr, automargin: true },
    showlegend: false,
  };
};

// ─── KPI Card ─────────────────────────────────────────────
function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={card}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────
interface CD {
  key: string;
  label: string;
  fmt?: (v: unknown) => string;
  r?: boolean;
}

const COLS_EA: CD[] = [
  { key: "customer_name", label: "Cliente" },
  { key: "mcea_suite_name", label: "Suite" },
  { key: "mcea_purchased", label: "Purchased", fmt: (v) => fmtN(v, 0), r: true },
  { key: "mcea_generated", label: "Generated", fmt: (v) => fmtN(v, 0), r: true },
  { key: "mcea_start_date", label: "Start", fmt: fmtD },
  { key: "mcea_end_date", label: "End", fmt: fmtD },
];

// ─── Excel export ─────────────────────────────────────────
function doExport(rows: Row[], cols: CD[], fn: string) {
  const data = rows.map((r, i) => {
    const o: Row = { "#": i + 1 };
    cols.forEach((c) => {
      o[c.label] = c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? "");
    });
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, fn);
}

// ─── DataTable ────────────────────────────────────────────
function Tbl({
  rows,
  cols,
  onExp,
  loading = false,
  title,
}: {
  rows: Row[];
  cols: CD[];
  onExp?: () => void;
  loading?: boolean;
  title?: string;
}) {
  const { t } = useTranslation();
  const [pg, setPg] = useState(1);
  const [ps, setPs] = useState(25);
  const tp = Math.max(1, Math.ceil(rows.length / ps));
  const fr = rows.length === 0 ? 0 : (pg - 1) * ps + 1;
  const to = Math.min(pg * ps, rows.length);
  const paged = rows.slice((pg - 1) * ps, pg * ps);
  let ws2 = Math.max(1, pg - 2);
  const we = Math.min(tp, ws2 + 4);
  if (we - ws2 < 4) ws2 = Math.max(1, we - 4);
  const pns = Array.from({ length: we - ws2 + 1 }, (_, i) => ws2 + i);
  const bB = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const bA = bB + " bg-blue-600 text-white";
  const bI =
    bB +
    " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" +
    " hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        {title && (
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {title} ({rows.length})
          </p>
        )}
        {onExp && (
          <button
            onClick={onExp}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg ml-auto"
          >
            <Download size={13} /> Excel
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-8">{t("common.noData")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold w-8">#</th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={
                        "py-2 px-2 text-gray-500 font-semibold whitespace-nowrap " +
                        (c.r ? "text-right" : "text-left")
                      }
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-1.5 px-2 text-gray-400">{(pg - 1) * ps + i + 1}</td>
                    {cols.map((c) => {
                      const v = row[c.key];
                      const d =
                        c.fmt ? c.fmt(v) : v === null || v === undefined ? "" : String(v);
                      return (
                        <td
                          key={c.key}
                          className={
                            "py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] overflow-hidden text-ellipsis " +
                            (c.r ? "text-right" : "")
                          }
                        >
                          {d}
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
                {t("common.showing")} <b>{fr}</b>–<b>{to}</b> {t("common.of")} <b>{rows.length}</b>
              </span>
              <select
                value={ps}
                onChange={(e) => {
                  setPs(Number(e.target.value));
                  setPg(1);
                }}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {[25, 50, 100, 200].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPg(1)} disabled={pg === 1} className={bI}>«</button>
              <button onClick={() => setPg((p) => Math.max(1, p - 1))} disabled={pg === 1} className={bI}>‹</button>
              {ws2 > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
              {pns.map((p) => (
                <button key={p} onClick={() => setPg(p)} className={p === pg ? bA : bI}>
                  {p}
                </button>
              ))}
              {we < tp && <span className="text-xs text-gray-400 px-1">…</span>}
              <button onClick={() => setPg((p) => Math.min(tp, p + 1))} disabled={pg >= tp} className={bI}>›</button>
              <button onClick={() => setPg(tp)} disabled={pg >= tp} className={bI}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function CiscoEAPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");
  const today = new Date();

  const [activeTab, setActiveTab] = useState<"overview" | "true-forward">("overview");
  const [selectedFy, setSelectedFy] = useState<number | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Fiscal years (still needed for sumQ) ─────────────────
  const fyQ = useQuery({
    queryKey: ["rebate-fiscal-years"],
    queryFn: () => apiClient.get<number[]>("/adoption/rebate/fiscal-years").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const fyOptions = fyQ.data ?? [];
  const fy = useMemo(() => {
    if (selectedFy !== null) return selectedFy;
    if (!fyOptions.length) return null;
    const m = today.getMonth() + 1;
    const curFy = m >= 4 ? today.getFullYear() : today.getFullYear() - 1;
    return fyOptions.includes(curFy) ? curFy : fyOptions[fyOptions.length - 1];
  }, [selectedFy, fyOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Summary ────────────────────────────────────────────
  const sumQ = useQuery({
    queryKey: ["rebate-summary", fy],
    queryFn: () => apiClient.get<Summary>("/adoption/rebate/summary", { params: { fy } }).then((r) => r.data),
    enabled: fy !== null,
    staleTime: 5 * 60 * 1000,
  });

  // ── EA data ────────────────────────────────────────────
  const eaQ = useQuery({
    queryKey: ["rebate-cisco-ea"],
    queryFn: () => apiClient.get<Row[]>("/adoption/rebate/cisco-ea").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived ────────────────────────────────────────────
  const customerOptions = useMemo(() =>
    [...new Set((eaQ.data ?? []).map((r) => String(r.customer_name ?? "")).filter(Boolean))].sort(),
  [eaQ.data]);

  // Active-contract rows (base for KPIs and chart)
  const activeRows = useMemo(() =>
    (eaQ.data ?? []).filter((r) => {
      const ed = r.mcea_end_date ? new Date(String(r.mcea_end_date)) : null;
      return ed && ed >= today;
    }),
  [eaQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rows filtered by selected customers (for chart + table)
  const filteredRows = useMemo(() =>
    selectedCustomers.length
      ? activeRows.filter((r) => selectedCustomers.includes(String(r.customer_name ?? "")))
      : activeRows,
  [activeRows, selectedCustomers]);

  // KPI totals — follow customer filter when active, otherwise use all active rows
  const kpiTotals = useMemo(() => {
    const source = filteredRows;
    let tp = 0, tg = 0;
    for (const r of source) {
      const p = Number(r.mcea_purchased ?? 0);
      const g = Number(r.mcea_generated ?? 0);
      tp += p;
      tg += Math.min(g, p);
    }
    const pct = tp > 0 ? (tg / tp * 100).toFixed(1) + "%" : "0.0%";
    return { purchased: Math.round(tp), generated: Math.round(tg), eaGeneratedPct: pct };
  }, [filteredRows]);

  // Chart data (filtered by customer when selected)
  const eaChart = useMemo(() => {
    if (!filteredRows.length) return null;
    const suiteMap: Record<string, { p: number; g: number }> = {};
    filteredRows.forEach((r) => {
      const suite = String(r.mcea_suite_name ?? "Unknown");
      const p = Number(r.mcea_purchased ?? 0);
      const g = Math.min(Number(r.mcea_generated ?? 0), p);
      if (!suiteMap[suite]) suiteMap[suite] = { p: 0, g: 0 };
      suiteMap[suite].p += p;
      suiteMap[suite].g += g;
    });
    const entries = Object.entries(suiteMap)
      .map(([suite, { p, g }]) => ({ suite, pct: p > 0 ? g / p : 0 }))
      .sort((a, b) => b.pct - a.pct);
    return {
      y: entries.map((e) => e.suite),
      x: entries.map((e) => e.pct),
      text: entries.map((e) => (e.pct * 100).toFixed(1) + "%"),
      colors: entries.map((_, i) => FB[i % FB.length]),
      h: Math.max(300, entries.length * 28),
    };
  }, [filteredRows]);

  const sum = sumQ.data;
  const spin = <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  // ── Multiselect toggle ─────────────────────────────────
  const toggleCustomer = (name: string) =>
    setSelectedCustomers((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("portfolio.ciscoEA.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("portfolio.ciscoEA.subtitle")}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab("overview")}
          className={"px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors " + (activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
          {t("portfolio.ciscoEA.tabMetering")}
        </button>
        <button onClick={() => setActiveTab("true-forward")}
          className={"px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors " + (activeTab === "true-forward" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
          {t("portfolio.ciscoEA.tabTrueForward")}
        </button>
      </div>

      {/* True Forward Tab */}
      {activeTab === "true-forward" && <CiscoEATrueForwardTab />}

      {/* Overview Tab */}
      {activeTab === "overview" && (<>

        {/* 1. Customer multiselect filter — at the top */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("portfolio.ciscoEA.filterCustomer")} {selectedCustomers.length > 0 && <span className="ml-1 text-blue-600">({selectedCustomers.length} {t("portfolio.ciscoEA.filterCustomer").toLowerCase()} selecionado{selectedCustomers.length > 1 ? "s" : ""})</span>}
            </p>
            {selectedCustomers.length > 0 && (
              <button onClick={() => setSelectedCustomers([])} className="text-[10px] text-red-400 hover:text-red-600">
                {t("portfolio.ciscoEA.filterClear")}
              </button>
            )}
          </div>
          {eaQ.isLoading ? (
            <div className="flex items-center gap-2">{spin}<span className="text-xs text-gray-400">{t("common.loading")}</span></div>
          ) : (
            <div className="relative">
              {/* Trigger button */}
              <button
                onClick={() => setCustomerDropOpen((o) => !o)}
                className="w-full sm:w-96 flex items-center justify-between px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors"
              >
                <span className="truncate">
                  {selectedCustomers.length === 0
                    ? "Selecionar clientes..."
                    : selectedCustomers.length === 1
                      ? selectedCustomers[0]
                      : `${selectedCustomers.length} clientes selecionados`}
                </span>
                <svg className={"w-4 h-4 ml-2 flex-shrink-0 text-gray-400 transition-transform " + (customerDropOpen ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {customerDropOpen && (
                <div className="absolute z-50 mt-1 w-full sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      autoFocus
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {/* Options */}
                  <div className="max-h-52 overflow-y-auto p-1">
                    {customerOptions
                      .filter((n) => n.toLowerCase().includes(customerSearch.toLowerCase()))
                      .map((name) => (
                        <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(name)}
                            onChange={() => toggleCustomer(name)}
                            className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{name}</span>
                        </label>
                      ))}
                    {customerOptions.filter((n) => n.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">Nenhum cliente encontrado</p>
                    )}
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400">{customerOptions.length} clientes</span>
                    <button onClick={() => setCustomerDropOpen(false)} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">Fechar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. KPI row: EA Gerado + Total Purchased + Total Generated */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI label={t("portfolio.ciscoEA.eaGenerated")}
            value={selectedCustomers.length > 0 ? kpiTotals.eaGeneratedPct : (sum?.ea_generated_pct ?? kpiTotals.eaGeneratedPct)} />
          <KPI label={t("portfolio.ciscoEA.totalPurchased")} value={fmtN(kpiTotals.purchased, 0)} />
          <KPI label={t("portfolio.ciscoEA.totalGenerated")} value={fmtN(kpiTotals.generated, 0)} />
        </div>

        {/* 3. Chart — filtered when customer(s) selected */}
        <div className={card}>
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
            EA LICENSES GENERATED % BY SUITE
            {selectedCustomers.length > 0 && <span className="ml-2 normal-case font-normal text-blue-500">— {selectedCustomers.join(", ")}</span>}
          </p>
          {eaQ.isLoading ? (
            <div className="flex justify-center py-8">{spin}</div>
          ) : eaChart ? (
            <Plot
              data={[{
                type: "bar", orientation: "h" as const,
                y: eaChart.y, x: eaChart.x, text: eaChart.text,
                textposition: "outside" as const,
                marker: { color: eaChart.colors },
              }]}
              layout={{
                ...mkLay(isDark, eaChart.h, "% Generated", "Suite"),
                yaxis: { autorange: "reversed" as const, automargin: true },
              }}
              useResizeHandler style={{ width: "100%" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">{t("common.noData")}</p>
          )}
        </div>

        {/* 4+5. Table — only when customer(s) selected */}
        {selectedCustomers.length > 0 && (
          <div className={card}>
            <Tbl
              rows={filteredRows as Row[]}
              cols={COLS_EA}
              loading={eaQ.isLoading}
              title={t("portfolio.ciscoEA.tableTitle")}
              onExp={() => doExport(filteredRows as Row[], COLS_EA, new Date().toISOString().split("T")[0] + "_cisco_ea.xlsx")}
            />
          </div>
        )}

      </>)}
    </div>
  );
}
