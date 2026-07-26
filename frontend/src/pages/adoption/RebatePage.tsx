import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Plot from "react-plotly.js";
import apiClient from "@/api/client";

type TabKey = "lci-approved" | "lci-journey" | "task-incentive" | "sip" | "cisco-ea";
const TABS: { key: TabKey; label: string }[] = [
  { key: "lci-approved", label: "LCI Approved" },
  { key: "lci-journey", label: "LCI Journey" },
  { key: "task-incentive", label: "Task Incentive" },
  { key: "sip", label: "SIP Opportunities" },
  { key: "cisco-ea", label: "Cisco EA" },
];

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

function fmtUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">{label}</p>
      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableView({ rows, maxCols = 12 }: { rows: Record<string, unknown>[]; maxCols?: number }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(h => !h.startsWith("__")).slice(0, maxCols) : [];
  if (!rows.length) return <p className="text-center text-gray-400 dark:text-gray-500 py-6">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{rows.length} records</p>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 500).map((r, i) => <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">{headers.map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{r[h] == null ? "—" : String(r[h])}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > 500 && <p className="text-xs text-gray-400 text-center mt-2">Showing 500 of {rows.length}</p>}
    </div>
  );
}

export default function RebatePage() {
  const isDark = document.documentElement.classList.contains("dark");
  const currentYear = new Date().getFullYear();
  const [selectedFY, setSelectedFY] = useState<number>(currentYear);
  const [tab, setTab] = useState<TabKey>("lci-approved");

  const fyQ = useQuery({ queryKey: ["rebate-fy"], queryFn: () => apiClient.get<number[]>("/adoption/rebate/fiscal-years").then(r => r.data), staleTime: 10 * 60 * 1000 });
  const summaryQ = useQuery({ queryKey: ["rebate-summary", selectedFY], queryFn: () => apiClient.get<Summary>(`/adoption/rebate/summary?fy=${selectedFY}`).then(r => r.data), staleTime: 3 * 60 * 1000 });
  const taskQ = useQuery({ queryKey: ["rebate-task", selectedFY, tab], queryFn: () => apiClient.get<Record<string, unknown>[]>(`/adoption/rebate/task-incentive?fy=${selectedFY}`).then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "task-incentive" });
  const sipQ = useQuery({ queryKey: ["rebate-sip"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/adoption/rebate/sip-opportunities").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "sip" });
  const eaQ = useQuery({ queryKey: ["rebate-ea"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/adoption/rebate/cisco-ea").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "cisco-ea" });
  const approvedQ = useQuery({ queryKey: ["rebate-approved", selectedFY, tab], queryFn: () => apiClient.get<Record<string, unknown>[]>(`/adoption/rebate/lci-approved?fy=${selectedFY}`).then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "lci-approved" });
  const journeyQ = useQuery({ queryKey: ["rebate-journey", selectedFY, tab], queryFn: () => apiClient.get<Record<string, unknown>[]>(`/adoption/rebate/lci-journey?fy=${selectedFY}`).then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "lci-journey" });

  const fyList = fyQ.data ?? [];
  const s = summaryQ.data;

  // Status distribution chart from task incentive
  const taskRows = taskQ.data ?? [];
  const statusAgg: Record<string, number> = {};
  taskRows.forEach(r => {
    const st = String(r.task_status_name ?? r.task_status ?? "Unknown");
    statusAgg[st] = (statusAgg[st] || 0) + 1;
  });

  // EA chart
  const eaRows = eaQ.data ?? [];
  const eaSuiteAgg: Record<string, { purchased: number; generated: number }> = {};
  eaRows.forEach(r => {
    const suite = String(r.mcea_suite_name ?? "Unknown");
    if (!eaSuiteAgg[suite]) eaSuiteAgg[suite] = { purchased: 0, generated: 0 };
    eaSuiteAgg[suite].purchased += Number(r.mcea_purchased ?? 0);
    const gen = Math.min(Number(r.mcea_generated ?? 0), Number(r.mcea_purchased ?? 0));
    eaSuiteAgg[suite].generated += gen;
  });
  const eaSuites = Object.entries(eaSuiteAgg)
    .map(([suite, d]) => ({ suite, pct: d.purchased > 0 ? d.generated / d.purchased : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const plotLayout = (h = 300) => ({
    paper_bgcolor: isDark ? "#111827" : "white",
    plot_bgcolor: isDark ? "#111827" : "white",
    font: { color: isDark ? "#d1d5db" : "#374151", size: 10 },
    margin: { t: 30, b: 40, l: 40, r: 30 },
    height: h,
  });

  const activeRows = {
    "lci-approved": approvedQ.data ?? [],
    "lci-journey": journeyQ.data ?? [],
    "task-incentive": taskRows,
    "sip": sipQ.data ?? [],
    "cisco-ea": eaRows,
  }[tab];

  const isLoading = {
    "lci-approved": approvedQ.isLoading,
    "lci-journey": journeyQ.isLoading,
    "task-incentive": taskQ.isLoading,
    "sip": sipQ.isLoading,
    "cisco-ea": eaQ.isLoading,
  }[tab];

  const refetch = () => {
    void summaryQ.refetch();
    void approvedQ.refetch();
    void journeyQ.refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rebate & Opportunities</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cisco SIP / LCI Incentive Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {fyList.map(fy => (
              <button key={fy} onClick={() => setSelectedFY(fy)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedFY === fy ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>{fy}</button>
            ))}
          </div>
          <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {s && (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          <KPICard label="EA Generated" value={s.ea_generated_pct} />
          <KPICard label="SIP In Progress" value={String(s.count_sip_in_progress)} />
          <KPICard label="SIP Approved" value={String(s.count_sip_approved)} />
          <KPICard label="LCI Tasks" value={String(s.count_tasks)} />
          <KPICard label="Completed" value={String(s.count_completed)} />
          <KPICard label="In Progress" value={String(s.count_in_progress)} />
          <KPICard label="Under Review" value={String(s.count_under_review)} />
          <KPICard label="LCI Approved" value={fmtUSD(s.total_approved_usd)} sub={`FY ${s.fy}`} />
          <KPICard label="LCI Backlog" value={fmtUSD(s.total_backlog_usd)} />
        </div>
      )}

      {/* Charts row: status distribution + EA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Task Distribution by Status (FY {selectedFY})</p>
          {taskQ.isLoading && tab !== "task-incentive" ? (
            <p className="text-xs text-gray-400 py-4">Load "Task Incentive" tab to populate</p>
          ) : Object.keys(statusAgg).length > 0 ? (
            <Plot
              data={[{ type: "bar" as const, x: Object.keys(statusAgg), y: Object.values(statusAgg), marker: { color: "#5DADE2" }, text: Object.values(statusAgg).map(String), textposition: "outside" as const }]}
              layout={{ ...plotLayout(250) }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          ) : <p className="text-xs text-gray-400 py-4 text-center">Click "Task Incentive" tab to load data</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">EA Licenses Generated % by Suite</p>
          {eaQ.isLoading ? (
            <p className="text-xs text-gray-400 py-4">Load "Cisco EA" tab to populate</p>
          ) : eaSuites.length > 0 ? (
            <Plot
              data={[{ type: "bar" as const, x: eaSuites.map(e => e.pct), y: eaSuites.map(e => e.suite), orientation: "h" as const, marker: { color: "#12B76A" }, text: eaSuites.map(e => `${(e.pct * 100).toFixed(1)}%`), textposition: "outside" as const }]}
              layout={{ ...plotLayout(Math.max(250, eaSuites.length * 25)), xaxis: { tickformat: ".0%", range: [0, 1.15] }, margin: { t: 20, b: 30, l: 250, r: 60 } }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          ) : <p className="text-xs text-gray-400 py-4 text-center">Click "Cisco EA" tab to load data</p>}
        </div>
      </div>

      {/* Data Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : <TableView rows={activeRows} />}
      </div>
    </div>
  );
}
