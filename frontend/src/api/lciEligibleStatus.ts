import apiClient from "@/api/client";

export interface ExecChartPoint {
  month_year_label: string;
  month_fy_order: number;
  count: number;
  value_usd: number;
  pct_of_month: number;
  stages_summary: string;
}

export interface ExecChartResponse {
  fy: number;
  months_order: string[];
  categories: Record<string, ExecChartPoint[]>;
}

export interface CategoryBreakdownPoint {
  month_year_label: string;
  month_fy_order: number;
  value_usd: number;
  pct_in_category_month: number;
  pct_in_total_month: number;
}

export interface CategoryBreakdownResponse {
  fy: number;
  category: string;
  months_order: string[];
  stages: Record<string, CategoryBreakdownPoint[]>;
}

export interface PortfolioSummaryRow {
  client: string;
  solution_track: string;
  use_case: string;
  total_stages: number;
  not_start: number;
  in_progress: number;
  lost: number;
  success: number;
  total_stage_value_usd: number;
  approval_value_usd: number;
  open_value_usd: number;
  success_value_usd: number;
}

export interface ExecutionDetailRow {
  client: string;
  deal_id: string;
  lci_ws: string;
  stage_ws: string;
  stage_name: string;
  track: string;
  use_case: string;
  month: string;
  status: string;
  executive_category: string;
  stage_value_usd: number;
  approval_value_usd: number;
  stage_start: string | null;
  stage_end: string | null;
}

export const lciEligibleStatusApi = {
  getFiscalYears: () => apiClient.get<number[]>("/adoption/lci-eligible-status/fiscal-years"),
  getExecChart: (fy: number) => apiClient.get<ExecChartResponse>("/adoption/lci-eligible-status/exec-chart", { params: { fy } }),
  getCategoryBreakdown: (fy: number, category: string) =>
    apiClient.get<CategoryBreakdownResponse>("/adoption/lci-eligible-status/category-breakdown", { params: { fy, category } }),
  getPortfolioSummary: (fy?: number) =>
    apiClient.get<PortfolioSummaryRow[]>("/adoption/lci-eligible-status/portfolio-summary", { params: fy ? { fy } : {} }),
  getExecutionDetail: (fy?: number) =>
    apiClient.get<ExecutionDetailRow[]>("/adoption/lci-eligible-status/execution-detail", { params: fy ? { fy } : {} }),
};
