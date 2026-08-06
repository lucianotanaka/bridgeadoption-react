import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Plot from "react-plotly.js";
import { lciEligibleStatusApi } from "@/api/lciEligibleStatus";
import type {
  ExecChartPoint,
  CategoryBreakdownPoint,
  PortfolioSummaryRow,
  ExecutionDetailRow,
} from "@/api/lciEligibleStatus";
import { exportToXlsx } from "@/utils/exportXlsx";
import Pagination from "@/components/ui/Pagination";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";

// ─── constants ────────────────────────────────────────────────────────────────

const EXEC_CATEGORIES = ["Not Started", "In Progress", "Lost", "Success"] as const;
type ExecCategory = typeof EXEC_CATEGORIES[number];

const CATEGORY_COLORS: Record<ExecCategory, string> = {
  "Not Started": "#98A2B3",
  "In Progress": "#175CD3",
  Lost: "#D92D20",
  Success: "#12B76A",
};

const STAGE_PALETTE = [
  "#7F56D9", "#06AED4", "#F79009", "#EE46BC", "#6172F3",
  "#12B76A", "#F04438", "#8098F9", "#36BFFA", "#FDB022",
  "#A4BCFD", "#6CE9A6", "#FDA29B", "#BDB4FE", "#FD6F8E",
  "#53B1FD", "#FEC84B", "#9E77ED", "#32D583", "#FF692E",
  "#84CAFF", "#98A2B3", "#C11574", "#717BBC", "#0BA5EC",
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (v == null || isNaN(v)) return "0";
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const plotLayout = (isDark: boolean) => ({
  paper_bgcolor: isDark ? "#111827" : "white",
  plot_bgcolor: isDark ? "#111827" : "white",
  font: { color: isDark ? "#d1d5db" : "#374151", size: 11 },
  margin: { t: 40, b: 60, l: 60, r: 40 },
});

// ─── Main executive chart (grouped bars, 4 categories x months) ─────────────

function ExecChart({
  monthsOrder,
  categories,
  isDark,
  fy,
}: {
  monthsOrder: string[];
  categories: Record<string, ExecChartPoint[]>;
  isDark: boolean;
  fy: number;
}) {
  const traces = EXEC_CATEGORIES.map((cat) => {
    const points = categories[cat] ?? [];
    const byLabel = new Map(points.map((p) => [p.month_year_label, p]));
    const ordered = monthsOrder.map((m) => byLabel.get(m));
    return {
      type: "bar" as const,
      name: cat,
      x: monthsOrder,
      y: ordered.map((p) => p?.value_usd ?? 0),
      marker: { color: CATEGORY_COLORS[cat] },
      text: ordered.map((p) => (p && p.value_usd > 0 ? fmtUSD(p.value_usd) : "")),
      textposition: "outside" as const,
      customdata: ordered.map((p) => [p?.count ?? 0, p?.pct_of_month ?? 0, p?.value_usd ?? 0, p?.stages_summary ?? "-"]),
      hovertemplate:
        `Month: %{x}<br>Category: ${cat}<br>Count: %{customdata[0]}<br>` +
        "Percent in Month (by count): %{customdata[1]:.1%}<br>" +
        "Value: %{customdata[2]:,.0f} USD<br>Stages: %{customdata[3]}<extra></extra>",
    };
  });

  return (
    <Plot
      data={traces}
      layout={{
        ...plotLayout(isDark),
        title: { text: `LCI Eligible Status - Executive Monthly View - FY ${fy}`, font: { size: 13 } },
        barmode: "group" as const,
        xaxis: { title: "Month / Year (FY Apr–Mar)", categoryorder: "array" as const, categoryarray: monthsOrder },
        yaxis: { title: "Value (USD)" },
        legend: { title: { text: "Status Category" } },
        hovermode: "closest" as const,
        height: 420,
      }}
      useResizeHandler
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
    />
  );
}

// ─── Category stacked chart (stage composition per month) ───────────────────

function CategoryStackedChart({
  monthsOrder,
  stages,
  isDark,
  category,
  fy,
}: {
  monthsOrder: string[];
  stages: Record<string, CategoryBreakdownPoint[]>;
  isDark: boolean;
  category: string;
  fy: number;
}) {
  const stageNames = Object.keys(stages).sort();

  if (stageNames.length === 0) {
    return <p className="text-xs text-gray-400 py-6 text-center">No data for {category}.</p>;
  }

  const traces = stageNames.map((stageName, idx) => {
    const points = stages[stageName] ?? [];
    const byLabel = new Map(points.map((p) => [p.month_year_label, p]));
    const ordered = monthsOrder.map((m) => byLabel.get(m));
    return {
      type: "bar" as const,
      name: stageName,
      x: monthsOrder,
      y: ordered.map((p) => p?.value_usd ?? 0),
      marker: { color: STAGE_PALETTE[idx % STAGE_PALETTE.length] },
      customdata: ordered.map((p) => [p?.value_usd ?? 0, p?.pct_in_category_month ?? 0, p?.pct_in_total_month ?? 0]),
      hovertemplate:
        `Month: %{x}<br>Category: ${category}<br>Stage: ${stageName}<br>` +
        "Value: %{customdata[0]:,.0f} USD<br>" +
        "Percent in Category Month: %{customdata[1]:.1%}<br>" +
        "Percent in Total Month: %{customdata[2]:.1%}<extra></extra>",
    };
  });

  // Totals per month for text-only trace on top of stacked bars
  const totals = monthsOrder.map((m) => {
    let sum = 0;
    for (const stageName of stageNames) {
      const p = (stages[stageName] ?? []).find((x) => x.month_year_label === m);
      sum += p?.value_usd ?? 0;
    }
    return sum;
  });

  const totalsTrace = {
    type: "scatter" as const,
    mode: "text" as const,
    x: monthsOrder,
    y: totals,
    text: totals.map((v) => (v > 0 ? fmtUSD(v) : "")),
    textposition: "top center" as const,
    showlegend: false,
    hoverinfo: "skip" as const,
  };

  return (
    <Plot
      data={[...traces, totalsTrace]}
      layout={{
        ...plotLayout(isDark),
        title: { text: `${category} - Stage Composition - FY ${fy}`, font: { size: 13 } },
        barmode: "stack" as const,
        xaxis: { title: "Month / Year (FY Apr–Mar)", categoryorder: "array" as const, categoryarray: monthsOrder },
        yaxis: { title: "Value (USD)" },
        legend: { title: { text: "Stage" } },
        hovermode: "closest" as const,
        height: 420,
      }}
      useResizeHandler
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
    />
  );
}

// ─── Category breakdown tab content (fetches on demand) ────────────────────

function CategoryTabContent({ fy, category, isDark }: { fy: number; category: string; isDark: boolean }) {
  const q = useQuery({
    queryKey: ["lci-eligible-status", "category-breakdown", fy, category],
    queryFn: () => lciEligibleStatusApi.getCategoryBreakdown(fy, category).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (q.isLoading) {
    return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const data = q.data;
  if (!data) return <p className="text-xs text-gray-400 py-6 text-center">No data.</p>;

  return (
    <div>
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{category}</h5>
      <CategoryStackedChart monthsOrder={data.months_order} stages={data.stages} isDark={isDark} category={category} fy={fy} />
    </div>
  );
}

// ─── Table 1: Executive Portfolio Summary ────────────────────────────────────

const PORTFOLIO_COLUMNS: { key: string; label: string }[] = [
  { key: "client", label: "Client" },
  { key: "solution_track", label: "Solution/Track" },
  { key: "use_case", label: "Use Case" },
  { key: "total_stages", label: "Total Stages" },
  { key: "not_start", label: "Not Start" },
  { key: "in_progress", label: "In Progress" },
  { key: "lost", label: "Lost" },
  { key: "success", label: "Success" },
  { key: "total_stage_value_usd", label: "Total Stage Value USD" },
  { key: "approval_value_usd", label: "Approval Value USD" },
  { key: "open_value_usd", label: "Open Value USD" },
  { key: "success_value_usd", label: "Success Value USD" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function PortfolioSummaryTable({ rows, page, pageSize }: { rows: PortfolioSummaryRow[]; page: number; pageSize: number }) {
  if (!rows.length) return <p className="text-xs text-gray-400 py-4 text-center">No data.</p>;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {PORTFOLIO_COLUMNS.map((c) => (
              <th key={c.key} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
              {PORTFOLIO_COLUMNS.map((c) => {
                const raw = (r as unknown as Record<string, unknown>)[c.key];
                const isUsd = c.key.includes("value_usd");
                const display = isUsd ? fmtUSD(Number(raw) || 0) : String(raw ?? "—");
                return <td key={c.key} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Table 2: Stage Execution Detail ─────────────────────────────────────────

const EXECUTION_COLUMNS: { key: string; label: string }[] = [
  { key: "client", label: "Client" },
  { key: "deal_id", label: "Deal ID" },
  { key: "lci_ws", label: "LCI WS" },
  { key: "stage_ws", label: "Stage WS" },
  { key: "stage_name", label: "Stage Name" },
  { key: "track", label: "Track" },
  { key: "use_case", label: "Use Case" },
  { key: "month", label: "Month" },
  { key: "status", label: "Status" },
  { key: "executive_category", label: "Executive Category" },
  { key: "stage_value_usd", label: "Stage Value USD" },
  { key: "approval_value_usd", label: "Approval Value USD" },
  { key: "stage_start", label: "Stage Start" },
  { key: "stage_end", label: "Stage End" },
];

function ExecutionDetailTable({ rows, page, pageSize }: { rows: ExecutionDetailRow[]; page: number; pageSize: number }) {
  if (!rows.length) return <p className="text-xs text-gray-400 py-4 text-center">No data.</p>;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0">
            {EXECUTION_COLUMNS.map((c) => (
              <th key={c.key} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
              {EXECUTION_COLUMNS.map((c) => {
                const raw = (r as unknown as Record<string, unknown>)[c.key];
                const isUsd = c.key.includes("value_usd");
                const display = isUsd ? fmtUSD(Number(raw) || 0) : (raw == null ? "—" : String(raw));
                return <td key={c.key} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[160px] truncate">{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CiscoLCIEligibleStatusPage({ fy: effectiveFY }: { fy: number }) {
  const isDark = document.documentElement.classList.contains("dark");
  const [activeCategory, setActiveCategory] = useState<ExecCategory>("Not Started");
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [portfolioPageSize, setPortfolioPageSize] = useState(25);
  const [executionPage, setExecutionPage] = useState(1);
  const [executionPageSize, setExecutionPageSize] = useState(25);

  // ─── Shared filters for both tables (Client / Solution-Track / Use Case) ──
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterTrack, setFilterTrack] = useState<string[]>([]);
  const [filterUseCase, setFilterUseCase] = useState<string[]>([]);

  const execChartQuery = useQuery({
    queryKey: ["lci-eligible-status", "exec-chart", effectiveFY],
    queryFn: () => lciEligibleStatusApi.getExecChart(effectiveFY).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const portfolioQuery = useQuery({
    queryKey: ["lci-eligible-status", "portfolio-summary", effectiveFY],
    queryFn: () => lciEligibleStatusApi.getPortfolioSummary(effectiveFY).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const executionQuery = useQuery({
    queryKey: ["lci-eligible-status", "execution-detail", effectiveFY],
    queryFn: () => lciEligibleStatusApi.getExecutionDetail(effectiveFY).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const allPortfolioRows = portfolioQuery.data ?? [];
  const allExecutionRows = executionQuery.data ?? [];

  // ─── Cascading, dynamic filter options (derived from the union of both tables) ──
  const clientOptions = useMemo(() => {
    const fromPortfolio = allPortfolioRows
      .filter((r) => (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.use_case ?? "")))
      .map((r) => r.client ?? "");
    const fromExecution = allExecutionRows
      .filter((r) => (!filterTrack.length || filterTrack.includes(r.track ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.use_case ?? "")))
      .map((r) => r.client ?? "");
    return [...new Set([...fromPortfolio, ...fromExecution])].filter(Boolean).sort();
  }, [allPortfolioRows, allExecutionRows, filterTrack, filterUseCase]);

  const trackOptions = useMemo(() => {
    const fromPortfolio = allPortfolioRows
      .filter((r) => (!filterClient.length || filterClient.includes(r.client ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.use_case ?? "")))
      .map((r) => r.solution_track ?? "");
    const fromExecution = allExecutionRows
      .filter((r) => (!filterClient.length || filterClient.includes(r.client ?? "")) && (!filterUseCase.length || filterUseCase.includes(r.use_case ?? "")))
      .map((r) => r.track ?? "");
    return [...new Set([...fromPortfolio, ...fromExecution])].filter(Boolean).sort();
  }, [allPortfolioRows, allExecutionRows, filterClient, filterUseCase]);

  const useCaseOptions = useMemo(() => {
    const fromPortfolio = allPortfolioRows
      .filter((r) => (!filterClient.length || filterClient.includes(r.client ?? "")) && (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")))
      .map((r) => r.use_case ?? "");
    const fromExecution = allExecutionRows
      .filter((r) => (!filterClient.length || filterClient.includes(r.client ?? "")) && (!filterTrack.length || filterTrack.includes(r.track ?? "")))
      .map((r) => r.use_case ?? "");
    return [...new Set([...fromPortfolio, ...fromExecution])].filter(Boolean).sort();
  }, [allPortfolioRows, allExecutionRows, filterClient, filterTrack]);

  const portfolioRows = useMemo(
    () =>
      allPortfolioRows.filter(
        (r) =>
          (!filterClient.length || filterClient.includes(r.client ?? "")) &&
          (!filterTrack.length || filterTrack.includes(r.solution_track ?? "")) &&
          (!filterUseCase.length || filterUseCase.includes(r.use_case ?? ""))
      ),
    [allPortfolioRows, filterClient, filterTrack, filterUseCase]
  );

  const executionRows = useMemo(
    () =>
      allExecutionRows.filter(
        (r) =>
          (!filterClient.length || filterClient.includes(r.client ?? "")) &&
          (!filterTrack.length || filterTrack.includes(r.track ?? "")) &&
          (!filterUseCase.length || filterUseCase.includes(r.use_case ?? ""))
      ),
    [allExecutionRows, filterClient, filterTrack, filterUseCase]
  );

  const handleExportPortfolio = () => {
    exportToXlsx(portfolioRows as unknown as Record<string, unknown>[], PORTFOLIO_COLUMNS, `lci_exec_portfolio_summary_fy_${effectiveFY}`, "Portfolio Summary");
  };

  const handleExportExecution = () => {
    exportToXlsx(executionRows as unknown as Record<string, unknown>[], EXECUTION_COLUMNS, `lci_stage_execution_detail_fy_${effectiveFY}`, "Execution Detail");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Eligible Status</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">LCI Eligible Status — Executive Monthly View</p>
        </div>
      </div>

      {/* Block 1: Executive Monthly View */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Executive Monthly View</p>
        {execChartQuery.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : execChartQuery.data ? (
          <ExecChart monthsOrder={execChartQuery.data.months_order} categories={execChartQuery.data.categories} isDark={isDark} fy={effectiveFY} />
        ) : (
          <p className="text-xs text-gray-400 py-4">No data.</p>
        )}
      </div>

      {/* Block 2: Analytical View by Category (tabs) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Analytical View by Category</p>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          {EXEC_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeCategory === cat ? "bg-blue-600 text-white" : "bg-transparent text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <CategoryTabContent fy={effectiveFY} category={activeCategory} isDark={isDark} />
      </div>

      {/* Filters — affect both Executive Portfolio Summary and Stage Execution Detail */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Filters (affect both tables below)</p>
          {(filterClient.length > 0 || filterTrack.length > 0 || filterUseCase.length > 0) && (
            <button
              onClick={() => { setFilterClient([]); setFilterTrack([]); setFilterUseCase([]); }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MultiSelectDropdown label="Client" options={clientOptions} selected={filterClient} onChange={setFilterClient} placeholder="All Clients" />
          <MultiSelectDropdown label="Solution/Track" options={trackOptions} selected={filterTrack} onChange={setFilterTrack} placeholder="All Tracks" />
          <MultiSelectDropdown label="Use Case" options={useCaseOptions} selected={filterUseCase} onChange={setFilterUseCase} placeholder="All Use Cases" />
        </div>
      </div>

      {/* Block 3: Executive Tables */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Executive Portfolio Summary</p>
          <button onClick={handleExportPortfolio} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Download size={13} /> Export Excel
          </button>
        </div>
        {portfolioQuery.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <PortfolioSummaryTable rows={portfolioRows} page={portfolioPage} pageSize={portfolioPageSize} />
            <Pagination
              page={portfolioPage}
              pageSize={portfolioPageSize}
              total={portfolioRows.length}
              onPageChange={setPortfolioPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setPortfolioPageSize(size); setPortfolioPage(1); }}
            />
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Stage Execution Detail</p>
          <button onClick={handleExportExecution} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Download size={13} /> Export Excel
          </button>
        </div>
        {executionQuery.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <ExecutionDetailTable rows={executionRows} page={executionPage} pageSize={executionPageSize} />
            <Pagination
              page={executionPage}
              pageSize={executionPageSize}
              total={executionRows.length}
              onPageChange={setExecutionPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setExecutionPageSize(size); setExecutionPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
