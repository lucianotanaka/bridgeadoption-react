import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Plot from "react-plotly.js";
import apiClient from "@/api/client";
import { exportToXlsx } from "@/utils/exportXlsx";
import Pagination from "@/components/ui/Pagination";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";

interface LCIRow {
  customer_name?: string;
  task_deal_id?: string;
  solution_track?: string;
  has_project?: string;
  potential_value_usd?: number;
  potential_use_case?: string;
  potential_task_ws?: string;
  potential_task_status?: string;
  potential_task_end?: string;
  potential_task_end_fy?: number;
  [key: string]: unknown;
}

const STATUS_PRIORITY: Record<string, number> = {
  YES: 4,
  "IN REVIEW": 3,
  "PENDING REVIEW": 2,
  NO: 1,
};

const STATUS_ORDER = ["NO", "YES", "PENDING REVIEW", "IN REVIEW"];

const STATUS_COLOR_MAP: Record<string, string> = {
  YES: "#2ca02c",
  NO: "#ff7f0e",
  "PENDING REVIEW": "#f1c40f",
  "IN REVIEW": "#3498db",
};

function fmtUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
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

/** Explode a comma-separated column into multiple rows, one per value (mirrors explode_multi_values in Streamlit). */
function explodeMultiValues(rows: LCIRow[], col: keyof LCIRow): { row: LCIRow; value: string }[] {
  const out: { row: LCIRow; value: string }[] = [];
  for (const row of rows) {
    const raw = String(row[col] ?? "");
    if (!raw) continue;
    const parts = raw.split(",").map((v) => v.trim()).filter(Boolean);
    for (const p of parts) out.push({ row, value: p });
  }
  return out;
}

