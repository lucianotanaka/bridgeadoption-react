import apiClient from "./client";

export interface TaskKPI {
  total_active: number;
  n1_critical: number;
  n2_critical: number;
  follow_up_today: number;
  follow_up_next_7d: number;
  planned_overdue: number;
  activity_overdue_tasks: number;
  open_count: number;
  inprogress_count: number;
  onhold_count: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  revenue_tasks: number;
  expense_tasks: number;
  service_impact_tasks: number;
  revenue_brl: number;
  revenue_usd: number;
  expense_brl: number;
  expense_usd: number;
}

export interface TaskItem {
  task_id: number;
  task_owner_name?: string;
  task_owner_id?: number;
  task_temp_owner_name?: string;
  task_temp_owner_id?: number;
  task_customer_name?: string;
  task_customer_id?: number;
  task_type_name?: string;
  task_type_id?: number;
  task_status_id?: number;
  task_status_name?: string;
  task_status_reclassified?: string;
  task_priority?: string;
  task_start?: string;
  task_end?: string;
  task_start_performed?: string;
  task_end_performed?: string;
  task_completed?: number;
  task_finance_type?: string;
  critical_level?: string;
  critical_reason?: string;
  next_followup_any_effective?: string;
  is_service_impacting?: number;
  task_value_brl?: number;
  task_value_usd?: number;
  task_value?: number;
  task_ws?: string;
  task_deal_id?: string;
  task_track?: string;
  task_subtrack?: string;
  task_reference?: string;
  task_remark?: string;
  task_description?: string;
  task_project_id?: number;
  task_project_name?: string;
  task_ea_flag?: number;
  task_telemetry_flag?: number;
  task_opt_in_flag?: number;
  task_eligible?: string;
  spi_lifecycle_stage?: string;
  spi_last_checked_date?: string;
  spi_telemetry_type?: string;
  task_created_by_name?: string;
  task_created_in?: string;
  task_currency?: string;
  task_status_justification?: string;
  task_end_fy?: number | string;
  task_booking_date?: string;
  task_booking_amount?: number;
  task_architecture?: string;
  task_solution_domain?: string;
  task_cr_party_id?: string;
  task_cr_party_name?: string;
  task_tasktype_id?: number;
  __score?: number;
  [key: string]: unknown;
}

export interface TaskOverview {
  tasks: TaskItem[];
  values: TaskItem[];
}

export interface FilterOptions {
  owners: string[];
  task_types: string[];
  clients: string[];
  ws_list: string[];
  tracks: string[];
  deal_ids: string[];
  statuses: string[];
}

export interface FilterRequest {
  owner_names?: string[];
  task_type_names?: string[];
  client_names?: string[];
  ws_list?: string[];
  tracks?: string[];
  deal_ids?: string[];
  status_names?: string[];
  task_ids?: number[];
}

export interface CSMItem {
  csm_id: number;
  csm_name: string;
  [key: string]: unknown;
}

export interface TaskTypeItem {
  tasktype_id: number;
  tasktype_name: string;
  [key: string]: unknown;
}

export interface CreateTaskRequest {
  task_tasktype_id: number;
  task_customer_id: number;
  task_owner_id: number;
  task_start: string;
  task_end: string;
  task_priority: string;
  task_currency?: string;
  task_reference?: string;
  task_track?: string;
  task_subtrack?: string;
  task_ws?: string;
  task_deal_id?: string;
  task_value?: number;
}

export interface StatusType {
  statustype_id: number;
  statustype_name: string;
  statustype_name_pt?: string;
  statustype_name_es?: string;
  [key: string]: unknown;
}

export interface ActivityItem {
  activity_id: number;
  activity_task_id?: number;
  activity_name?: string;
  activity_status?: number;
  activity_status_name?: string;
  activity_seq?: number;
  activity_start?: string;
  activity_end?: string;
  activity_start_performed?: string;
  activity_end_performed?: string;
  activity_completed?: number;
  activity_effort?: number;
  activity_effort_performed?: number;
  activity_value?: number;
  activity_currency?: string;
  activity_ws?: string;
  activity_deal_id?: string;
  activity_objective?: string;
  activity_scope?: string;
  activity_expected_results?: string;
  activity_track?: string;
  activity_sub_track?: string;
  activity_approved?: number;
  activity_approved_value?: number;
  activity_approved_currency?: string;
  activity_approval_date?: string;
  activity_approval_request_date?: string;
  activity_approval_fy?: number | string;
  activity_end_fy?: number | string;
  activity_backlog_value?: number;
  [key: string]: unknown;
}

