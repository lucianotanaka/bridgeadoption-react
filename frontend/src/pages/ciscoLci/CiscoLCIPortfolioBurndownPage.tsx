import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import Plot from "react-plotly.js";
import { ciscoLciApi } from "@/api/ciscoLci";
import * as XLSX from "xlsx";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${parseFloat((v / 1e6).toFixed(2))}M USD`;
  if (Math.abs(v) >= 1e3) return `$${parseFloat((v / 1e3).toFixed(1))}K USD`;
  return `$${v.toFixed(0)} USD`;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const mi = Number(m) - 1;
  const yy = y.slice(-2);
  return `${MONTH_ABBR[mi] ?? m} ${yy}`;
}

const plotLayout = (isDark: boolean) => ({
  paper_bgcolor: isDark ? "#111827" : "white",
  plot_bgcolor: isDark ? "#111827" : "white",
  font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
  margin: { t: 20, b: 60, l: 80, r: 40 },
});

/** Returns April of the current NTT Fiscal Year.
 *  NTT FY starts in April: if current month >= April, FY year = current year; else FY year = current year - 1.
 */
function currentFYApril(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  const fyYear = month >= 4 ? year : year - 1;
  return `${fyYear}-04`;
}

/** Returns March of the year AFTER the current NTT FY ends (18 months from FY start). */
function currentFYMarch(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyYear = month >= 4 ? year : year - 1;
  return `${fyYear + 1}-03`;
}

// ─── Tooltip component ────────────────────────────────────────────────────────

function InfoTooltip({ text, left }: { text: string; left?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ml-1" aria-label="More info">
        <span className="inline-block w-3.5 h-3.5 rounded-full border border-current text-center leading-3 text-xs font-bold select-none">?</span>
      </button>
      {open && (
        <div className={`absolute z-50 ${left ? "left-0" : "right-0"} top-6 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed`}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, accent, tooltip, tooltipLeft }: {
  label: string; value: string;
  accent?: "blue" | "green" | "orange" | "yellow";
  tooltip?: string; tooltipLeft?: boolean;
}) {
  const cls = { blue: "text-blue-600 dark:text-blue-400", green: "text-green-600 dark:text-green-400", orange: "text-orange-500 dark:text-orange-400", yellow: "text-yellow-600 dark:text-yellow-400" }[accent ?? "blue"];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-0.5 mb-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        {tooltip && <InfoTooltip text={tooltip} left={tooltipLeft} />}
      </div>
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

// ─── MonthPicker ──────────────────────────────────────────────────────────────

function MonthPicker({ label, value, onChange, min, max }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</label>
      <input type="month" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CiscoLCIPortfolioBurndownPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");

  // Default: FROM = April of current NTT FY, TO = March of next year (end of 18-month window)
  const [dateFrom, setDateFrom] = useState(currentFYApril);
  const [dateTo, setDateTo] = useState(currentFYMarch);
  const [isExporting, setIsExporting] = useState(false);

  const burndownQuery = useQuery({
    queryKey: ["lci", "wallet-burndown", dateFrom, dateTo],
    queryFn: () => ciscoLciApi.getWalletBurndown(dateFrom || undefined, dateTo || undefined).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const data = burndownQuery.data;
  const months = data?.months ?? [];
  const monthLabels = months.map((m) => fmtMonthLabel(m.month));

  const lastMonth = months[months.length - 1];
  const totalOptIn = lastMonth?.opt_in ?? 0;
  const totalConverted = lastMonth?.converted ?? 0;
  const totalPipeline = lastMonth?.pipeline ?? 0;
  const conversionRate = totalOptIn > 0 ? (totalConverted / totalOptIn) * 100 : 0;

  const pbOptInLabel = t("adoption.ciscoLci.pbOptIn");
  const pbApprovedLabel = t("adoption.ciscoLci.pbApproved");
  const pbPipelineLabel = t("adoption.ciscoLci.pbPipeline");

  const handleExport = () => {
    if (!months.length) return;
    setIsExporting(true);
    try {
      const rows = months.map((m) => ({
        Month: m.month,
        [pbOptInLabel + " (Monthly)"]: m.monthly_opt_in,
        [pbApprovedLabel + " (Monthly)"]: m.monthly_converted,
        [pbOptInLabel + " (Cumulative)"]: m.opt_in,
        [pbApprovedLabel + " (Cumulative)"]: m.converted,
        [pbPipelineLabel]: m.pipeline,
        "Conversion Rate (%)": m.opt_in > 0 ? parseFloat(((m.converted / m.opt_in) * 100).toFixed(1)) : 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Portfolio Burndown");
      XLSX.writeFile(wb, `portfolio_burndown_${dateFrom}_to_${dateTo}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("adoption.ciscoLci.portfolioBurndown")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("adoption.ciscoLci.portfolioBurndownSubtitle")}</p>
      </div>

      {/* Date range filter */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.timelineFilter")}</p>
        <div className="flex gap-4 flex-wrap items-end">
          <MonthPicker label="From" value={dateFrom} onChange={(v) => setDateFrom(v)} max={dateTo} />
          <MonthPicker label="To" value={dateTo} onChange={(v) => setDateTo(v)} min={dateFrom} />
          {data && (
            <div className="text-xs text-gray-400 dark:text-gray-500 pb-1.5">
              {t("adoption.ciscoLci.dataAvailable")}: {data.data_min} → {data.data_max}
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {months.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label={pbOptInLabel} value={fmtUSD(totalOptIn)} accent="blue" tooltipLeft tooltip={t("adoption.ciscoLci.tooltipPbOptIn")} />
          <KPICard label={pbApprovedLabel} value={fmtUSD(totalConverted)} accent="green" tooltip={t("adoption.ciscoLci.tooltipPbApproved")} />
          <KPICard label={pbPipelineLabel} value={fmtUSD(totalPipeline)} accent="orange" tooltip={t("adoption.ciscoLci.tooltipPbPipeline")} />
          <KPICard label={t("adoption.ciscoLci.pbConversionRate")} value={`${conversionRate.toFixed(1)}%`} accent={conversionRate >= 70 ? "green" : "yellow"} tooltip={t("adoption.ciscoLci.tooltipPbConvRate")} />
        </div>
      )}

      {/* Main burndown chart */}
      {burndownQuery.isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : months.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
          No data available for the selected period.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-0.5 mb-1">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{t("adoption.ciscoLci.pbCumulative")}</p>
            <InfoTooltip text={t("adoption.ciscoLci.tooltipPbChart")} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t("adoption.ciscoLci.pbCumulativeSubtitle")}</p>
          <Plot
            data={[
              { type: "scatter" as const, name: pbOptInLabel, x: monthLabels, y: months.map((m) => m.opt_in), mode: "lines" as const, fill: "tozeroy" as const, fillcolor: "rgba(96,165,250,0.15)", line: { color: "#3B82F6", width: 2.5 }, hovertemplate: "%{x}<br>" + pbOptInLabel + ": %{customdata}<extra></extra>", customdata: months.map((m) => fmtUSD(m.opt_in)) },
              { type: "scatter" as const, name: pbPipelineLabel, x: monthLabels, y: months.map((m) => m.pipeline), mode: "lines" as const, fill: "tozeroy" as const, fillcolor: "rgba(249,115,22,0.15)", line: { color: "#F97316", width: 2, dash: "dot" as const }, hovertemplate: "%{x}<br>" + pbPipelineLabel + ": %{customdata}<extra></extra>", customdata: months.map((m) => fmtUSD(m.pipeline)) },
              { type: "scatter" as const, name: pbApprovedLabel, x: monthLabels, y: months.map((m) => m.converted), mode: "lines+markers" as const, line: { color: "#10B981", width: 3 }, marker: { size: 5, color: "#10B981" }, hovertemplate: "%{x}<br>" + pbApprovedLabel + ": %{customdata}<extra></extra>", customdata: months.map((m) => fmtUSD(m.converted)) },
            ]}
            layout={{ ...plotLayout(isDark), height: 420, hovermode: "x unified" as const, xaxis: { categoryorder: "array" as const, categoryarray: monthLabels }, yaxis: { tickprefix: "$", tickformat: ",.0f" }, legend: { orientation: "h" as const, y: -0.15 }, margin: { t: 20, b: 80, l: 80, r: 40 } }}
            useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Monthly bar chart */}
      {months.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-0.5 mb-1">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{t("adoption.ciscoLci.pbMonthly")}</p>
            <InfoTooltip text={t("adoption.ciscoLci.tooltipPbMonthly")} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t("adoption.ciscoLci.pbMonthlySubtitle")}</p>
          <Plot
            data={[
              { type: "bar" as const, name: pbOptInLabel, x: monthLabels, y: months.map((m) => m.monthly_opt_in), marker: { color: "#60A5FA", opacity: 0.8 }, hovertemplate: "%{x}<br>" + pbOptInLabel + ": %{customdata}<extra></extra>", customdata: months.map((m) => fmtUSD(m.monthly_opt_in)) },
              { type: "bar" as const, name: pbApprovedLabel, x: monthLabels, y: months.map((m) => m.monthly_converted), marker: { color: "#10B981", opacity: 0.9 }, hovertemplate: "%{x}<br>" + pbApprovedLabel + ": %{customdata}<extra></extra>", customdata: months.map((m) => fmtUSD(m.monthly_converted)) },
            ]}
            layout={{ ...plotLayout(isDark), height: 300, barmode: "group" as const, xaxis: { categoryorder: "array" as const, categoryarray: monthLabels }, yaxis: { tickprefix: "$", tickformat: ",.0f" }, legend: { orientation: "h" as const, y: -0.2 }, margin: { t: 20, b: 80, l: 80, r: 40 } }}
            useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Data table with export */}
      {months.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Monthly Data</p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              <Download size={13} /> {isExporting ? "Exporting..." : t("adoption.ciscoLci.exportExcel")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">Month</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{pbOptInLabel} (Monthly)</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{pbApprovedLabel} (Monthly)</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{pbOptInLabel} (Cum.)</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{pbApprovedLabel} (Cum.)</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{pbPipelineLabel}</th>
                  <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{t("adoption.ciscoLci.pbConversionRate")}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => {
                  const cr = m.opt_in > 0 ? ((m.converted / m.opt_in) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={m.month} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${i === months.length - 1 ? "font-semibold bg-gray-50 dark:bg-gray-800" : ""}`}>
                      <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{fmtMonthLabel(m.month)}</td>
                      <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400">{m.monthly_opt_in > 0 ? fmtUSD(m.monthly_opt_in) : "—"}</td>
                      <td className="py-1.5 px-2 text-right text-green-600 dark:text-green-400">{m.monthly_converted > 0 ? fmtUSD(m.monthly_converted) : "—"}</td>
                      <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400">{fmtUSD(m.opt_in)}</td>
                      <td className="py-1.5 px-2 text-right text-green-600 dark:text-green-400">{fmtUSD(m.converted)}</td>
                      <td className="py-1.5 px-2 text-right text-orange-500 dark:text-orange-400">{fmtUSD(m.pipeline)}</td>
                      <td className="py-1.5 px-2 text-right text-yellow-600 dark:text-yellow-400">{cr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
