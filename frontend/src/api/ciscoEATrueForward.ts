/**
 * Cisco EA True Forward — API client.
 * Endpoint: GET /api/adoption/cisco-ea-true-forward/report-data
 */
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/** One row of merged metering + task data (after server-side enrichment). */
export interface TrueForwardRow {
  // Metering
  mcea_client_id: number | null;
  mcea_subscription: string | null;
  mcea_suite_name: string | null;
  mcea_sku: string | null;
  mcea_domain: string | null;
  mcea_virtual_account: string | null;
  mcea_status: string | null;
  mcea_start_date: string | null;
  mcea_end_date: string | null;
  mcea_total_purchased: number | null;
  mcea_generated: number | null;
  mcea_balance: number | null;
  mcea_update: string | null;
  // Customer
  customer_name: string | null;
  // Derived (server-computed)
  days_to_contract_end: number | null;
  total_purchased: number;
  total_consumed: number;
  balance: number;
  overconsumption: number;
  consumption_pct: number;
  is_overconsumption: boolean;
  has_task: boolean;
  task_is_open: boolean;
  // Task (type 35)
  t_task_id: number | null;
  t_status: number | null;
  t_status_label: string;
  t_track: string | null;
  t_subtrack: string | null;
  t_reference: string | null;
  t_start: string | null;
  t_end: string | null;
  t_created_date: string | null;
}

/** One row from the CCW subscription report. */
export interface CcwRow {
  end_customer: string | null;
  offer_name: string | null;
  consumption_status: string | null;
  pending_tf_effective_date: string | null;
  ea_pending_tf_effective_date: string | null;
  next_true_forward: string | null;
  subscription_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  tf_overage: number | null;
  buying_program_id: string | null;
  provisioning_status: string | null;
  ea_consumed_suite_value_percent: number | null;
  ea_exceptional_growth_anniversary: string | null;
  ea_exceptional_growth_tf_eligible: string | null;
  // Derived (server-computed)
  _days_to_end: number | null;
  [key: string]: unknown;
}

export interface TrueForwardReportData {
  rows: TrueForwardRow[];
  ccw: CcwRow[];
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function fetchTrueForwardReportData(): Promise<TrueForwardReportData> {
  const res = await apiClient.get<TrueForwardReportData>(
    "/adoption/cisco-ea-true-forward/report-data"
  );
  return res.data;
}