export interface HistoryItem {
  taskrecord_id: number;
  taskrecord_task_id?: number;
  taskrecord_activity_id?: number;
  taskrecord_remark?: string;
  taskrecord_type?: string;
  taskrecord_status?: string;
  taskrecord_date?: string;
  taskrecord_updated_by?: string;
  taskrecord_next_followup?: string;
  [key: string]: unknown;
}

export interface FollowUpGroup {
  delayed: FollowUpItem[];
  today: FollowUpItem[];
  current_week: FollowUpItem[];
  next_week: FollowUpItem[];
}

export interface FollowUpItem {
  activity_id: number;
  task_id: number;
  activity_name?: string;
  task_customer_name?: string;
  task_type_name?: string;
  task_owner_id?: number;
  follow_up_date?: string;
}

export interface RACIItem {
  taskraci_id: number;
  taskraci_task_id?: number;
  taskraci_activity_id?: number;
  taskraci_person_id?: number;
  taskraci_person_type?: string;
  taskraci_responsibility?: string;
  taskraci_enabled?: number;
  person_name?: string;
  person_email?: string;
  person_job_title?: string;
  person_telephone?: string;
  person_cellphone?: string;
  person_type_label?: string;
  person_company_name?: string;
  [key: string]: unknown;
}

export interface PersonItem {
  person_id: number;
  person_name: string;
  person_type?: string;
  person_company_id?: number;
  person_job_title?: string;
  [key: string]: unknown;
}

export interface CompanyItem {
  company_id: number;
  company_name: string;
  [key: string]: unknown;
}

export interface StatusJustificationItem {
  status_justification_id?: number;
  status_justification_status_id?: number;
  status_justification_en?: string;
  status_justification_pt?: string;
  status_justification_es?: string;
  [key: string]: unknown;
}

export interface ProjectItem {
  project_id: number;
  project_ov_name?: string;
  project_ov?: string;
  project_name?: string;
  project_status?: string;
  project_customer_id?: number;
  project_customer_name?: string;
  [key: string]: unknown;
}

export interface ProjectTeamItem {
  projteam_project_id?: number;
  projteam_member_name?: string;
  projteam_level_name?: string;
  projteam_project_customer_id?: number;
  [key: string]: unknown;
}

export interface ReportOwnerItem {
  task_owner_id: number;
  task_owner_name: string;
  [key: string]: unknown;
}

export interface ReportFilterRequest {
  owner_ids: number[];
  task_type_names?: string[];
  client_names?: string[];
  status_names?: string[];
}

export interface ReportFilterOptions {
  task_types: string[];
  clients: string[];
  statuses: string[];
}

export interface ReportScheduleRow {
  seq: number;
  name?: string;
  start_expected?: string;
  end_expected?: string;
  start_performed?: string;
  end_performed?: string;
  effort_expected?: number;
  effort_performed?: number;
  completed_pct?: number;
  status_name?: string;
  is_task_row?: boolean;
  [key: string]: unknown;
}

export interface ReportActivitySummary {
  activity_status_name: string;
  activity_count: number;
  percentage: number;
  [key: string]: unknown;
}

export interface ReportTaskDetail {
  task: TaskItem;
  activities: ActivityItem[];
  schedule: ReportScheduleRow[];
  activity_status_summary: ReportActivitySummary[];
}

export interface TaskDashboard {
  kpi: TaskKPI;
  overview: TaskOverview;
  action_queue: TaskItem[];
}

