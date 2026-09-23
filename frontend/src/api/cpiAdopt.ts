import apiClient from "./client";

export interface CpiAdoptStageRow {
  task_id: number | null;
  activity_id: number | null;
  activity_seq?: number | null;
  activity_name?: string | null;
  activity_status?: string | null;
  activity_start?: string | null;
  activity_end?: string | null;
  time_elapsed_pct?: number | null;
  activity_completed?: number | null;
  lastest_info?: string | null;
  next_follow_up_info?: string | null;
  lastest_issue?: string | null;
  lastest_issue_status?: string | null;
  next_follow_up_issue?: string | null;
  lastest_blocker?: string | null;
  lastest_blocker_status?: string | null;
  next_follow_up_blocker?: string | null;
  [key: string]: unknown;
}

export interface CpiAdoptRow {
  task_id: number | null;
  task_ws: string | null;
  deal_id: string | null;
  cr_party_id: string | null;
  client: string | null;
  solution: string | null;
  use_case: string | null;
  opt_in: "Yes" | "No" | null;
  opt_in_status?: string | null;
  total_amount_usd: number | null;
  lost_amount_usd: number | null;
  claim_approved_amount_usd: number | null;
  payment_approved_amount_usd: number | null;
  approved_amount_usd: number | null;
  remaining_balance_usd: number | null;
  task_start: string | null;
  task_end: string | null;
  today: string | null;
  days_remaining: number | null;
  task_status: string | null;
  project: "No" | "Adoption" | "Yes" | null;
  project_ov: string | null;
  engineer: string | null;
  pm_csm: string | null;
  is_potential?: boolean;
  is_lost?: boolean;
  is_at_risk?: boolean;
  is_pipeline?: boolean;
  lastest_info?: string | null;
  next_follow_up_info?: string | null;
  lastest_issue?: string | null;
  lastest_issue_status?: string | null;
  next_follow_up_issue?: string | null;
  lastest_blocker?: string | null;
  lastest_blocker_status?: string | null;
  next_follow_up_blocker?: string | null;
  time_elapsed_pct?: number | null;
  task_completed?: number | null;
  stages?: CpiAdoptStageRow[];
  [key: string]: unknown;
}

export interface CpiAdoptSummary {
  total_tasks: number;
  with_project_count: number;
  potential_count: number;
  potential_value_usd: number;
  claim_approved_amount_usd: number;
  paid_amount_usd: number;
  lost_amount_usd: number;
  at_risk_amount_usd: number;
  pipeline_amount_usd: number;
}

export interface CpiAdoptFilterOptions {
  solutions: string[];
  statuses: string[];
  projects: string[];
  opt_in_statuses: string[];
}

export interface CpiAdoptFyRange {
  min_fy: number | null;
  max_fy: number | null;
}

export interface CpiAdoptFilters {
  client?: string;
  task_id?: string;
  task_ws?: string;
  deal_id?: string;
  solution?: string[];
  task_status?: string[];
  opt_in?: string[];
  project?: string[];
  timeline_stage?: string[];
  fy_start?: number;
  fy_end?: number;
}

function appendMultiValue(params: URLSearchParams, key: string, values?: string[]) {
  for (const value of values ?? []) {
    if (value) params.append(key, value);
  }
}

function buildQs(filters: CpiAdoptFilters): string {
  const params = new URLSearchParams();
  if (filters.client) params.append("client", filters.client);
  if (filters.task_id) params.append("task_id", filters.task_id);
  if (filters.task_ws) params.append("task_ws", filters.task_ws);
  if (filters.deal_id) params.append("deal_id", filters.deal_id);
  appendMultiValue(params, "solution", filters.solution);
  appendMultiValue(params, "task_status", filters.task_status);
  appendMultiValue(params, "opt_in", filters.opt_in);
  appendMultiValue(params, "project", filters.project);
  appendMultiValue(params, "timeline_stage", filters.timeline_stage);
  if (filters.fy_start != null) params.append("fy_start", String(filters.fy_start));
  if (filters.fy_end != null) params.append("fy_end", String(filters.fy_end));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const cpiAdoptApi = {
  getReport: (filters: CpiAdoptFilters = {}) =>
    apiClient.get<CpiAdoptRow[]>(`/cisco/cpi-adopt/report${buildQs(filters)}`),

  getFilters: (filters: CpiAdoptFilters = {}) =>
    apiClient.get<CpiAdoptFilterOptions>(`/cisco/cpi-adopt/filters${buildQs(filters)}`),

  getSummary: (filters: CpiAdoptFilters = {}) =>
    apiClient.get<CpiAdoptSummary>(`/cisco/cpi-adopt/summary${buildQs(filters)}`),

  getFyRange: () =>
    apiClient.get<CpiAdoptFyRange>("/cisco/cpi-adopt/fy-range"),
};
