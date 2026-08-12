import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DollarSign, BarChart3, Download, HelpCircle } from "lucide-react";
import Plot from "react-plotly.js";
import { ciscoLciApi } from "@/api/ciscoLci";
import type { LCIStageRow } from "@/api/ciscoLci";
import Pagination from "@/components/ui/Pagination";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { exportToXlsxMultiSheet } from "@/utils/exportXlsx";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${parseFloat((v / 1e6).toFixed(2))}M USD`;
  if (Math.abs(v) >= 1e3) return `$${parseFloat((v / 1e3).toFixed(2))}K USD`;
  return `$${v.toFixed(2)} USD`;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats a "YYYY-MM" month key into "Mon YY" (e.g. "2026-04" -> "Apr 26"). */
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
  margin: { t: 40, b: 60, l: 60, r: 40 },
});

function KPICard({
  label,
  value,
  sub,
  accent,
  tooltip,
  tooltipLeft,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "blue" | "yellow";
  tooltip?: string;
  tooltipLeft?: boolean;
}) {
  const cls = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  }[accent ?? "blue"];

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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 relative">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        {tooltip && (
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              aria-label="More info"
            >
              <HelpCircle size={14} />
            </button>
            {open && (
              <div className={`absolute z-50 ${tooltipLeft ? "left-0" : "right-0"} top-6 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed`}>
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function StageTable({ rows, page, pageSize }: { rows: LCIStageRow[]; page: number; pageSize: number }) {
  if (!rows.length) return <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No data.</p>;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
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
          {pageRows.map((r, i) => (
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
const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STAGE_TABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "lci_task_id", label: "Task" },
  { key: "lci_client_name", label: "Client" },
  { key: "lci_solution", label: "Solution" },
  { key: "lci_use_case", label: "Use Case" },
  { key: "lci_ws", label: "WS" },
  { key: "lci_csm_name", label: "CSM" },
  { key: "lci_stage_name", label: "Stage" },
  { key: "stage_amount_usd", label: "Value USD" },
  { key: "lci_stage_status_name", label: "Status" },
  { key: "stage_end_date", label: "End Date" },
  { key: "termination_status", label: "Completion" },
];

const EXPORT_TABS: { key: StageFilter; sheetName: string }[] = [
  { key: "approved", sheetName: "Approved" },
  { key: "awaiting", sheetName: "Awaiting" },
  { key: "ongoing", sheetName: "In Progress" },
  { key: "lost", sheetName: "Lost" },
];

type OverviewTab = "financial" | "operational";

export default function CiscoLCIReportPage({ fy: selectedFY }: { fy: number }) {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");
  const [overviewTab, setOverviewTab] = useState<OverviewTab>("financial");
  const [activeTab, setActiveTab] = useState<StageFilter>("approved");
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterSolution, setFilterSolution] = useState<string[]>([]);
  const [filterUseCase, setFilterUseCase] = useState<string[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const summaryQuery = useQuery({ queryKey: ["lci", "summary", selectedFY], queryFn: () => ciscoLciApi.getSummary(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const totalEligiblesQuery = useQuery({ queryKey: ["lci", "total-eligibles", selectedFY], queryFn: () => ciscoLciApi.getTotalEligibles(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const stageStatusQuery = useQuery({ queryKey: ["lci", "stage-status", selectedFY], queryFn: () => ciscoLciApi.getByStageStatus(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const lostJustQuery = useQuery({ queryKey: ["lci", "lost-justification", selectedFY], queryFn: () => ciscoLciApi.getLostJustification(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const termQuery = useQuery({ queryKey: ["lci", "term", selectedFY], queryFn: () => ciscoLciApi.getTerminationStatus(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const burnupQuery = useQuery({ queryKey: ["lci", "burnup", selectedFY], queryFn: () => ciscoLciApi.getBurnup(selectedFY).then((r) => r.data), staleTime: 5 * 60 * 1000 });
  const yoyQuery = useQuery({ queryKey: ["lci", "yoy"], queryFn: () => ciscoLciApi.getYoY().then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const stagesQuery = useQuery({ queryKey: ["lci", "stages", selectedFY, activeTab], queryFn: () => ciscoLciApi.getStages(selectedFY, activeTab).then((r) => r.data), staleTime: 5 * 60 * 1000 });

  const s = summaryQuery.data;
  const totalEligibles = totalEligiblesQuery.data?.total_eligibles ?? 0;
  const totalPotentialNew = totalEligiblesQuery.data?.total_potential ?? 0;
  const stageStatus = stageStatusQuery.data ?? [];
  const lostJust = lostJustQuery.data ?? [];
  const termStatus = termQuery.data ?? [];
  const burnup = burnupQuery.data;
  const yoy = yoyQuery.data ?? [];
  const stages = stagesQuery.data ?? [];

  const burnupMonths = burnup?.months ?? [];

  const tabs: { key: StageFilter; label: string; color: string }[] = [
    { key: "approved", label: `Approved (${s?.total_approved_stages ?? 0})`, color: "text-green-600 dark:text-green-400" },
    { key: "awaiting", label: `Awaiting (${s?.total_awaiting_stages ?? 0})`, color: "text-yellow-600 dark:text-yellow-400" },
    { key: "ongoing", label: `In Progress (${s?.total_ongoing_stages ?? 0})`, color: "text-blue-600 dark:text-blue-400" },
    { key: "lost", label: `Lost (${s?.total_lost_stages ?? 0})`, color: "text-red-600 dark:text-red-400" },
  ];

  const monthLabels = burnupMonths.map((m: typeof burnupMonths[0]) => fmtMonthLabel(m.month));

  // ─── Dynamic, cascading filter options for the stage table ──────────────
  const clientOptions = useMemo(() => {
    const base = stages.filter(
      (r) => (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? ""))
    );
    return [...new Set(base.map((r) => r.lci_client_name ?? ""))].filter(Boolean).sort();
  }, [stages, filterSolution, filterUseCase]);

  const solutionOptions = useMemo(() => {
    const base = stages.filter(
      (r) => (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? ""))
    );
    return [...new Set(base.map((r) => r.lci_solution ?? ""))].filter(Boolean).sort();
  }, [stages, filterClient, filterUseCase]);

  const useCaseOptions = useMemo(() => {
    const base = stages.filter(
      (r) => (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) && (!filterSolution.length || filterSolution.includes(r.lci_solution ?? ""))
    );
    return [...new Set(base.map((r) => r.lci_use_case ?? ""))].filter(Boolean).sort();
  }, [stages, filterClient, filterSolution]);

  const filteredStages = useMemo(
    () =>
      stages.filter(
        (r) =>
          (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
          (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
          (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? ""))
      ),
    [stages, filterClient, filterSolution, filterUseCase]
  );

  const applyFilters = (rows: LCIStageRow[]) =>
    rows.filter(
      (r) =>
        (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
        (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
        (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? ""))
    );

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const results = await Promise.all(
        EXPORT_TABS.map((t) => ciscoLciApi.getStages(selectedFY, t.key).then((r) => r.data))
      );
      const sheets = EXPORT_TABS.map((t, i) => ({
        sheetName: t.sheetName,
        rows: applyFilters(results[i]) as unknown as Record<string, unknown>[],
        columns: STAGE_TABLE_COLUMNS,
      }));
      exportToXlsxMultiSheet(sheets, `cisco_lci_report_fy_${selectedFY}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cisco LCI Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Life Cycle Incentive — Stage Performance</p>
        </div>
      </div>

      {/* Overview tabs */}
      {s && (
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button
              onClick={() => setOverviewTab("financial")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                overviewTab === "financial"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <DollarSign size={13} /> {t("adoption.ciscoLci.financialOverview")} — FY {selectedFY}
            </button>
            <button
              onClick={() => setOverviewTab("operational")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                overviewTab === "operational"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <BarChart3 size={13} /> {t("adoption.ciscoLci.operationalOverview")} — FY {selectedFY}
            </button>
          </div>

          {/* Financial Overview tab */}
          {overviewTab === "financial" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard
                  label={t("adoption.ciscoLci.totalEligibles")}
                  value={fmtUSD(totalEligibles)}
                  accent="blue"
                  tooltipLeft
                  tooltip={t("adoption.ciscoLci.tooltipTotalEligibles")}
                />
                <KPICard
                  label={t("adoption.ciscoLci.potential")}
                  value={fmtUSD(totalPotentialNew)}
                  accent="blue"
                  tooltipLeft
                  tooltip={t("adoption.ciscoLci.tooltipTotalPotential")}
                />
                <KPICard
                  label={t("adoption.ciscoLci.totalOptIn")}
                  value={fmtUSD(totalEligiblesQuery.data?.total_opt_in ?? s.fin_potential)}
                  accent="blue"
                  tooltip={t("adoption.ciscoLci.tooltipTotalOptIn")}
                />
                <KPICard
                  label={t("adoption.ciscoLci.captured")}
                  value={fmtUSD(s.fin_approved)}
                  accent="green"
                  tooltip={t("adoption.ciscoLci.tooltipTotalCaptured")}
                />
                <KPICard
                  label={t("adoption.ciscoLci.lost")}
                  value={fmtUSD(s.fin_lost)}
                  accent="red"
                  tooltip={t("adoption.ciscoLci.tooltipLost")}
                />
                <KPICard
                  label={t("adoption.ciscoLci.conversionRate")}
                  value={`${(s.fin_conversion_rate * 100).toFixed(1)}%`}
                  accent={s.fin_conversion_rate >= 0.7 ? "green" : "yellow"}
                  tooltip={t("adoption.ciscoLci.tooltipConversionRate")}
                />
              </div>
              {/* Executive Overview: Eligible → Potential → Opt In */}
              {totalEligiblesQuery.data?.by_solution && totalEligiblesQuery.data.by_solution.length > 0 && (() => {
                const bd = totalEligiblesQuery.data!;
                const sortedSolutions = [...bd.by_solution].sort((a, b) => a.eligible_value - b.eligible_value);
                const tracks = sortedSolutions.map((r) => r.solution);
                const waterfall = [
                  { label: "Eligible", count: bd.n_eligibles, value: bd.total_eligibles },
                  { label: "Potential", count: bd.n_potential, value: bd.total_potential },
                  { label: "Opt In", count: bd.n_opt_in, value: bd.total_opt_in },
                ];
                const pctPot = bd.total_eligibles > 0 ? ((bd.total_potential / bd.total_eligibles) * 100).toFixed(1) : "0";
                const pctOpt = bd.total_potential > 0 ? ((bd.total_opt_in / bd.total_potential) * 100).toFixed(1) : "0";
                return (
                  <>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{t("adoption.ciscoLci.executiveOverview")}</p>
                    {/* Funnel */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">{t("adoption.ciscoLci.eligibleVsPotentialVsOptIn")}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("adoption.ciscoLci.potentialPctOfEligible", { pct: pctPot })} &nbsp;·&nbsp; {t("adoption.ciscoLci.optInPctOfPotential", { pct: pctOpt })}</p>
                      <Plot data={[{ type: "funnel" as const, y: waterfall.map((w) => w.label), x: waterfall.map((w) => w.value), textinfo: "text+percent initial" as const, text: waterfall.map((w) => fmtUSD(w.value)), hoverinfo: "skip" as const, marker: { color: ["#60a5fa", "#34d399", "#a78bfa"] }, connector: { line: { color: "rgba(150,150,150,0.3)", width: 1 } } }]} layout={{ ...plotLayout(isDark), height: 320, margin: { t: 20, b: 20, l: 120, r: 120 }, funnelmode: "stack" as const }} useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }} />
                    </div>
                    {/* By Solution */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.eligibleVsPotentialBySolution")}</p>
                      <Plot
                        data={[
                          { type: "bar" as const, name: t("adoption.ciscoLci.optIn"), orientation: "h" as const, y: tracks, x: sortedSolutions.map((r) => r.opt_in_value), marker: { color: "#a78bfa" }, text: sortedSolutions.map((r) => { const pct = bd.total_eligibles > 0 ? ((r.opt_in_value / bd.total_eligibles) * 100) : 0; return `${fmtUSD(r.opt_in_value)} (${pct < 0.1 ? "<0.1" : pct.toFixed(1)}%)`; }), textposition: "outside" as const, hovertemplate: "%{y}<br>" + t("adoption.ciscoLci.optIn") + ": %{text}<extra></extra>" },
                          { type: "bar" as const, name: "Potential", orientation: "h" as const, y: tracks, x: sortedSolutions.map((r) => r.potential_value), marker: { color: "#34d399" }, text: sortedSolutions.map((r) => { const pct = bd.total_eligibles > 0 ? ((r.potential_value / bd.total_eligibles) * 100) : 0; return `${fmtUSD(r.potential_value)} (${pct < 0.1 ? "<0.1" : pct.toFixed(1)}%)`; }), textposition: "outside" as const, hovertemplate: "%{y}<br>Potential: %{text}<extra></extra>" },
                          { type: "bar" as const, name: t("adoption.ciscoLci.eligible"), orientation: "h" as const, y: tracks, x: sortedSolutions.map((r) => r.eligible_value), marker: { color: "#60a5fa" }, text: sortedSolutions.map((r) => { const pct = bd.total_eligibles > 0 ? ((r.eligible_value / bd.total_eligibles) * 100) : 0; return `${fmtUSD(r.eligible_value)} (${pct < 0.1 ? "<0.1" : pct.toFixed(1)}%)`; }), textposition: "outside" as const, hovertemplate: "%{y}<br>" + t("adoption.ciscoLci.eligible") + ": %{text}<extra></extra>" },
                        ]}
                        layout={{ ...plotLayout(isDark), height: Math.max(320, tracks.length * 96 + 100), barmode: "group" as const, xaxis: { title: t("adoption.ciscoLci.valueUsd"), automargin: true, range: [0, Math.max(...sortedSolutions.map((r) => r.eligible_value)) * 1.6] }, yaxis: { automargin: true, categoryorder: "array" as const, categoryarray: tracks }, showlegend: true, legend: { orientation: "h" as const, y: -0.1 }, margin: { t: 40, b: 60, l: 200, r: 20 } }}
                        useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                      />
                    </div>
                  </>
                );
              })()}
              {/* Burn-Up */}
              {burnupMonths.length > 0 && (
                <>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.burnUp")} — FY {selectedFY}</p>
                    <Plot
                      data={[
                        { type: "scatter" as const, name: "Total Potential", x: monthLabels, y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_potential), mode: "lines+markers+text" as const, line: { color: "#5DADE2", width: 3 }, text: burnupMonths.map((m: typeof burnupMonths[0]) => (m.cum_potential > 0 ? fmtUSD(m.cum_potential) : "")), textposition: "top center" as const },
                        { type: "scatter" as const, name: "Approved", x: monthLabels, y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_approved), mode: "lines+markers" as const, line: { color: "#12B76A", width: 3 }, hovertemplate: "%{x}<br>Approved: %{customdata}<extra></extra>", customdata: burnupMonths.map((m: typeof burnupMonths[0]) => fmtUSD(m.cum_approved)) },
                        { type: "scatter" as const, name: "Lost", x: monthLabels, y: burnupMonths.map((m: typeof burnupMonths[0]) => m.cum_lost), mode: "lines+markers" as const, line: { color: "#F04438", width: 3 }, hovertemplate: "%{x}<br>Lost: %{customdata}<extra></extra>", customdata: burnupMonths.map((m: typeof burnupMonths[0]) => fmtUSD(m.cum_lost)) },
                        { type: "scatter" as const, name: "Approved (final)", x: [monthLabels[monthLabels.length - 1]], y: [burnupMonths[burnupMonths.length - 1]?.cum_approved ?? 0], mode: "text" as const, text: [fmtUSD(burnupMonths[burnupMonths.length - 1]?.cum_approved ?? 0)], textposition: "middle right" as const, textfont: { color: "#12B76A" }, showlegend: false, hoverinfo: "skip" as const },
                        { type: "scatter" as const, name: "Lost (final)", x: [monthLabels[monthLabels.length - 1]], y: [burnupMonths[burnupMonths.length - 1]?.cum_lost ?? 0], mode: "text" as const, text: [fmtUSD(burnupMonths[burnupMonths.length - 1]?.cum_lost ?? 0)], textposition: "bottom right" as const, textfont: { color: "#F04438" }, showlegend: false, hoverinfo: "skip" as const },
                      ]}
                      layout={{ ...plotLayout(isDark), height: 340, hovermode: "x unified" as const, xaxis: { categoryorder: "array" as const, categoryarray: monthLabels }, margin: { t: 40, b: 60, l: 60, r: 90 } }}
                      useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                    />
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.conversionRateChart")}</p>
                    <Plot
                      data={[
                        { type: "scatter" as const, name: "Conversion Rate", x: monthLabels, y: burnupMonths.map((m: typeof burnupMonths[0]) => m.conversion_rate), mode: "lines+markers" as const, line: { color: "#175CD3", width: 3 } },
                        { type: "scatter" as const, name: "Target 70%", x: monthLabels, y: burnupMonths.map(() => 0.7), mode: "lines" as const, line: { color: "#FDB022", dash: "dash" as const } },
                      ]}
                      layout={{ ...plotLayout(isDark), height: 280, yaxis: { tickformat: ".0%", range: [0, 1] }, xaxis: { categoryorder: "array" as const, categoryarray: monthLabels } }}
                      useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                    />
                  </div>
                </>
              )}
              {/* YoY */}
              {yoy.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.yoyConversionEfficiency")}</p>
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
              {/* Cancelled/Closed Task Justification */}
              {lostJust.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">{t("adoption.ciscoLci.cancellationReasonsTitle")}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("adoption.ciscoLci.cancellationReasonsSubtitle")}</p>
                  <Plot
                    data={[
                      {
                        type: "bar" as const,
                        orientation: "h" as const,
                        y: lostJust.map((d) => d.justification || "Not Specified"),
                        x: lostJust.map((d) => d.count),
                        marker: { color: "#F04438" },
                        text: (() => {
                          const totalCount = lostJust.reduce((s, d) => s + d.count, 0);
                          return lostJust.map((d) => {
                            const pct = totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(0) : "0";
                            return `${d.count} tasks — ${fmtUSD(d.value)} — ${pct}%`;
                          });
                        })(),
                        textposition: "outside" as const,
                        hovertemplate: "%{y}<br>%{text}<extra></extra>",
                      },
                    ]}
                    layout={{
                      paper_bgcolor: isDark ? "#111827" : "white",
                      plot_bgcolor: isDark ? "#111827" : "white",
                      font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
                      height: Math.max(320, lostJust.length * 40 + 100),
                      barmode: "relative" as const,
                      xaxis: { title: "# Tasks", automargin: true, range: [0, Math.max(...lostJust.map((d) => d.count)) * 2.2] },
                      yaxis: { autorange: "reversed" as const, automargin: true },
                      showlegend: false,
                      margin: { t: 20, b: 60, l: 240, r: 20 },
                    }}
                    useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Operational Overview tab */}
          {overviewTab === "operational" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KPICard label={t("adoption.ciscoLci.totalTasks")} value={String(s.total_tasks)} accent="blue" />
                <KPICard label={t("adoption.ciscoLci.totalStages")} value={String(s.total_stages)} accent="blue" />
                <KPICard label={t("adoption.ciscoLci.stagesInProgress")} value={String(s.total_ongoing_stages)} accent="blue" />
                <KPICard label={t("adoption.ciscoLci.lost")} value={String(s.total_lost_stages)} accent="red" />
                <KPICard label={t("adoption.ciscoLci.approved")} value={String(s.total_approved_stages)} accent="green" />
                <KPICard label={t("adoption.ciscoLci.awaiting")} value={String(s.total_awaiting_stages)} accent="yellow" />
                <KPICard label={t("adoption.ciscoLci.tasksAwaitingOptIn")} value={String(s.tasks_awaiting_opt_in)} accent="yellow" />
                <KPICard label={t("adoption.ciscoLci.tasksLostOptIn")} value={String(s.tasks_lost_opt_in_pending)} accent="red" />
              </div>
              {/* Stage Status + Termination charts inside Operational tab */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.valueCountByStageStatus")}</p>
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
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("adoption.ciscoLci.lciApprovedTermination")}</p>
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
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MultiSelectDropdown label={t("adoption.ciscoLci.client")} options={clientOptions} selected={filterClient} onChange={(v) => { setFilterClient(v); setTablePage(1); }} placeholder={t("adoption.ciscoLci.allClients")} />
          <MultiSelectDropdown label={t("adoption.ciscoLci.solution")} options={solutionOptions} selected={filterSolution} onChange={(v) => { setFilterSolution(v); setTablePage(1); }} placeholder={t("adoption.ciscoLci.allSolutions")} />
          <MultiSelectDropdown label={t("adoption.ciscoLci.useCase")} options={useCaseOptions} selected={filterUseCase} onChange={(v) => { setFilterUseCase(v); setTablePage(1); }} placeholder={t("adoption.ciscoLci.allUseCases")} />
        </div>
      </div>

      {/* Stage Tables */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setTablePage(1); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white" : `bg-transparent ${tab.color} border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800`}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors shrink-0"
          >
            <Download size={13} /> {isExporting ? t("adoption.ciscoLci.exporting") : t("adoption.ciscoLci.exportExcel")}
          </button>
        </div>

        {stagesQuery.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <StageTable rows={filteredStages} page={tablePage} pageSize={tablePageSize} />
            <Pagination
              page={tablePage}
              pageSize={tablePageSize}
              total={filteredStages.length}
              onPageChange={setTablePage}
              pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setTablePageSize(size); setTablePage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
