import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Save, X, RefreshCw } from "lucide-react";
import apiClient from "@/api/client";

interface LCIRecord { customer_id: number; customer_name: string; Track: string; qty_project: number; pm_name: string; }
interface TaskGroup { group_key: string; track: string; party_id: string; tasks: LCITask[]; }
interface LCITask {
  task_id: number; task_customer_id?: number; task_customer_name?: string; task_start?: string; task_end?: string;
  task_status_id?: number; task_status_name?: string; task_deal_id?: string; task_cr_party_id?: string;
  task_ws?: string; task_track?: string; task_subtrack?: string; task_value?: number; task_opt_in_flag?: number;
}
interface ProjectItem { project_id: number; project_ov?: string; project_name?: string; }

const lciApi = {
  getList: () => apiClient.get<LCIRecord[]>("/tasks/lci-viability/list"),
  getTasks: (customerId: number, track: string) =>
    apiClient.get<TaskGroup[]>("/tasks/lci-viability/tasks?customer_id=" + customerId + "&track=" + encodeURIComponent(track)),
  getJustifications: () => apiClient.get<string[]>("/tasks/lci-viability/justifications"),
  getProjectsInProgress: (customerId: number) =>
    apiClient.get<ProjectItem[]>("/tasks/lci-viability/projects-in-progress?customer_id=" + customerId),
  saveGroup: (body: {
    group_tasks: LCITask[]; new_statuses: Record<number, string>; cancellation_justification?: string;
    project_id?: number; new_project_ov?: string; new_project_name?: string; customer_id?: number; customer_name?: string;
  }) => apiClient.post<{ success: boolean; errors: string[]; updated_tasks: { task_id: number; new_status: string }[] }>(
    "/tasks/lci-viability/save-group", body
  ),
};

