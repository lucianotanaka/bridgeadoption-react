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
  const qc = useQueryClient();
  const isDark = document.documentElement.classList.contains("dark");
  const today = new Date();

  const [selectedFy, setSelectedFy] = useState<number | null>(null);

  // ── Fiscal years ──────────────────────────────────────
  const fyQ = useQuery({
    queryKey: ["rebate-fiscal-years"],
    queryFn: () =>
      apiClient.get<number[]>("/adoption/rebate/fiscal-years").then((r) => r.data),
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

  // ── Summary (EA Generated KPI) ─────────────────────────
  const sumQ = useQuery({
    queryKey: ["rebate-summary", fy],
    queryFn: () =>
      apiClient
        .get<Summary>("/adoption/rebate/summary", { params: { fy } })
        .then((r) => r.data),
    enabled: fy !== null,
    staleTime: 5 * 60 * 1000,
  });

  // ── Cisco EA data ──────────────────────────────────────
  const eaQ = useQuery({
    queryKey: ["rebate-cisco-ea"],
    queryFn: () =>
      apiClient.get<Row[]>("/adoption/rebate/cisco-ea").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // ── EA chart data ──────────────────────────────────────
  const eaChart = useMemo(() => {
    const rows = (eaQ.data ?? []).filter((r) => {
      const ed = r.mcea_end_date ? new Date(String(r.mcea_end_date)) : null;
      return ed && ed >= today;
    });
    if (!rows.length) return null;
    const suiteMap: Record<string, { p: number; g: number }> = {};
    rows.forEach((r) => {
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
  }, [eaQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh ────────────────────────────────────────────
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["rebate-fiscal-years"] });
    qc.invalidateQueries({ queryKey: ["rebate-summary", fy] });
    qc.invalidateQueries({ queryKey: ["rebate-cisco-ea"] });
  };

  const sum = sumQ.data;
  const spin = <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("portfolio.ciscoEA.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("portfolio.ciscoEA.subtitle")}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} /> {t("common.refresh")}
        </button>
      </div>

      {/* FY Selector */}
      <div className={card}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              {t("adoption.teamTarget.fiscalYear")}
            </label>
            <select
              value={fy ?? ""}
              onChange={(e) => setSelectedFy(Number(e.target.value))}
              className="text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {sumQ.isLoading && (
            <div className="flex items-center gap-2 pt-4">
              {spin}
              <span className="text-xs text-gray-400">{t("common.loading")}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Card — EA Generated */}
      {sum && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI label={t("portfolio.ciscoEA.eaGenerated")} value={sum.ea_generated_pct} />
        </div>
      )}

      {/* EA Licenses Generated % by Suite */}
      <div className={card}>
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
          EA LICENSES GENERATED % BY SUITE
        </p>
        {eaQ.isLoading ? (
          <div className="flex justify-center py-8">{spin}</div>
        ) : eaChart ? (
          <Plot
            data={[
              {
                type: "bar",
                orientation: "h" as const,
                y: eaChart.y,
                x: eaChart.x,
                text: eaChart.text,
                textposition: "outside" as const,
                marker: { color: eaChart.colors },
              },
            ]}
            layout={{
              ...mkLay(isDark, eaChart.h, "% Generated", "Suite"),
              yaxis: { autorange: "reversed" as const, automargin: true },
            }}
            useResizeHandler
            style={{ width: "100%" }}
            config={{ displayModeBar: false, responsive: true }}
          />
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">{t("common.noData")}</p>
        )}
      </div>

      {/* Cisco EA Table */}
      <div className={card}>
        <Tbl
          rows={eaQ.data ?? []}
          cols={COLS_EA}
          loading={eaQ.isLoading}
          title={t("portfolio.ciscoEA.tableTitle")}
          onExp={() =>
            doExport(
              eaQ.data ?? [],
              COLS_EA,
              new Date().toISOString().split("T")[0] + "_cisco_ea.xlsx"
            )
          }
        />
      </div>
    </div>
  );
}