export const tasksApi = {
  // Unified dashboard — replaces /kpi + /overview + /action-queue (1 request instead of 3)
  getDashboard: (limit = 10) =>
    apiClient.get<TaskDashboard>(`/tasks/dashboard?limit=${limit}`),

  // Overview & KPI (kept for compatibility)
  getKPI: () => apiClient.get<TaskKPI>("/tasks/kpi"),
  getOverview: () => apiClient.get<TaskOverview>("/tasks/overview"),
  getActionQueue: (limit = 10) =>
    apiClient.get<TaskItem[]>(`/tasks/action-queue?limit=${limit}`),

  // Filter
  getFilterOptions: () => apiClient.get<FilterOptions>("/tasks/filter-options"),
  filterTasks: (body: FilterRequest) =>
    apiClient.post<TaskItem[]>("/tasks/filter", body),

  // Task Detail
  getTask: (taskId: number) =>
    apiClient.get<TaskItem>(`/tasks/detail/${taskId}`),
  updateTask: (taskId: number, data: Record<string, unknown>, history?: Record<string, unknown>) =>
    apiClient.put<{ success: boolean; history_id: number }>(`/tasks/detail/${taskId}`, { data, history }),

  // Activities
  getActivities: (taskId: number) =>
    apiClient.get<ActivityItem[]>(`/tasks/detail/${taskId}/activities`),
  getActivity: (activityId: number) =>
    apiClient.get<ActivityItem>(`/tasks/activities/${activityId}`),
  updateActivity: (activityId: number, data: Record<string, unknown>) =>
    apiClient.put<{ success: boolean }>(`/tasks/activities/${activityId}`, { data }),
  createActivity: (taskId: number, data: Record<string, unknown>) =>
    apiClient.post<{ success: boolean; activity_id: number }>(`/tasks/detail/${taskId}/activities`, { data }),

  // History
  getHistory: (taskId: number, activityId?: number) => {
    const params = activityId != null ? `?activity_id=${activityId}` : "";
    return apiClient.get<HistoryItem[]>(`/tasks/detail/${taskId}/history${params}`);
  },
  addHistory: (taskId: number, record: Record<string, unknown>) =>
    apiClient.post<{ success: boolean; record_id: number }>(`/tasks/detail/${taskId}/history`, {
      taskrecord_task_id: taskId,
      ...record,
    }),

  // Support lists
  getCsmList: () => apiClient.get<CSMItem[]>("/tasks/csm-list"),
  getStatusTypes: () => apiClient.get<StatusType[]>("/tasks/status-types"),
  getTaskTypes: () => apiClient.get<TaskTypeItem[]>("/tasks/task-types"),

  // New Task
  createTask: (data: CreateTaskRequest) =>
    apiClient.post<{ success: boolean; task_id: number }>("/tasks/new", data),

  // Follow-up
  getFollowUp: () => apiClient.get<FollowUpGroup>("/tasks/follow-up"),

  // RACI
  getRaci: (taskId: number, activityId?: number) => {
    const params = activityId != null ? `?activity_id=${activityId}` : "";
    return apiClient.get<RACIItem[]>(`/tasks/detail/${taskId}/raci${params}`);
  },
  addRaci: (taskId: number, data: { person_id: number; responsibility: string; activity_id?: number | null; person_type?: string; subtask_id?: number }) =>
    apiClient.post<{ success: boolean; raci_id: number }>(`/tasks/detail/${taskId}/raci`, data),
  updateRaci: (taskId: number, raciId: number, responsibility: string) =>
    apiClient.patch<{ success: boolean }>(`/tasks/detail/${taskId}/raci/${raciId}`, { responsibility }),
  removeRaci: (taskId: number, raciId: number) =>
    apiClient.delete<{ success: boolean }>(`/tasks/detail/${taskId}/raci/${raciId}`),
  getPersonList: (companyId?: number, internalOnly?: boolean) => {
    const parts: string[] = [];
    if (companyId != null) parts.push(`company_id=${companyId}`);
    if (internalOnly) parts.push(`internal_only=true`);
    const params = parts.length ? `?${parts.join("&")}` : "";
    return apiClient.get<PersonItem[]>(`/tasks/person-list${params}`);
  },
  createPerson: (data: {
    person_name: string;
    person_company_id?: number;
    person_job_title?: string;
    person_email?: string;
    person_telephone?: string;
    person_cellphone?: string;
    person_type?: string;
  }) => apiClient.post<{ success: boolean; person_id: number }>("/tasks/person-list", data),
  getCompanyList: () => apiClient.get<CompanyItem[]>("/tasks/company-list"),

  // Status justifications
  getStatusJustifications: (statusId?: number) => {
    const params = statusId != null ? `?status_id=${statusId}` : "";
    return apiClient.get<StatusJustificationItem[]>(`/tasks/status-justifications${params}`);
  },

  // Projects
  getProjects: (customerId: number) =>
    apiClient.get<ProjectItem[]>(`/tasks/projects?customer_id=${customerId}`),
  getProjectTeam: (customerId: number) =>
    apiClient.get<ProjectTeamItem[]>(`/tasks/project-team?customer_id=${customerId}`),

  // Reports
  getReportOwners: () => apiClient.get<ReportOwnerItem[]>("/tasks/reports/owners"),
  getReportFilterOptions: (body: ReportFilterRequest) =>
    apiClient.post<ReportFilterOptions>("/tasks/reports/filter-options", body),
  getReportTasks: (body: ReportFilterRequest) =>
    apiClient.post<TaskItem[]>("/tasks/reports/tasks", body),
  getReportTaskDetail: (taskId: number) =>
    apiClient.get<ReportTaskDetail>(`/tasks/reports/task-detail/${taskId}`),
};
