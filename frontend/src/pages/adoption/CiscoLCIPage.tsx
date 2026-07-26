import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import Plot from "react-plotly.js";
import { ciscoLciApi } from "@/api/ciscoLci";
import type { LCIStageRow } from "@/api/ciscoLci";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const plotLayout = (isDark: boolean) => ({
  paper_bgcolor: isDark ? "#111827" : "white",
  plot_bgcolor: isDark ? "#111827" : "white",
  font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
  margin: { t: 40, b: 60, l: 60, r: 40 },
});

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "green" | "red" | "blue" | "yellow" }) {
  const cls = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  }[accent ?? "blue"];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function StageTable({ rows }: { rows: LCIStageRow[] }) {
  if (!rows.length) return <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {["Task", "Client", "Solution", "Use Case", "WS", "CSM", "Stage", "Value USD", "Status", "End Date", "Completion"].map((h) => (
              <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.lci_stage_id}-${i}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{r.lci_task_id}</td>
              <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 font-medium max-w-[160px] truncate">{r.lci_client_name ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">{r.lci_solution ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">{r.lci_use_case ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{r.lci_ws ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[100px] truncate">{r.lci_csm_name ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{r.lci_stage_name ?? "—"}</td>
              <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 font-medium">{r.stage_amount_usd != null ? fmtUSD(r.stage_amount_usd) : "—"}</td>
              <td className="py-1.5 px-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.lci_stage_status_name?.toLowerCase().includes("approv") ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300" :
                  r.lci_stage_status_name?.toLowerCase().includes("lost") ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300" :
                  "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                }`}>{r.lci_stage_status_name ?? "—"}</span>
              </td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{r.stage_end_date ? r.stage_end_date.slice(0, 10) : "—"}</td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{r.termination_status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type StageFilter = "approved" | "awaiting" | "ongoing" | "lost";

export default function CiscoLCIPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");
  const currentYear = new Date().getFullYear();
  const [selectedFY, setSelectedFY] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<StageFilter>("approved");

  const fyQuery = useQuery({ queryKey: ["lci", "fy"], queryFn: () => ciscoLciApi.getFiscalYears().then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const summaryQuery = useQuery({ queryKey: ["lci", "summary", selectedFY], queryFn: () => ciscoLciApi.getSummary(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const stageStatusQuery = useQuery({ queryKey: ["lci", "stage-status", selectedFY], queryFn: () => ciscoLciApi.getByStageStatus(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const termQuery = useQuery({ queryKey: ["lci", "term", selectedFY], queryFn: () => ciscoLciApi.getTerminationStatus(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const burnupQuery = useQuery({ queryKey: ["lci", "burnup", selectedFY], queryFn: () => ciscoLciApi.getBurnup(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const yoyQuery = useQuery({ queryKey: ["lci", "yoy"], queryFn: () => ciscoLciApi.getYoY().then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const stagesQuery = useQuery({ queryKey: ["lci", "stages", selectedFY, activeTab], queryFn: () => ciscoLciApi.getStages(selectedFY, activeTab).then((r) => r.data), staleTime: 5 * 60 * 1000 });

  const fyList = fyQuery.data ?? [];
  const s = summaryQuery.data;
  const stageStatus = stageStatusQuery.data ?? [];
  const termStatus = termQuery.data ?? [];
  const burnup = burnupQuery.data;
  const yoy = yoyQuery.data ?? [];
  const stages = stagesQuery.data ?? [];

  const burnupMonths = burnup?.months ?? [];

  const tabs: { key: StageFilter; label: string; color: string }[] = [
    { key: "approved", label: `Approved (${s?.total_approved_stages ?? 0})`, color: "text-green-600 dark:text-green-400" },
    { key: "awaiting", label: `Awaiting (${s?.total_awaiting_stages ?? 0})`, color: "text-yellow-600 dark:text-yellow-400" },
    { key: "ongoing", label: `Ongoing (${s?.total_ongoing_stages ?? 0})`, color: "text-blue-600 dark:text-blue-400" },
    { key: "lost", label: `Lost (${s?.total_lost_stages ?? 0})`, color: "text-red-600 dark:text-red-400" },
  ];

  const refetch = () => {
    void summaryQuery.refetch();
    void stageStatusQuery.refetch();
    void burnupQuery.refetch();
    void stagesQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cisco LCI Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Life Cycle Incentive — Stage Performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">NTT Fiscal Year</label>
            <div className="flex gap-1">
              {fyList.map((fy) => (
                <button key={fy} onClick={() => setSelectedFY(fy)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedFY === fy ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  {fy}
                </button>
              ))}
            </div>
          </div>
          <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={13} /> {t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      {s && (
        <>
          <div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">💰 Financial Overview — FY {selectedFY}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Total Potential" value={fmtUSD(s.fin_potential)} accent="blue" />
              <KPICard label="Total Captured" value={fmtUSD(s.fin_approved)} accent="green" />
              <KPICard label="Total Lost" value={fmtUSD(s.fin_lost)} accent="red" />
              <KPICard label="Conversion Rate" value={`${(s.fin_conversion_rate * 100).toFixed(1)}%`} accent={s.fin_conversion_rate >= 0.7 ? "green" : "yellow"} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">📊 Operational Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Total Tasks" value={String(s.total_tasks)} accent="blue" />
              <KPICard label="Total Stages" value={String(s.total_stages)} accent="blue" />
              <KPICard label="Stages Ongoing" value={String(s.total_ongoing_stages)} accent="blue" />
              <KPICard label="Stages Lost" value={String(s.total_lost_stages)} accent="red" />
              <KPICard label="Stages Approved" value={String(s.total_approved_stages)} accent="green" />
              <KPICard label="Stages Awaiting" value={String(s.total_awaiting_stages)} accent="yellow" />
              <KPICard label="Tasks Awaiting Opt-in" value={String(s.tasks_awaiting_opt_in)} accent="yellow" />
              <KPICard label="Tasks Lost Opt-in" value={String(s.tasks_lost_opt_in_pending)} accent="red" />
            </div>
          </div>
        </>
      )}

      {/* Chart 7A: Stage Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">7A. Value & Count by Stage Status</p>
          {stageStatusQuery.isLoading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : stageStatus.length > 0 ? (
            <Plot
              data={[
                { type: "bar" as const, name: "Total Value (USD)", x: stageStatus.map((d: typeof stageStatus[0]) => d.status), y: stageStatus.map((d: typeof stageStatus[0]) => d.total_value), marker: { color: "#19A3FC" }, yaxis: "y1", text: stageStatus.map((d: typeof stageStatus[0]) => fmtUSD(d.total_value)), textposition: "outside" as const },
                { type: "scatter" as const, name: "Count", x: stageStatus.map((d: typeof stageStatus[0]) => d.status), y: stageStatus.map((d: typeof stageStatus[0]) => d.count), mode: "lines+markers+text" as const, text: stageStatus.map((d: typeof stageStatus[0]) => String(d.count)), textposition: "top center" as const, yaxis: "y2", marker: { color: "orange" } },
              ]}
              layout={{ ...plotLayout(isDark), height: 300, yaxis: { title: "Value USD", showgrid: false }, yaxis2: { title: "Count", overlaying: "y" as const, side: "right" as const, showgrid: false } }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          ) : <p className="text-xs text-gray-400 py-4">No data.</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">LCI Approved — Termination</p>
          {termQuery.isLoading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : termStatus.length > 0 ? (
            <Plot
              data={[{ type: "pie" as const, labels: termStatus.map((d: typeof termStatus[0]) => d.termination_status), values: termStatus.map((d: typeof termStatus[0]) => d.count), textinfo: "label+percent" as const }]}
              layout={{ ...plotLayout(isDark), height: 280, showlegend: false, margin: { t: 20, b: 10, l: 10, r: 10 } }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          ) : <p className="text-xs text-gray-400 py-4">No approved data.</p>}
        </div>
      </div>

      {/* Chart 7B: Burn-Up */}
      {burnupMonths.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">7B. Burn-Up — FY {selectedFY}</p>
            <Plot
              data={[
                { type: "scatter" as const, name: "Total Potential", x: burnupMonths.map((m: typeof burnupMonths[0]) => m.month), y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_potential), mode: "lines" as const, line: { color: "#5DADE2", width: 3 } },
                { type: "scatter" as const, name: "Approved", x: burnupMonths.map((m: typeof burnupMonths[0]) => m.month), y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_approved), mode: "lines" as const, line: { color: "#12B76A", width: 3 } },
                { type: "scatter" as const, name: "Lost", x: burnupMonths.map((m: typeof burnupMonths[0]) => m.month), y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_lost), mode: "lines" as const, line: { color: "#F04438", width: 3 } },
              ]}
              layout={{ ...plotLayout(isDark), height: 280, hovermode: "x unified" as const, xaxis: { tickformat: "%b %Y" } }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Conversion Rate</p>
            <Plot
              data={[
                { type: "scatter" as const, name: "Conversion Rate", x: burnupMonths.map((m: typeof burnupMonths[0]) => m.month), y: burnupMonths.map((m: typeof burnupMonths[0]) => m.conversion_rate), mode: "lines+markers" as const, line: { color: "#175CD3", width: 3 } },
                { type: "scatter" as const, name: "Target 70%", x: burnupMonths.map((m: typeof burnupMonths[0]) => m.month), y: burnupMonths.map(() => 0.7), mode: "lines" as const, line: { color: "#FDB022", dash: "dash" as const } },
              ]}
              layout={{ ...plotLayout(isDark), height: 280, yaxis: { tickformat: ".0%", range: [0, 1] }, xaxis: { tickformat: "%b %Y" } }}
              useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* Chart 7C: YoY */}
      {yoy.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">7C. Year-over-Year Conversion Efficiency</p>
          <Plot
            data={[
              { type: "scatter" as const, name: "Conversion Rate", x: yoy.map((d: typeof yoy[0]) => d.fy_label), y: yoy.map((d: typeof yoy[0]) => d.conversion_rate), mode: "lines+markers+text" as const, text: yoy.map((d: typeof yoy[0]) => `${(d.conversion_rate * 100).toFixed(1)}%`), textposition: "top center" as const, line: { color: "#12B76A", width: 3 }, marker: { size: 10 } },
              { type: "scatter" as const, name: "Lost Rate", x: yoy.map((d: typeof yoy[0]) => d.fy_label), y: yoy.map((d: typeof yoy[0]) => d.lost_rate), mode: "lines+markers+text" as const, text: yoy.map((d: typeof yoy[0]) => `${(d.lost_rate * 100).toFixed(1)}%`), textposition: "bottom center" as const, line: { color: "#F04438", width: 3 }, marker: { size: 10 } },
            ]}
            layout={{ ...plotLayout(isDark), height: 280, yaxis: { tickformat: ".0%", range: [0, 1] } }}
            useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Stage Tables */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white" : `bg-transparent ${tab.color} border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800`}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {stagesQuery.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <StageTable rows={stages} />
        )}
      </div>
    </div>
  );
}