export default function CiscoLCISolutionVsProjectPage({ fy }: { fy: number }) {
  const isDark = document.documentElement.classList.contains("dark");
  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [filterTrack, setFilterTrack] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string[]>([]);

  const dataQ = useQuery({
    queryKey: ["lci-solution-vs-project"],
    queryFn: () => apiClient.get<LCIRow[]>("/adoption/lci-status/solution-vs-project").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(25);

  // Rows scoped to the globally selected NTT Fiscal Year (shared across the Cisco LCI module)
  const rows = useMemo(
    () => (dataQ.data ?? []).filter((r) => Number(r.potential_task_end_fy) === fy),
    [dataQ.data, fy]
  );

  // ─── Cascading filter options ────────────────────────────────────────────
  // Each dropdown's options are computed from rows filtered by the *other*
  // currently selected filters, so choosing one filter narrows the others.
  const customers = useMemo(() => {
    const base = rows.filter(
      (r) =>
        (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")) &&
        (!filterProject.length || filterProject.includes(r.has_project ?? ""))
    );
    return [...new Set(base.map((r) => r.customer_name ?? ""))].filter(Boolean).sort();
  }, [rows, filterTrack, filterProject]);

  const tracks = useMemo(() => {
    const base = rows.filter(
      (r) =>
        (!filterCustomer.length || filterCustomer.includes(r.customer_name ?? "")) &&
        (!filterProject.length || filterProject.includes(r.has_project ?? ""))
    );
    return [...new Set(base.map((r) => r.solution_track ?? ""))].filter(Boolean).sort();
  }, [rows, filterCustomer, filterProject]);

  const projectStatuses = useMemo(() => {
    const base = rows.filter(
      (r) =>
        (!filterCustomer.length || filterCustomer.includes(r.customer_name ?? "")) &&
        (!filterTrack.length || filterTrack.includes(r.solution_track ?? ""))
    );
    return [...new Set(base.map((r) => r.has_project ?? ""))].filter(Boolean).sort();
  }, [rows, filterCustomer, filterTrack]);

  // ─── KPIs (unfiltered — mirrors Streamlit executive summary) ────────────
  const totalDeals = new Set(rows.map((r) => r.task_deal_id)).size;
  const totalCustomers = new Set(rows.map((r) => r.customer_name)).size;
  const totalValue = rows.reduce((s, r) => s + (Number(r.potential_value_usd) || 0), 0);

  // ─── Chart 1: Potential value by Solution Track (has_project === "NO") ──
  const noProjectRows = useMemo(() => rows.filter((r) => (r.has_project ?? "").toUpperCase() === "NO"), [rows]);
  const trackAgg: Record<string, number> = {};
  noProjectRows.forEach((r) => {
    const t = r.solution_track ?? "";
    trackAgg[t] = (trackAgg[t] || 0) + (Number(r.potential_value_usd) || 0);
  });
  const trackEntries = Object.entries(trackAgg).sort((a, b) => b[1] - a[1]);

  // ─── Chart 2: Project Status Distribution (deduped by solution_track, highest priority status wins) ──
  const projectStatusAgg = useMemo(() => {
    const consolidated = new Map<string, { status: string; priority: number }>();
    rows.forEach((r) => {
      const track = (r.solution_track ?? "UNKNOWN").trim() || "UNKNOWN";
      const status = (r.has_project ?? "NO").trim().toUpperCase() || "NO";
      const priority = STATUS_PRIORITY[status] ?? 1;
      const existing = consolidated.get(track);
      if (!existing || priority > existing.priority) {
        consolidated.set(track, { status, priority });
      }
    });
    const counts: Record<string, number> = { NO: 0, YES: 0, "PENDING REVIEW": 0, "IN REVIEW": 0 };
    consolidated.forEach(({ status }) => {
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  // ─── Chart 3: Top 10 Use Cases (has_project === "NO"), solution_track : use_case ──
  const topUC = useMemo(() => {
    const exploded = explodeMultiValues(noProjectRows, "potential_use_case");
    const dealsByKey = new Map<string, Set<string>>();
    exploded.forEach(({ row, value }) => {
      const track = (row.solution_track ?? "").trim();
      const key = `${track} : ${value}`;
      const dealId = String(row.task_deal_id ?? "");
      if (!dealsByKey.has(key)) dealsByKey.set(key, new Set());
      dealsByKey.get(key)!.add(dealId);
    });
    const agg = Array.from(dealsByKey.entries()).map(([key, deals]) => [key, deals.size] as [string, number]);
    return agg.sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [noProjectRows]);

  // ─── Filtered rows (table only) ─────────────────────────────────────────
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (!filterCustomer.length || filterCustomer.includes(r.customer_name ?? "")) &&
            (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")) &&
            (!filterProject.length || filterProject.includes(r.has_project ?? ""))
        )
        .sort((a, b) => (Number(b.potential_value_usd) || 0) - (Number(a.potential_value_usd) || 0)),
    [rows, filterCustomer, filterTrack, filterProject]
  );

  const pageRows = filtered.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const plotLayout = (h = 350, marginOverride?: Record<string, number>) => ({
    paper_bgcolor: isDark ? "#111827" : "white",
    plot_bgcolor: isDark ? "#111827" : "white",
    font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
    margin: marginOverride ?? { t: 50, b: 60, l: 60, r: 40 },
    height: h,
    showlegend: false,
  });

  const tableHeaders = [
    "customer_name", "task_deal_id", "solution_track", "has_project",
    "potential_value_usd", "potential_use_case", "potential_task_ws", "potential_task_status",
    "potential_task_end", "potential_task_end_fy",
  ].filter((h) => rows.length > 0 && h in rows[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Solution vs Project</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">LCI Eligible Deals — Solution Track vs Project Status</p>
        </div>
      </div>

      {dataQ.isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400">No data available.</p>
        </div>
      ) : (
        <>
          {/* Executive Summary (KPIs) */}
          <div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Executive Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <KPI label="Total Deals" value={totalDeals.toLocaleString()} accent="blue" />
              <KPI label="Total Clients" value={totalCustomers.toLocaleString()} accent="blue" />
              <KPI label="Total Potential Value" value={fmtUSD(totalValue)} accent="green" />
            </div>
          </div>

          {/* Visual Insights */}
          <div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Visual Insights</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1: Potential Value by Solution Track (No Project) */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <Plot
                  data={[{
                    type: "bar" as const,
                    x: trackEntries.map((e) => e[0]),
                    y: trackEntries.map((e) => e[1]),
                    marker: { color: "#1f77b4" },
                    text: trackEntries.map((e) => fmtUSD(e[1])),
                    textposition: "outside" as const,
                  }]}
                  layout={{ ...plotLayout(350), title: { text: "Potential Value by Solution Track (No Project)", font: { size: 12 } } }}
                  useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                />
              </div>

              {/* Chart 2: Project Status Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <Plot
                  data={[{
                    type: "pie" as const,
                    labels: STATUS_ORDER,
                    values: STATUS_ORDER.map((s) => projectStatusAgg[s] ?? 0),
                    hole: 0.45,
                    marker: { colors: STATUS_ORDER.map((s) => STATUS_COLOR_MAP[s] ?? "#636EFA") },
                    textinfo: "percent+label" as const,
                    hovertemplate: "<b>%{label}</b><br>Solution Tracks: %{value}<br>Percentage: %{percent}<extra></extra>",
                  }]}
                  layout={{ ...plotLayout(350), title: { text: "Project Status Distribution", font: { size: 12 } }, showlegend: false }}
                  useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
                />
              </div>
            </div>
          </div>

          {/* Chart 3: Top 10 Use Cases (No Project) */}
          {topUC.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <Plot
                data={[{
                  type: "bar" as const,
                  x: topUC.map((e) => e[1]),
                  y: topUC.map((e) => e[0]),
                  orientation: "h" as const,
                  marker: { color: "#636EFA" },
                  text: topUC.map((e) => String(e[1])),
                  textposition: "outside" as const,
                }]}
                layout={{
                  ...plotLayout(400, { t: 60, b: 40, l: 360, r: 20 }),
                  title: { text: "Solution Track : Use Case (No Project) — Top 10 by Deals", font: { size: 12 } },
                  yaxis: { autorange: "reversed" as const },
                }}
                useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Filters (affect table only)</p>
              {(filterCustomer.length > 0 || filterTrack.length > 0 || filterProject.length > 0) && (
                <button
                  onClick={() => { setFilterCustomer([]); setFilterTrack([]); setFilterProject([]); }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MultiSelectDropdown label="Client" options={customers} selected={filterCustomer} onChange={setFilterCustomer} placeholder="All Clients" />
              <MultiSelectDropdown label="Solution" options={tracks} selected={filterTrack} onChange={setFilterTrack} placeholder="All Solutions" />
              <MultiSelectDropdown label="Has Project" options={projectStatuses} selected={filterProject} onChange={setFilterProject} placeholder="All Statuses" />
            </div>
          </div>

          {/* Detailed View Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{filtered.length} records — Detailed View</p>
              <button
                onClick={() =>
                  exportToXlsx(
                    filtered as unknown as Record<string, unknown>[],
                    tableHeaders.map((h) => ({ key: h, label: h })),
                    "lci_solution_vs_project_detailed_view",
                    "Detailed View"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Download size={13} /> Export Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {tableHeaders.map((h) => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {tableHeaders.map((h) => (
                        <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                          {h === "potential_value_usd" ? fmtUSD(Number(r[h]) || 0) : (r[h] == null ? "—" : String(r[h]))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={tablePage}
              pageSize={tablePageSize}
              total={filtered.length}
              onPageChange={setTablePage}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={(size) => { setTablePageSize(size); setTablePage(1); }}
            />
          </div>
        </>
      )}
    </div>
  );
}
