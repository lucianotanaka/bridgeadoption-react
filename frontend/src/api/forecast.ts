import apiClient from "./client";

export interface ForecastSummaryItem {
  category: "BACKLOG" | "ACHIEVED";
  value: number;
  value_fmt: string;
  percentage: number;
}

export interface ForecastByTaskType {
  task_type: string;
  category: string;
  value: number;
  pct: number;
}

export interface ForecastByOwner {
  owner: string;
  category: string;
  value: number;
  value_fmt: string;
}

export interface ForecastClientItem {
  client: string;
  category: string;
  value: number;
}

export interface ForecastClientData {
  all: ForecastClientItem[];
  top5_achieved: { client: string; value: number; value_fmt: string }[];
}

export interface IncentiveByFY {
  fy: number;
  count: number;
}

export interface IncentiveByFYType {
  fy: number;
  task_type: string;
  count: number;
}

export interface IncentiveStatusItem {
  status: string;
  count: number;
  pct: number;
}

export interface IncentiveByStatus {
  all: IncentiveStatusItem[];
  by_fy: (IncentiveStatusItem & { fy: number })[];
}

export interface IncentiveByCSM {
  owner: string;
  status: string;
  count: number;
}

export interface EffortItem {
  client?: string;
  use_case?: string;
  avg_days: number;
  avg_fmt: string;
  min_fmt: string;
  max_fmt: string;
}

export const forecastApi = {
  getFiscalYears: () =>
    apiClient.get<number[]>("/adoption/forecast/fiscal-years"),
  getSummary: (fy: number) =>
    apiClient.get<ForecastSummaryItem[]>(`/adoption/forecast/summary?fy=${fy}`),
  getByTaskType: (fy: number) =>
    apiClient.get<ForecastByTaskType[]>(`/adoption/forecast/by-task-type?fy=${fy}`),
  getByOwner: (fy: number) =>
    apiClient.get<ForecastByOwner[]>(`/adoption/forecast/by-owner?fy=${fy}`),
  getByClient: (fy: number) =>
    apiClient.get<ForecastClientData>(`/adoption/forecast/by-client?fy=${fy}`),
  getIncentiveByFY: () =>
    apiClient.get<IncentiveByFY[]>("/adoption/forecast/incentive/by-fy"),
  getIncentiveByFYType: () =>
    apiClient.get<IncentiveByFYType[]>("/adoption/forecast/incentive/by-fy-type"),
  getIncentiveByStatus: () =>
    apiClient.get<IncentiveByStatus>("/adoption/forecast/incentive/by-status"),
  getIncentiveByCSM: () =>
    apiClient.get<IncentiveByCSM[]>("/adoption/forecast/incentive/by-csm"),
  getEffortClient: () =>
    apiClient.get<EffortItem[]>("/adoption/forecast/incentive/effort-client"),
  getEffortUseCase: () =>
    apiClient.get<EffortItem[]>("/adoption/forecast/incentive/effort-use-case"),
};