const STATUS_OPTIONS = ["OPEN", "ON HOLD", "IN PROGRESS", "CANCELLED"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

function TasksTable({ tasks, statuses, onStatusChange }: {
  tasks: LCITask[];
  statuses: Record<number, StatusOption>;
  onStatusChange: (taskId: number, newStatus: string) => void;
}) {
  return (
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
          {tasks.map((tsk) => (
            <tr key={tsk.task_id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1.5 px-2 font-mono text-gray-500 dark:text-gray-400">{tsk.task_id}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[80px] truncate">{tsk.task_subtrack ?? "-"}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{tsk.task_deal_id ?? "-"}</td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{tsk.task_ws ?? "-"}</td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{fmtDate(tsk.task_start)}</td>
              <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{fmtDate(tsk.task_end)}</td>
              <td className="py-1.5 px-2 text-gray-600 dark:text-gray-300">{tsk.task_value != null ? String(tsk.task_value) : "-"}</td>
              <td className="py-1.5 px-2">
                <select
                  value={statuses[tsk.task_id] ?? "OPEN"}
                  onChange={(e) => onStatusChange(tsk.task_id, e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InProgressProjectForm({
  projects, selectedProjectId, setSelectedProjectId,
  newProjectOv, setNewProjectOv, newProjectName, setNewProjectName,
  existingProjectSelected, newProjectStarted,
}: {
  projects: ProjectItem[];
  selectedProjectId: string;
  setSelectedProjectId: (v: string) => void;
  newProjectOv: string;
  setNewProjectOv: (v: string) => void;
  newProjectName: string;
  setNewProjectName: (v: string) => void;
  existingProjectSelected: boolean;
  newProjectStarted: boolean;
}) {
  return (
    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
        1 task will move to IN PROGRESS. Other tasks in the group will be CANCELLED. A project must be linked to save.
      </p>
      <div>
        <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Existing Project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={newProjectStarted}
          className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none disabled:opacity-50"
        >
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.project_id} value={String(p.project_id)}>
              {(p.project_ov ?? p.project_name ?? ("#" + p.project_id)) + (p.project_name ? " - " + p.project_name : "")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">New OV</label>
          <input
            type="text"
            value={newProjectOv}
            onChange={(e) => setNewProjectOv(e.target.value)}
            disabled={existingProjectSelected}
            className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">New Project Name</label>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            disabled={existingProjectSelected}
            className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

function CancelJustificationForm({ justifications, value, onChange }: {
  justifications: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2">
      <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Cancel Justification *</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Select justification...</option>
        {justifications.map((j) => (
          <option key={j} value={j}>{j}</option>
        ))}
      </select>
    </div>
  );
}

function TaskGroupPanel(props: {
  group: TaskGroup;
  justifications: string[];
  customerId?: number;
  customerName?: string;
  onSaved: () => void;
}) {
  const { group, justifications, customerId, customerName, onSaved } = props;
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
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectOv, setNewProjectOv] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const values = Object.values(statuses);
  const hasInProgress = values.some((v) => v === "IN PROGRESS");
  const allOnHold = values.length > 0 && values.every((v) => v === "ON HOLD");
  const allCancelled = values.length > 0 && values.every((v) => v === "CANCELLED");
  const effectiveCustomerId = customerId ?? group.tasks[0]?.task_customer_id;

  const projectsQuery = useQuery({
    queryKey: ["lci-projects-in-progress", effectiveCustomerId],
    queryFn: () => lciApi.getProjectsInProgress(effectiveCustomerId as number).then((r) => r.data),
    enabled: hasInProgress && !!effectiveCustomerId,
    staleTime: 2 * 60 * 1000,
  });
  const projects = projectsQuery.data ?? [];

  const existingProjectSelected = Boolean(selectedProjectId);
  const newProjectStarted = Boolean(newProjectOv.trim() || newProjectName.trim());
  const hasProjectLink = existingProjectSelected || (newProjectOv.trim().length > 0 && newProjectName.trim().length > 0);
  const canSave = (hasInProgress && hasProjectLink) || allOnHold || (allCancelled && cancelJustification.trim().length > 0);

  const saveMutation = useMutation<
    { success: boolean; errors: string[]; updated_tasks: { task_id: number; new_status: string }[] },
    Error,
    void
  >({
    mutationFn: () =>
      lciApi.saveGroup({
        group_tasks: group.tasks,
        new_statuses: statuses as Record<number, string>,
        cancellation_justification: allCancelled ? cancelJustification : undefined,
        project_id: hasInProgress && selectedProjectId ? parseInt(selectedProjectId, 10) : undefined,
        new_project_ov: hasInProgress && !selectedProjectId ? (newProjectOv.trim() || undefined) : undefined,
        new_project_name: hasInProgress && !selectedProjectId ? (newProjectName.trim() || undefined) : undefined,
        customer_id: effectiveCustomerId,
        customer_name: customerName,
      }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.success) {
        setSuccessMsg("OK - " + data.updated_tasks.length + " task(s) updated");
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
    setSelectedProjectId("");
    setNewProjectOv("");
    setNewProjectName("");
    setSuccessMsg("");
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Track: <span className="text-blue-600 dark:text-blue-400">{group.track}</span>
            {group.party_id ? (
              <> - Party: <span className="text-purple-600 dark:text-purple-400">{group.party_id}</span></>
            ) : null}
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

      <TasksTable tasks={group.tasks} statuses={statuses} onStatusChange={handleStatusChange} />

      {hasInProgress && (
        <InProgressProjectForm
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          newProjectOv={newProjectOv}
          setNewProjectOv={setNewProjectOv}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          existingProjectSelected={existingProjectSelected}
          newProjectStarted={newProjectStarted}
        />
      )}

      {allOnHold && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
          All tasks will move to ON HOLD with justification "IN REVIEW".
        </p>
      )}

      {allCancelled && (
        <CancelJustificationForm
          justifications={justifications}
          value={cancelJustification}
          onChange={setCancelJustification}
        />
      )}

      {successMsg && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{successMsg}</p>}
      {saveMutation.data && !saveMutation.data.success && saveMutation.data.errors.length > 0 && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">Errors: {saveMutation.data.errors.join("; ")}</p>
      )}
    </div>
  );
}

function LCIFilters({
  clientOptions, solutionOptions, pmOptions,
  filterClient, setFilterClient, filterSolution, setFilterSolution, filterPM, setFilterPM,
}: {
  clientOptions: string[]; solutionOptions: string[]; pmOptions: string[];
  filterClient: string; setFilterClient: (v: string) => void;
  filterSolution: string; setFilterSolution: (v: string) => void;
  filterPM: string; setFilterPM: (v: string) => void;
}) {
  return (
    <div className="space-y-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Client</label>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
          {clientOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Solution/Track</label>
        <select value={filterSolution} onChange={(e) => setFilterSolution(e.target.value)}
          className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
          {solutionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">PM</label>
        <select value={filterPM} onChange={(e) => setFilterPM(e.target.value)}
          className="w-full mt-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none">
          {pmOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function LCIViabilityPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [lciIdx, setLciIdx] = useState(0);
  const [taskGroupIdx, setTaskGroupIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClient, setFilterClient] = useState("All");
  const [filterSolution, setFilterSolution] = useState("All");
  const [filterPM, setFilterPM] = useState("All");

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

  const filtered = allRecords.filter((r) => {
    if (filterClient !== "All" && r.customer_name !== filterClient) return false;
    if (filterSolution !== "All") {
      const tracks = (r.Track ?? "").split(",").map((x) => x.trim());
      if (!tracks.includes(filterSolution)) return false;
    }
    if (filterPM !== "All") {
      const pms = (r.pm_name ?? "").split(",").map((x) => x.trim());
      if (!pms.includes(filterPM)) return false;
    }
    return true;
  });

  const clientOptions = ["All", ...Array.from(new Set(allRecords.map((r) => r.customer_name).filter(Boolean)))];
  const solutionOptions = [
    "All",
    ...Array.from(
      new Set(
        allRecords
          .flatMap((r) => (r.Track ?? "").split(",").map((x) => x.trim()))
          .filter(Boolean)
      )
    ),
  ];
  const pmOptions = [
    "All",
    ...Array.from(
      new Set(
        allRecords
          .flatMap((r) => (r.pm_name ?? "").split(",").map((x) => x.trim()))
          .filter(Boolean)
      )
    ),
  ];

  const currentRecord = filtered[Math.min(lciIdx, filtered.length - 1)];

  const tasksQuery = useQuery({
    queryKey: ["lci-tasks", currentRecord?.customer_id, currentRecord?.Track],
    queryFn: () =>
      currentRecord
        ? lciApi.getTasks(currentRecord.customer_id, currentRecord.Track).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!currentRecord,
    staleTime: 2 * 60 * 1000,
  });

  const groups: TaskGroup[] = tasksQuery.data ?? [];
  const currentGroup = groups[Math.min(taskGroupIdx, groups.length - 1)];

  if (listQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LCI Viability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cisco LCI Task viability analysis</p>
        </div>
        <button
          onClick={() => void qc.invalidateQueries({ queryKey: ["lci-viability-list"] })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={13} /> {t("common.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">LCI Records</p>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={
                "text-xs px-2 py-1 rounded-lg border transition-colors " +
                (showFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800")
              }
            >
              Filter
            </button>
          </div>

          {showFilters && (
            <LCIFilters
              clientOptions={clientOptions}
              solutionOptions={solutionOptions}
              pmOptions={pmOptions}
              filterClient={filterClient}
              setFilterClient={(v) => { setFilterClient(v); setLciIdx(0); }}
              filterSolution={filterSolution}
              setFilterSolution={(v) => { setFilterSolution(v); setLciIdx(0); }}
              filterPM={filterPM}
              setFilterPM={(v) => { setFilterPM(v); setLciIdx(0); }}
            />
          )}

          {currentRecord ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{currentRecord.customer_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Solution: {currentRecord.Track}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Project: {currentRecord.qty_project !== 0 ? "YES" : "NO"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PM: {currentRecord.pm_name}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No records.</p>
          )}

          <div className="flex items-center gap-2 justify-between">
            <button
              onClick={() => { setLciIdx(Math.max(lciIdx - 1, 0)); setTaskGroupIdx(0); }}
              disabled={lciIdx === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">{lciIdx + 1} / {filtered.length}</span>
            <button
              onClick={() => { setLciIdx(Math.min(lciIdx + 1, filtered.length - 1)); setTaskGroupIdx(0); }}
              disabled={lciIdx >= filtered.length - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                Tasks - {currentRecord?.customer_name ?? "-"}
              </p>
              {groups.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTaskGroupIdx(Math.max(taskGroupIdx - 1, 0))}
                    disabled={taskGroupIdx === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Group {taskGroupIdx + 1} / {groups.length}</span>
                  <button
                    onClick={() => setTaskGroupIdx(Math.min(taskGroupIdx + 1, groups.length - 1))}
                    disabled={taskGroupIdx >= groups.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {tasksQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-400 dark:text-gray-500">No eligible tasks found for this LCI record.</p>
            </div>
          ) : currentGroup ? (
            <TaskGroupPanel
              key={currentGroup.group_key}
              group={currentGroup}
              justifications={justQuery.data ?? []}
              customerId={currentRecord?.customer_id}
              customerName={currentRecord?.customer_name}
              onSaved={() => void tasksQuery.refetch()}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
