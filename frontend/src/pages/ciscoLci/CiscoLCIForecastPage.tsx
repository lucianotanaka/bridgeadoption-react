import { useQuery } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { forecastApi } from "@/api/forecast";
import type { ForecastSummaryItem, ForecastByTaskType, IncentiveByFY, EffortItem } from "@/api/forecast";

// ─── helpers ──────────────────────────────────────────────────────────────────
const COLORS = { BACKLOG: "#19A3FC", ACHIEVED: "#4CAF50" };

function fmtK(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return String(Math.round(v));
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const plotLayout = (isDark: boolean) => ({
  paper_bgcolor: isDark ? "#111827" : "white",
  plot_bgcolor: isDark ? "#111827" : "white",
  font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
  margin: { t: 20, b: 40, l: 80, r: 20 },
});

// ─── Chart 1: Donut ───────────────────────────────────────────────────────────
function DonutChart({ data, fy, isDark }: { data: ForecastSummaryItem[]; fy: number; isDark: boolean }) {
  // Exclude POTENTIAL from the donut chart — it's shown only as a KPI card
  const chartData = data.filter((d) => d.category !== "POTENTIAL");
  const labels = chartData.map((d) => d.category);
  const values = chartData.map((d) => d.value);
  const colors = chartData.map((d) => COLORS[d.category as keyof typeof COLORS] ?? "#94a3b8");

  return (
    <Plot
      data={[{ type: "pie", hole: 0.55, labels, values, marker: { colors }, textinfo: "label+percent", hovertemplate: "%{label}<br>%{value:,.2f}<extra></extra>" }]}
      layout={{ ...plotLayout(isDark), title: { text: `Backlog vs Achieved — FY ${fy}`, font: { size: 12 } }, showlegend: true, height: 280 }}
      useResizeHandler
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
    />
  );
}

// ─── Chart 2: By Task Type (stacked bar) ─────────────────────────────────────
function TaskTypeChart({ data, isDark }: { data: ForecastByTaskType[]; isDark: boolean }) {
  const types = [...new Set(data.map((d) => d.task_type))];
  const categories = ["BACKLOG", "ACHIEVED"];
  const traces = categories.map((cat) => {
    const catData = data.filter((d) => d.category === cat);
    const typeMap = Object.fromEntries(catData.map((d) => [d.task_type, d.pct]));
    return {
      type: "bar" as const, name: cat, x: types.map((t) => typeMap[t] ?? 0), y: types,
      orientation: "h" as const,
      marker: { color: COLORS[cat as keyof typeof COLORS] ?? "#94a3b8" },
      hovertemplate: `%{y}<br>${cat}: %{x:.1%}<extra></extra>`,
    };
  });
  return (
    <Plot
      data={traces}
      layout={{ ...plotLayout(isDark), barmode: "stack", xaxis: { tickformat: ".0%", range: [0, 1] }, height: Math.max(200, types.length * 28 + 80) }}
      useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
    />
  );
}

// ─── Chart 3: Incentive by FY ─────────────────────────────────────────────────
function IncentiveFYChart({ data, isDark }: { data: IncentiveByFY[]; isDark: boolean }) {
  return (
    <Plot
      data={[
        { type: "bar", x: data.map((d) => String(d.fy)), y: data.map((d) => d.count), marker: { color: "#19A3FC" }, name: "Tasks", text: data.map((d) => String(d.count)), textposition: "outside" as const },
        { type: "scatter", x: data.map((d) => String(d.fy)), y: data.map((d) => d.count), mode: "lines+markers", marker: { color: "red" }, line: { color: "red" }, name: "Trend" },
      ]}
      layout={{ ...plotLayout(isDark), height: 280, showlegend: false }}
      useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
    />
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function EffortTable({ rows, keyCol }: { rows: EffortItem[]; keyCol: string }) {
  if (!rows.length) return <p className="text-xs text-gray-400 dark:text-gray-500">No data.</p>;
  const label = keyCol === "client" ? "Client" : "Use Case";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 pr-3 text-gray-600 dark:text-gray-400 font-semibold">{label}</th>
            <th className="text-left py-2 pr-3 text-gray-600 dark:text-gray-400 font-semibold">Average</th>
            <th className="text-left py-2 pr-3 text-gray-600 dark:text-gray-400 font-semibold">Best Case</th>
            <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-semibold">Worst Case</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]">{String((r as unknown as Record<string, unknown>)[keyCol] ?? "—")}</td>
              <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{r.avg_fmt}</td>
              <td className="py-1.5 pr-3 text-green-600 dark:text-green-400">{r.min_fmt}</td>
              <td className="py-1.5 text-red-600 dark:text-red-400">{r.max_fmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top 5 ACHIEVED ───────────────────────────────────────────────────────────
function Top5Chart({ data, isDark }: { data: { client: string; value: number; value_fmt: string }[]; isDark: boolean }) {
  return (
    <Plot
      data={[{
        type: "bar", orientation: "h" as const,
        y: data.map((d) => d.client), x: data.map((d) => d.value),
        marker: { color: "#005B96" },
        text: data.map((d) => d.value_fmt), textposition: "outside" as const,
        hovertemplate: "%{y}<br>%{x:,.2f}<extra></extra>",
      }]}
      layout={{ ...plotLayout(isDark), height: 240, yaxis: { autorange: "reversed" as const } }}
      useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
    />
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CiscoLCIForecastPage({ fy: selectedFY }: { fy: number }) {
  const isDark = document.documentElement.classList.contains("dark");

  const summaryQuery = useQuery({ queryKey: ["forecast", "summary", selectedFY], queryFn: () => forecastApi.getSummary(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const taskTypeQuery = useQuery({ queryKey: ["forecast", "tasktype", selectedFY], queryFn: () => forecastApi.getByTaskType(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const clientQuery = useQuery({ queryKey: ["forecast", "client", selectedFY], queryFn: () => forecastApi.getByClient(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const incentiveFYQuery = useQuery({ queryKey: ["forecast", "incentive-fy"], queryFn: () => forecastApi.getIncentiveByFY().then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const effortClientQuery = useQuery({ queryKey: ["forecast", "effort-client"], queryFn: () => forecastApi.getEffortClient().then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const effortUCQuery = useQuery({ queryKey: ["forecast", "effort-uc"], queryFn: () => forecastApi.getEffortUseCase().then((r) => r.data), staleTime: 10 * 60 * 1000 });

  const summary = summaryQuery.data ?? [];
  const taskTypeData = taskTypeQuery.data ?? [];
  const clientData = clientQuery.data;
  const incentiveFY = incentiveFYQuery.data ?? [];
  const effortClient = effortClientQuery.data ?? [];
  const effortUC = effortUCQuery.data ?? [];

  const potentialVal = summary.find((s) => s.category === "POTENTIAL")?.value ?? 0;
  const backlogVal = summary.find((s) => s.category === "BACKLOG")?.value ?? 0;
  const achievedVal = summary.find((s) => s.category === "ACHIEVED")?.value ?? 0;
  const total = backlogVal + achievedVal;
  const achievedPct = total > 0 ? ((achievedVal / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Adoption Forecast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Backlog vs Achieved — Incentive Tasks</p>
        </div>
      </div>

      {/* FY Note */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-2 text-xs text-yellow-700 dark:text-yellow-300">
        BACKLOG is accumulated from FY {selectedFY} onwards • ACHIEVED considers only FY {selectedFY}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Total Potential</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{fmtK(potentialVal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Total Backlog</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmtK(backlogVal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Total Achieved</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmtK(achievedVal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Achievement Rate</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{achievedPct}%</p>
        </div>
      </div>

      {/* Chart 1: Donut + Chart 2: By Task Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <SectionTitle title="1. Backlog vs Achieved" sub={`FY ${selectedFY}`} />
          {summaryQuery.isLoading ? <LoadingCard /> : summary.length > 0 ? <DonutChart data={summary} fy={selectedFY} isDark={isDark} /> : <p className="text-xs text-gray-400">No data for FY {selectedFY}.</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <SectionTitle title="2. By Task Type" sub="Backlog vs Achieved distribution" />
          {taskTypeQuery.isLoading ? <LoadingCard /> : taskTypeData.length > 0 ? <TaskTypeChart data={taskTypeData} isDark={isDark} /> : <p className="text-xs text-gray-400">No data.</p>}
        </div>
      </div>

      {/* Chart 4: By Client */}
      {clientData && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <SectionTitle title="4B. Top 5 Clients — Highest Achieved" sub={`FY ${selectedFY}`} />
            {clientQuery.isLoading ? <LoadingCard /> : clientData.top5_achieved.length > 0 ? <Top5Chart data={clientData.top5_achieved} isDark={isDark} /> : <p className="text-xs text-gray-400">No achieved data.</p>}
          </div>
        </>
      )}

      {/* Chart 5: Incentive Task History */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <SectionTitle title="5. Incentive Task History by Fiscal Year" sub="Count of incentive tasks per FY" />
        {incentiveFYQuery.isLoading ? <LoadingCard /> : incentiveFY.length > 0 ? <IncentiveFYChart data={incentiveFY} isDark={isDark} /> : <p className="text-xs text-gray-400">No data.</p>}
      </div>

      {/* Tables 8A + 8B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <SectionTitle title="8A. Effort by Client" sub="Average days for completed incentive tasks" />
          {effortClientQuery.isLoading ? <LoadingCard /> : <EffortTable rows={effortClient} keyCol="client" />}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <SectionTitle title="8B. Effort by Use Case" sub="Average days for completed incentive tasks" />
          {effortUCQuery.isLoading ? <LoadingCard /> : <EffortTable rows={effortUC} keyCol="use_case" />}
        </div>
      </div>
    </div>
  );
}
