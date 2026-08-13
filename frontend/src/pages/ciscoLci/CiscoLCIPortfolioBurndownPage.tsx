import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Plot from "react-plotly.js";
import { ciscoLciApi } from "@/api/ciscoLci";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${parseFloat((v / 1e6).toFixed(2))}M`;
  if (Math.abs(v) >= 1e3) return `$${parseFloat((v / 1e3).toFixed(1))}K`;
  return `$${v.toFixed(0)}`;
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
  margin: { t: 40, b: 60, l: 70, r: 40 },
});

// ─── MonthPicker ─────────────────────────────────────────────────────────────

function MonthPicker({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</label>
      <input
        type="month"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CiscoLCIPortfolioBurndownPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");

  // Initialize with a reasonable default range (last 18 months to next 6 months)
  const now = new Date();
  const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultTo = `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const burndownQuery = useQuery({
    queryKey: ["lci", "wallet-burndown", dateFrom, dateTo],
    queryFn: () => ciscoLciApi.getWalletBurndown(dateFrom || undefined, dateTo || undefined).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const data = burndownQuery.data;
  const months = data?.months ?? [];
  const monthLabels = months.map((m) => fmtMonthLabel(m.month));

  // Summary KPIs from last month
  const lastMonth = months[months.length - 1];
  const totalOptIn = lastMonth?.opt_in ?? 0;
  const totalConverted = lastMonth?.converted ?? 0;
  const totalPipeline = lastMonth?.pipeline ?? 0;
  const conversionRate = totalOptIn > 0 ? (totalConverted / totalOptIn) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Burndown</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          LCI Wallet — Opt In vs Converted vs Pipeline
        </p>
      </div>

      {/* Date range filter */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Timeline Filter</p>
        <div className="flex gap-4 flex-wrap items-end">
          <MonthPicker
            label="From"
            value={dateFrom}
            onChange={(v) => setDateFrom(v)}
            max={dateTo}
          />
          <MonthPicker
            label="To"
            value={dateTo}
            onChange={(v) => setDateTo(v)}
            min={dateFrom}
          />
          {data && (
            <div className="text-xs text-gray-400 dark:text-gray-500 pb-1.5">
              Data available: {data.data_min} → {data.data_max}
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {months.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total Opt In</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmtUSD(totalOptIn)} USD</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Converted</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtUSD(totalConverted)} USD</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Pipeline</p>
            <p className="text-xl font-bold text-orange-500 dark:text-orange-400">{fmtUSD(totalPipeline)} USD</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Conversion Rate</p>
            <p className={`text-xl font-bold ${conversionRate >= 70 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
              {conversionRate.toFixed(1)}%
            </p>
          </div>
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
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">
            Portfolio Burndown — Cumulative
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Accumulated Opt In, Converted and Pipeline over the selected timeline
          </p>
          <Plot
            data={[
              {
                type: "scatter" as const,
                name: "Opt In (Previsto)",
                x: monthLabels,
                y: months.map((m) => m.opt_in),
                mode: "lines" as const,
                fill: "tozeroy" as const,
                fillcolor: "rgba(96,165,250,0.15)",
                line: { color: "#3B82F6", width: 2.5 },
                hovertemplate: "%{x}<br>Opt In: %{customdata}<extra></extra>",
                customdata: months.map((m) => fmtUSD(m.opt_in) + " USD"),
              },
              {
                type: "scatter" as const,
                name: "Pipeline (Disponível)",
                x: monthLabels,
                y: months.map((m) => m.pipeline),
                mode: "lines" as const,
                fill: "tozeroy" as const,
                fillcolor: "rgba(249,115,22,0.15)",
                line: { color: "#F97316", width: 2, dash: "dot" as const },
                hovertemplate: "%{x}<br>Pipeline: %{customdata}<extra></extra>",
                customdata: months.map((m) => fmtUSD(m.pipeline) + " USD"),
              },
              {
                type: "scatter" as const,
                name: "Convertido (Aprovado)",
                x: monthLabels,
                y: months.map((m) => m.converted),
                mode: "lines+markers" as const,
                line: { color: "#10B981", width: 3 },
                marker: { size: 5, color: "#10B981" },
                hovertemplate: "%{x}<br>Convertido: %{customdata}<extra></extra>",
                customdata: months.map((m) => fmtUSD(m.converted) + " USD"),
              },
            ]}
            layout={{
              ...plotLayout(isDark),
              height: 420,
              hovermode: "x unified" as const,
              xaxis: { categoryorder: "array" as const, categoryarray: monthLabels },
              yaxis: { tickprefix: "$", tickformat: ",.0f" },
              legend: { orientation: "h" as const, y: -0.15 },
              margin: { t: 20, b: 80, l: 80, r: 40 },
            }}
            useResizeHandler
            style={{ width: "100%" }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Monthly bar chart */}
      {months.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">
            Monthly Activity
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            New Opt In and Conversions per month (non-cumulative)
          </p>
          <Plot
            data={[
              {
                type: "bar" as const,
                name: "Opt In (mês)",
                x: monthLabels,
                y: months.map((m) => m.monthly_opt_in),
                marker: { color: "#60A5FA", opacity: 0.8 },
                hovertemplate: "%{x}<br>Opt In: %{customdata}<extra></extra>",
                customdata: months.map((m) => fmtUSD(m.monthly_opt_in) + " USD"),
              },
              {
                type: "bar" as const,
                name: "Convertido (mês)",
                x: monthLabels,
                y: months.map((m) => m.monthly_converted),
                marker: { color: "#10B981", opacity: 0.9 },
                hovertemplate: "%{x}<br>Convertido: %{customdata}<extra></extra>",
                customdata: months.map((m) => fmtUSD(m.monthly_converted) + " USD"),
              },
            ]}
            layout={{
              ...plotLayout(isDark),
              height: 300,
              barmode: "group" as const,
              xaxis: { categoryorder: "array" as const, categoryarray: monthLabels },
              yaxis: { tickprefix: "$", tickformat: ",.0f" },
              legend: { orientation: "h" as const, y: -0.2 },
              margin: { t: 20, b: 80, l: 80, r: 40 },
            }}
            useResizeHandler
            style={{ width: "100%" }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}
    </div>
  );
}
