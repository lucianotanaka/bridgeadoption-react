import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Plot from "react-plotly.js";
import apiClient from "@/api/client";

interface LCIRow {
  customer_name?: string;
  task_deal_id?: string;
  solution_track?: string;
  has_project?: string;
  potential_value_usd?: number;
  potential_use_case?: string;
  potential_task_ws?: string;
  potential_task_status?: string;
  [key: string]: unknown;
}

function KPI({ label, value, accent = "blue" }: { label: string; value: string | number; accent?: "blue" | "green" | "yellow" }) {
  const cls = { blue: "text-blue-600 dark:text-blue-400", green: "text-green-600 dark:text-green-400", yellow: "text-yellow-600 dark:text-yellow-400" }[accent];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function fmtUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function LCISolutionVsProjectPage() {
  const isDark = document.documentElement.classList.contains("dark");
  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [filterTrack, setFilterTrack] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string[]>([]);

  const dataQ = useQuery({
    queryKey: ["lci-solution-vs-project"],
    queryFn: () => apiClient.get<LCIRow[]>("/adoption/lci-status/solution-vs-project").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const rows = dataQ.data ?? [];

  // Filter options
  const customers = [...new Set(rows.map(r => r.customer_name ?? ""))].filter(Boolean).sort();
  const tracks = [...new Set(rows.map(r => r.solution_track ?? ""))].filter(Boolean).sort();
  const projectStatuses = [...new Set(rows.map(r => r.has_project ?? ""))].filter(Boolean).sort();

  // KPIs (unfiltered)
  const totalDeals = new Set(rows.map(r => r.task_deal_id)).size;
  const totalCustomers = new Set(rows.map(r => r.customer_name)).size;
  const totalValue = rows.reduce((s, r) => s + (Number(r.potential_value_usd) || 0), 0);

  // Filtered rows (for table only)
  const filtered = useMemo(() => rows.filter(r =>
    (!filterCustomer.length || filterCustomer.includes(r.customer_name ?? "")) &&
    (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")) &&
    (!filterProject.length || filterProject.includes(r.has_project ?? ""))
  ), [rows, filterCustomer, filterTrack, filterProject]);

  const plotLayout = (h = 350) => ({
    paper_bgcolor: isDark ? "#111827" : "white",
    plot_bgcolor: isDark ? "#111827" : "white",
    font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
    margin: { t: 50, b: 60, l: 60, r: 40 },
    height: h,
    showlegend: false,
  });

  // Chart 1: Potential value by solution track (NO project only)
  const noProjectRows = rows.filter(r => (r.has_project ?? "").toUpperCase() === "NO");
  const trackAgg: Record<string, number> = {};
  noProjectRows.forEach(r => {
    const t = r.solution_track ?? "Unknown";
    trackAgg[t] = (trackAgg[t] || 0) + (Number(r.potential_value_usd) || 0);
  });
  const trackEntries = Object.entries(trackAgg).sort((a, b) => b[1] - a[1]);

  // Chart 2: Pie — project status distribution
  const projectStatusAgg: Record<string, number> = {};
  rows.forEach(r => {
    const s = (r.has_project ?? "NO").toUpperCase();
    projectStatusAgg[s] = (projectStatusAgg[s] || 0) + 1;
  });

  // Chart 3: Top 10 use cases (NO project) — solution_track : use_case
  const ucAgg: Record<string, number> = {};
  noProjectRows.forEach(r => {
    const uses = String(r.potential_use_case ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const track = r.solution_track ?? "";
    uses.forEach(uc => {
      const key = `${track} : ${uc}`;
      ucAgg[key] = (ucAgg[key] || 0) + 1;
    });
  });
  const topUC = Object.entries(ucAgg).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const pieColors = ["#12B76A", "#F04438", "#FDB022", "#3B82F6"];

  const tableHeaders = ["customer_name", "task_deal_id", "solution_track", "has_project", "potential_value_usd", "potential_use_case", "potential_task_ws", "potential_task_status"].filter(h => rows.length > 0 && h in rows[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LCI Solution vs Project</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">LCI Eligible Deals — Solution Track vs Project Status</p>
        </div>
        <button onClick={() => void dataQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} className={dataQ.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Total Deals" value={totalDeals.toLocaleString()} accent="blue" />
        <KPI label="Total Customers" value={totalCustomers.toLocaleString()} accent="blue" />
        <KPI label="Total Potential Value" value={fmtUSD(totalValue)} accent="green" />
      </div>

      {dataQ.isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400">No data available.</p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Potential Value by Solution Track (No Project)</p>
              <Plot
                data={[{ type: "bar" as const, x: trackEntries.map(e => e[0]), y: trackEntries.map(e => e[1]), marker: { color: "#1f77b4" }, text: trackEntries.map(e => fmtUSD(e[1])), textposition: "outside" as const }]}
                layout={{ ...plotLayout(300) }}
                useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Project Status Distribution (by Solution Track)</p>
              <Plot
                data={[{ type: "pie" as const, labels: Object.keys(projectStatusAgg), values: Object.values(projectStatusAgg), hole: 0.45, marker: { colors: pieColors }, textinfo: "percent+label" as const }]}
                layout={{ ...plotLayout(300), showlegend: false, margin: { t: 30, b: 30, l: 30, r: 30 } }}
                useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
            </div>
          </div>

          {/* Top Use Cases chart */}
          {topUC.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Top 10 Use Cases Without Project (Solution Track : Use Case)</p>
              <Plot
                data={[{ type: "bar" as const, x: topUC.map(e => e[1]), y: topUC.map(e => e[0]), orientation: "h" as const, marker: { color: "#636EFA" }, text: topUC.map(e => String(e[1])), textposition: "outside" as const }]}
                layout={{ ...plotLayout(420), margin: { t: 30, b: 40, l: 380, r: 60 } }}
                useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Filters (affect table only)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Customer</label>
                <select multiple value={filterCustomer} onChange={e => setFilterCustomer(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none h-24">
                  {customers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Solution Track</label>
                <select multiple value={filterTrack} onChange={e => setFilterTrack(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none h-24">
                  {tracks.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Has Project</label>
                <select multiple value={filterProject} onChange={e => setFilterProject(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none h-24">
                  {projectStatuses.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{filtered.length} records — Detailed View</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {tableHeaders.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.sort((a, b) => (Number(b.potential_value_usd) || 0) - (Number(a.potential_value_usd) || 0)).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {tableHeaders.map(h => (
                        <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                          {h === "potential_value_usd"
                            ? fmtUSD(Number(r[h]) || 0)
                            : r[h] == null ? "—" : String(r[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
