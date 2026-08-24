import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { ciscoLciApi } from "@/api/ciscoLci";
import type { LCIStageRow, LCIReportData } from "@/api/ciscoLci";
import { exportToXlsx } from "@/utils/exportXlsx";
import Pagination from "@/components/ui/Pagination";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtUSD(v: number | undefined | null): string {
  if (v == null || isNaN(Number(v))) return "$0";
  const n = Number(v);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number | undefined | null): string {
  if (v == null || isNaN(Number(v))) return "0%";
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? "text-gray-900 dark:text-gray-100"}`}>{value}</p>
    </div>
  );
}

// ─── stage status tab config ─────────────────────────────────────────────────

type StageTab = "approved" | "awaiting" | "ongoing" | "lost";

const STAGE_TABS: { key: StageTab; label: string; activeClass: string }[] = [
  { key: "approved", label: "Approved", activeClass: "bg-green-600 text-white" },
  { key: "awaiting", label: "Awaiting", activeClass: "bg-yellow-500 text-white" },
  { key: "ongoing", label: "In Progress", activeClass: "bg-blue-600 text-white" },
  { key: "lost", label: "Lost", activeClass: "bg-red-600 text-white" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── table columns ────────────────────────────────────────────────────────────

const STAGE_COLUMNS: { key: keyof LCIStageRow; label: string }[] = [
  { key: "lci_task_id", label: "Task" },
  { key: "lci_client_name", label: "Client" },
  { key: "lci_solution", label: "Solution" },
  { key: "lci_use_case", label: "Use Case" },
  { key: "lci_ws", label: "Task WS" },
  { key: "lci_stage_ws", label: "Activity WS" },
  { key: "lci_csm_name", label: "CSM" },
  { key: "lci_stage_name", label: "Stage" },
  { key: "stage_amount_usd", label: "Value USD" },
  { key: "lci_stage_status_name", label: "Status" },
  { key: "stage_start_date", label: "Start Date" },
  { key: "stage_end_date", label: "End Date" },
  { key: "termination_status", label: "Completion" },
];

// ─── badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const upper = status.toUpperCase();
  let color = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  if (upper.includes("COMPLETED") || upper.includes("CLOSED"))
    color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  else if (upper.includes("AWAITING"))
    color = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  else if (upper.includes("ONGOING") || upper.includes("IN PROGRESS"))
    color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  else if (upper.includes("LOST"))
    color = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status}</span>;
}

function CompletionBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const upper = status.toUpperCase();
  let color = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  if (upper === "ON-TIME") color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  else if (upper === "EARLY") color = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  else if (upper === "LATE") color = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status}</span>;
}

// ─── stages table ─────────────────────────────────────────────────────────────

function StagesTable({
  rows,
  page,
  pageSize,
}: {
  rows: LCIStageRow[];
  page: number;
  pageSize: number;
}) {
  if (!rows.length) {
    return (
      <p className="text-xs text-gray-400 py-4 text-center">
        No data for this filter combination.
      </p>
    );
  }
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0">
            {STAGE_COLUMNS.map((c) => (
              <th
                key={c.key}
                className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {STAGE_COLUMNS.map((c) => {
                const val = r[c.key];
                if (c.key === "stage_amount_usd") {
                  return (
                    <td
                      key={c.key}
                      className="py-1.5 px-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                    >
                      {fmtUSD(val as number)}
                    </td>
                  );
                }
                if (c.key === "lci_stage_status_name") {
                  return (
                    <td key={c.key} className="py-1.5 px-2 whitespace-nowrap">
                      <StatusBadge status={val as string} />
                    </td>
                  );
                }
                if (c.key === "termination_status") {
                  return (
                    <td key={c.key} className="py-1.5 px-2 whitespace-nowrap">
                      <CompletionBadge status={val as string} />
                    </td>
                  );
                }
                if (c.key === "lci_task_id") {
                  return (
                    <td
                      key={c.key}
                      className="py-1.5 px-2 font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap"
                    >
                      {val != null ? String(val) : "—"}
                    </td>
                  );
                }
                return (
                  <td
                    key={c.key}
                    className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[180px] truncate"
                    title={val != null ? String(val) : undefined}
                  >
                    {val != null ? String(val) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function CiscoLCIReportPage({ fy }: { fy: number }) {
  const [activeTab, setActiveTab] = useState<StageTab>("approved");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ─── filters: all multiselect + cascading ─────────────────────────────────
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterSolution, setFilterSolution] = useState<string[]>([]);
  const [filterUseCase, setFilterUseCase] = useState<string[]>([]);
  const [filterTaskWs, setFilterTaskWs] = useState<string[]>([]);

  function handleTabChange(tab: StageTab) {
    setActiveTab(tab);
    setPage(1);
    setFilterClient([]);
    setFilterSolution([]);
    setFilterUseCase([]);
    setFilterTaskWs([]);
  }

  function clearAllFilters() {
    setFilterClient([]);
    setFilterSolution([]);
    setFilterUseCase([]);
    setFilterTaskWs([]);
    setPage(1);
  }

  const hasActiveFilters =
    filterClient.length > 0 ||
    filterSolution.length > 0 ||
    filterUseCase.length > 0 ||
    filterTaskWs.length > 0;

  // ─── KPI data (unified endpoint) ──────────────────────────────────────────
  const reportQuery = useQuery({
    queryKey: ["cisco-lci", "report-data", fy],
    queryFn: () => ciscoLciApi.getReportData(fy).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // ─── stages (per-tab, lazy by status) ────────────────────────────────────
  const stagesQuery = useQuery({
    queryKey: ["cisco-lci", "stages", fy, activeTab],
    queryFn: () => ciscoLciApi.getStages(fy, activeTab).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const allRows: LCIStageRow[] = stagesQuery.data ?? [];
  const report = reportQuery.data as LCIReportData | undefined;
  const summary = report?.summary;
  const totals = report?.total_eligibles;

  // ─── cascading filter options ─────────────────────────────────────────────
  // Each set shows only values valid given the other 3 active filters.

  const clientOptions = useMemo(
    () =>
      [
        ...new Set(
          allRows
            .filter(
              (r) =>
                (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
                (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? "")) &&
                (!filterTaskWs.length || filterTaskWs.includes(r.lci_ws ?? ""))
            )
            .map((r) => r.lci_client_name ?? "")
            .filter(Boolean)
        ),
      ].sort(),
    [allRows, filterSolution, filterUseCase, filterTaskWs]
  );

  const solutionOptions = useMemo(
    () =>
      [
        ...new Set(
          allRows
            .filter(
              (r) =>
                (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
                (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? "")) &&
                (!filterTaskWs.length || filterTaskWs.includes(r.lci_ws ?? ""))
            )
            .map((r) => r.lci_solution ?? "")
            .filter(Boolean)
        ),
      ].sort(),
    [allRows, filterClient, filterUseCase, filterTaskWs]
  );

  const useCaseOptions = useMemo(
    () =>
      [
        ...new Set(
          allRows
            .filter(
              (r) =>
                (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
                (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
                (!filterTaskWs.length || filterTaskWs.includes(r.lci_ws ?? ""))
            )
            .map((r) => r.lci_use_case ?? "")
            .filter(Boolean)
        ),
      ].sort(),
    [allRows, filterClient, filterSolution, filterTaskWs]
  );

  const taskWsOptions = useMemo(
    () =>
      [
        ...new Set(
          allRows
            .filter(
              (r) =>
                (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
                (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
                (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? ""))
            )
            .map((r) => r.lci_ws ?? "")
            .filter(Boolean)
        ),
      ].sort(),
    [allRows, filterClient, filterSolution, filterUseCase]
  );

  // ─── filtered rows (all 4 filters applied) ────────────────────────────────
  const filteredRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (!filterClient.length || filterClient.includes(r.lci_client_name ?? "")) &&
          (!filterSolution.length || filterSolution.includes(r.lci_solution ?? "")) &&
          (!filterUseCase.length || filterUseCase.includes(r.lci_use_case ?? "")) &&
          (!filterTaskWs.length || filterTaskWs.includes(r.lci_ws ?? ""))
      ),
    [allRows, filterClient, filterSolution, filterUseCase, filterTaskWs]
  );

  // ─── tab counts from filtered rows ────────────────────────────────────────
  const tabCount = filteredRows.length;

  // ─── export ──────────────────────────────────────────────────────────────
  function handleExport() {
    exportToXlsx(
      filteredRows as unknown as Record<string, unknown>[],
      STAGE_COLUMNS as { key: string; label: string }[],
      `cisco_lci_stages_${activeTab}_fy${fy}`,
      activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cisco LCI Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Life Cycle Incentive — Stage Performance
        </p>
      </div>

      {/* KPI cards — Financial Overview */}
      {reportQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summary ? (
        <>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">
              💰 Financial Overview — FY {fy}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Total Potential" value={fmtUSD(summary.fin_potential)} />
              <KpiCard
                label="Total Captured"
                value={fmtUSD(summary.fin_approved)}
                color="text-green-500"
              />
              <KpiCard
                label="Total Lost"
                value={fmtUSD(summary.fin_lost)}
                color="text-red-500"
              />
              <KpiCard
                label="Conversion Rate"
                value={fmtPct(summary.fin_conversion_rate)}
                color="text-yellow-500"
              />
              {totals && (
                <>
                  <KpiCard label="Total Eligibles" value={fmtUSD(totals.total_eligibles)} />
                  <KpiCard label="Total Opt In" value={fmtUSD(totals.total_opt_in)} />
                </>
              )}
            </div>
          </div>

          {/* KPI cards — Operational Overview */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">
              🏁 Operational Overview
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <KpiCard label="Total Tasks" value={String(summary.total_tasks)} />
              <KpiCard label="Total Stages" value={String(summary.total_stages)} />
              <KpiCard
                label="Stages Ongoing"
                value={String(summary.total_ongoing_stages)}
                color="text-blue-500"
              />
              <KpiCard
                label="Stages Lost"
                value={String(summary.total_lost_stages)}
                color="text-red-500"
              />
              <KpiCard
                label="Stages Approved"
                value={String(summary.total_approved_stages)}
                color="text-green-500"
              />
              <KpiCard
                label="Stages Awaiting"
                value={String(summary.total_awaiting_stages)}
                color="text-yellow-500"
              />
              <KpiCard
                label="Tasks Awaiting Opt-In"
                value={String(summary.tasks_awaiting_opt_in)}
              />
              <KpiCard
                label="Tasks Lost Opt-In"
                value={String(summary.tasks_lost_opt_in_pending)}
                color="text-red-500"
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Stage tabs + filters + table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {/* Tab bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {STAGE_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? tab.activeClass
                      : "bg-transparent text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                  {isActive && tabCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {tabCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleExport}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
          >
            <Download size={13} /> Export Excel
          </button>
        </div>

        {/* Cascade filters */}
        <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Filters
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MultiSelectDropdown
              label="Client"
              options={clientOptions}
              selected={filterClient}
              onChange={(v) => { setFilterClient(v); setPage(1); }}
              placeholder="All Clients"
            />
            <MultiSelectDropdown
              label="Solution"
              options={solutionOptions}
              selected={filterSolution}
              onChange={(v) => { setFilterSolution(v); setPage(1); }}
              placeholder="All Solutions"
            />
            <MultiSelectDropdown
              label="Use Case"
              options={useCaseOptions}
              selected={filterUseCase}
              onChange={(v) => { setFilterUseCase(v); setPage(1); }}
              placeholder="All Use Cases"
            />
            <MultiSelectDropdown
              label="Task WS"
              options={taskWsOptions}
              selected={filterTaskWs}
              onChange={(v) => { setFilterTaskWs(v); setPage(1); }}
              placeholder="All Task WS"
            />
          </div>
        </div>

        {/* Record count */}
        {!stagesQuery.isLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""}
            {hasActiveFilters ? ` (filtered from ${allRows.length})` : ""}
          </p>
        )}

        {/* Table */}
        {stagesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <StagesTable rows={filteredRows} page={page} pageSize={pageSize} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredRows.length}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
