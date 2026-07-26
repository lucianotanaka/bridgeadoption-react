import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Save, X, RefreshCw } from "lucide-react";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LCIRecord {
  customer_id: number;
  customer_name: string;
  Track: string;
  qty_project: number;
  pm_name: string;
}

interface TaskGroup {
  group_key: string;
  track: string;
  party_id: string;
  tasks: LCITask[];
}

interface LCITask {
  task_id: number;
  task_customer_name?: string;
  task_start?: string;
  task_end?: string;
  task_status_id?: number;
  task_status_name?: string;
  task_deal_id?: string;
  task_cr_party_id?: string;
  task_ws?: string;
  task_track?: string;
  task_subtrack?: string;
  task_value?: number;
  task_opt_in_flag?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const lciApi = {
  getList: () => apiClient.get<LCIRecord[]>("/tasks/lci-viability/list"),
  getTasks: (customerId: number, track: string) =>
    apiClient.get<TaskGroup[]>(`/tasks/lci-viability/tasks?customer_id=${customerId}&track=${encodeURIComponent(track)}`),
  getJustifications: () => apiClient.get<string[]>("/tasks/lci-viability/justifications"),
  saveGroup: (body: {
    group_tasks: LCITask[];
    new_statuses: Record<number, string>;
    cancellation_justification?: string;
  }) => apiClient.post<{ success: boolean; errors: string[]; updated_tasks: { task_id: number; new_status: string }[] }>(
    "/tasks/lci-viability/save-group", body
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["OPEN", "ON HOLD", "IN PROGRESS", "CANCELLED"] as const;
type StatusOption = typeof STATUS_OPTIONS[number];

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}


// ─── Task Group Panel ─────────────────────────────────────────────────────────

function TaskGroupPanel({
  group,
  justifications,
  onSaved,
}: {
  group: TaskGroup;
  justifications: string[];
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [statuses, setStatuses] = useState<Record<number, StatusOption>>(() => {
    const init: Record<number, StatusOption> = {};
    group.tasks.forEach((t) => {
      const s = (t.task_status_name ?? "OPEN").toUpperCase() as StatusOption;
      init[t.task_id] = STATUS_OPTIONS.includes(s) ? s : "OPEN";
    });
    return init;
  });
  const [cancelJustification, setCancelJustification] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Determine state
  const values = Object.values(statuses);
  const hasInProgress = values.some((v) => v === "IN PROGRESS");
  const allOnHold = values.length > 0 && values.every((v) => v === "ON HOLD");
  const allCancelled = values.length > 0 && values.every((v) => v === "CANCELLED");

  // Can save?
  const canSave = hasInProgress || allOnHold || (allCancelled && cancelJustification.trim().length > 0);

  const saveMutation = useMutation<
    { success: boolean; errors: string[]; updated_tasks: { task_id: number; new_status: string }[] },
    Error,
    void
  >({
    mutationFn: () => lciApi.saveGroup({
      group_tasks: group.tasks,
      new_statuses: statuses as Record<number, string>,
      cancellation_justification: allCancelled ? cancelJustification : undefined,
    }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.success) {
        setSuccessMsg(`✓ ${data.updated_tasks.length} task(s) updated`);
        void qc.invalidateQueries({ queryKey: ["lci-tasks"] });
        onSaved();
      }
    },
  });

  const handleStatusChange = (taskId: number, newStatus: string) => {
    setStatuses((prev) => ({ ...prev, [taskId]: newStatus as StatusOption }));
    setSuccessMsg("");
  };

  const handleReset = () => {
    const reset: Record<number, StatusOption> = {};
    group.tasks.forEach((t) => {
      const s = (t.task_status_name ?? "OPEN").toUpperCase() as StatusOption;
      reset[t.task_id] = STATUS_OPTIONS.includes(s) ? s : "OPEN";
    });
    setStatuses(reset);
    setCancelJustification("");
    setSuccessMsg("");
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Track: <span className="text-blue-600 dark:text-blue-400">{group.track}</span>
            {group.party_id && <> • Party: <span className="text-purple-600 dark:text-purple-400">{group.party_id}</span></>}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{group.tasks.length} task(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Reset">
            <X size={14} />
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {saveMutation.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {/* Tasks table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {["Task ID", "Subtrack", "Deal ID", "WS", "Start", "End", "Value", "Status"].map((h) => (
                <th key={h} className="text-left py-1.5 px-2 text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.tasks.map((t) => (
              <tr key={t.task_id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1.5 px-2 font-mono text-gray-500 dark:text-gray-400">{t.task_id}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[80px] truncate">{t.task_subtrack ?? "—"}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{t.task_deal_id ?? "—"}</td>
                <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{t.task_ws ?? "—"}</td>
                <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{fmtDate(t.task_start)}</td>
                <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{fmtDate(t.task_end)}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-300">{t.task_value != null ? String(t.task_value) : "—"}</td>
                <td className="py-1.5 px-2">
                  <select
                    value={statuses[t.task_id] ?? "OPEN"}
                    onChange={(e) => handleStatusChange(t.task_id, e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* State indicators */}
      {hasInProgress && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">⚠ 1 task → IN PROGRESS, others → CANCELLED. Link a project to save.</p>
      )}
      {allOnHold && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">All tasks → ON HOLD with justification "IN REVIEW".</p>
      )}
      {allCancelled && (
        <div className="mt-2">
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Cancel Justification *</label>
          <select
            value={cancelJustification}
            onChange={(e) => setCancelJustification(e.target.value)}
            className="w-full mt-1 text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select justification...</option>
            {justifications.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      )}

      {successMsg && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{successMsg}</p>}
      {saveMutation.data && !saveMutation.data.success && saveMutation.data.errors.length > 0 && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">Errors: {saveMutation.data.errors.join("; ")}</p>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LCIViabilityPage() {
  const { t } = useTranslation();
  const [lciIdx, setLciIdx] = useState(0);
  const [filterClient, setFilterClient] = useState("All");
  const [filterSolution, setFilterSolution] = useState("All");
  const [filterPM, setFilterPM] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [taskGroupIdx, setTaskGroupIdx] = useState(0);
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["lci-viability-list"],
    queryFn: () => lciApi.getList().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const justQuery = useQuery({
    queryKey: ["lci-justifications"],
    queryFn: () => lciApi.getJustifications().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const allRecords: LCIRecord[] = listQuery.data ?? [];

  // Filter
  const filtered = allRecords.filter((r) => {
    if (filterClient !== "All" && r.customer_name !== filterClient) return false;
    if (filterSolution !== "All") {
      const tracks = r.Track.split(",").map((t) => t.trim());
      if (!tracks.includes(filterSolution)) return false;
    }
    if (filterPM !== "All") {
      const pms = r.pm_name.split(",").map((p) => p.trim());
      if (!pms.includes(filterPM)) return false;
    }
    return true;
  });

  const currentRecord = filtered[Math.min(lciIdx, filtered.length - 1)];

  const tasksQuery = useQuery({
    queryKey: ["lci-tasks", currentRecord?.customer_id, currentRecord?.Track],
    queryFn: () => currentRecord
      ? lciApi.getTasks(currentRecord.customer_id, currentRecord.Track).then((r) => r.data)
      : Promise.resolve([]),
    enabled: !!currentRecord,
    staleTime: 2 * 60 * 1000,
  });

  const groups: TaskGroup[] = tasksQuery.data ?? [];
  const currentGroup = groups[Math.min(taskGroupIdx, groups.length - 1)];

  // Filter options
  const clientOptions = ["All", ...new Set(allRecords.map((r) => r.customer_name))];
  const solutionOptions = ["All", ...new Set(allRecords.flatMap((r) => r.Track.split(",").map((t) => t.trim())))];
  const pmOptions = ["All", ...new Set(allRecords.flatMap((r) => r.pm_name.split(",").map((p) => p.trim())))];

  if (listQuery.isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LCI Viability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cisco LCI — Task viability analysis</p>
        </div>
        <button
          onClick={() => void qc.invalidateQueries({ queryKey: ["lci-viability-list"] })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={13} /> {t("common.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: LCI List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">LCI Records</p>
            <button onClick={() => setShowFilters(!showFilters)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${showFilters ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              Filter
            </button>
          </div>

          {showFilters && (
            <div className="space-y-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Client</label>
                <select value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setLciIdx(0); }} className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
                  {clientOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Solution/Track</label>
                <select value={filterSolution} onChange={(e) => { setFilterSolution(e.target.value); setLciIdx(0); }} className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
                  {solutionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">PM</label>
                <select value={filterPM} onChange={(e) => { setFilterPM(e.target.value); setLciIdx(0); }} className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
                  {pmOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Current LCI Record info */}
          {currentRecord ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{currentRecord.customer_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Solution: {currentRecord.Track}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Project: {currentRecord.qty_project !== 0 ? "YES" : "NO"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PM: {currentRecord.pm_name}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No records.</p>
          )}

          {/* LCI Navigation */}
          <div className="flex items-center gap-2 justify-between">
            <button onClick={() => { setLciIdx(Math.max(lciIdx - 1, 0)); setTaskGroupIdx(0); }} disabled={lciIdx === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">{lciIdx + 1} / {filtered.length}</span>
            <button onClick={() => { setLciIdx(Math.min(lciIdx + 1, filtered.length - 1)); setTaskGroupIdx(0); }} disabled={lciIdx >= filtered.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Right: Task Groups */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                Tasks — {currentRecord?.customer_name ?? "—"}
              </p>
              {groups.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setTaskGroupIdx(Math.max(taskGroupIdx - 1, 0))} disabled={taskGroupIdx === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Group {taskGroupIdx + 1} / {groups.length}</span>
                  <button onClick={() => setTaskGroupIdx(Math.min(taskGroupIdx + 1, groups.length - 1))} disabled={taskGroupIdx >= groups.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {tasksQuery.isLoading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-400 dark:text-gray-500">No eligible tasks found for this LCI record.</p>
            </div>
          ) : currentGroup ? (
            <TaskGroupPanel
              key={currentGroup.group_key}
              group={currentGroup}
              justifications={justQuery.data ?? []}
              onSaved={() => void tasksQuery.refetch()}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
