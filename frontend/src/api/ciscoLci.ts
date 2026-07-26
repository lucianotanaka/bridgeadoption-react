import apiClient from "./client";

export interface LCISummary {
  fy: number | null;
  total_tasks: number;
  total_stages: number;
  total_approved_stages: number;
  total_awaiting_stages: number;
  total_ongoing_stages: number;
  total_lost_stages: number;
  tasks_awaiting_opt_in: number;
  tasks_lost_opt_in_pending: number;
  fin_potential: number;
  fin_approved: number;
  fin_lost: number;
  fin_conversion_rate: number;
}

export interface LCIStageStatus {
  status: string;
  total_value: number;
  count: number;
}

export interface LCITerminationStatus {
  termination_status: string;
  count: number;
}

export interface LCIBurnupMonth {
  month: string;
  cum_approved: number;
  cum_lost: number;
  cum_potential: number;
  conversion_rate: number;
}

export interface LCIBurnup {
  months: LCIBurnupMonth[];
  fy: number;
}

export interface LCIYoY {
  fy: number;
  fy_label: string;
  approved: number;
  lost: number;
  potential: number;
  conversion_rate: number;
  lost_rate: number;
}

export interface LCIStageRow {
  lci_task_id: number;
  lci_client_name?: string;
  lci_solution?: string;
  lci_use_case?: string;
  lci_ws?: string;
  lci_deal_id?: string;
  lci_csm_name?: string;
  lci_stage_id: number;
  lci_stage_name?: string;
  lci_stage_ws?: string;
  lci_stage_value?: number;
  lci_stage_approval_value?: number;
  lci_stage_status_name?: string;
  lci_stage_end_fy?: number;
  stage_start_date?: string;
  stage_end_date?: string;
  termination_status?: string;
  lci_stage_approval_date?: string;
  lci_stage_approval_fy?: number;
  stage_amount_usd?: number;
}

export const ciscoLciApi = {
  getFiscalYears: () =>
    apiClient.get<number[]>("/adoption/cisco-lci/fiscal-years"),
  getSummary: (fy?: number) =>
    apiClient.get<LCISummary>(`/adoption/cisco-lci/summary${fy ? `?fy=${fy}` : ""}`),
  getByStageStatus: (fy?: number) =>
    apiClient.get<LCIStageStatus[]>(`/adoption/cisco-lci/by-stage-status${fy ? `?fy=${fy}` : ""}`),
  getTerminationStatus: (fy?: number) =>
    apiClient.get<LCITerminationStatus[]>(`/adoption/cisco-lci/termination-status${fy ? `?fy=${fy}` : ""}`),
  getBurnup: (fy: number) =>
    apiClient.get<LCIBurnup>(`/adoption/cisco-lci/burnup?fy=${fy}`),
  getYoY: () =>
    apiClient.get<LCIYoY[]>("/adoption/cisco-lci/yoy"),
  getStages: (fy: number | undefined, stageStatus: string) => {
    const params = new URLSearchParams({ stage_status: stageStatus });
    if (fy) params.append("fy", String(fy));
    return apiClient.get<LCIStageRow[]>(`/adoption/cisco-lci/stages?${params.toString()}`);
  },
};
