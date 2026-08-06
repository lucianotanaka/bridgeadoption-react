import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Table, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, ReportTaskDetail } from "@/api/tasks";

type ReportId = "task_list" | "task_detail" | null;

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((s) => s !== val));
    else onChange([...selected, val]);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {selected.slice(0, 2).map((s) => (
              <span key={s} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded">
                {s.length > 18 ? s.slice(0, 18) + "…" : s}
              </span>
            ))}
            {selected.length > 2 && <span className="text-xs text-gray-500 dark:text-gray-400">+{selected.length - 2}</span>}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{placeholder ?? "Select..."}</span>
        )}
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No options</p>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function exportToExcel(rows: Record<string, unknown>[], columns: { key: string; label: string }[], fileName: string) {
  const header = columns.map((c) => c.label).join(",");
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = rows.map((r) => columns.map((c) => escape(r[c.key])).join(","));
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Task List Report ─────────────────────────────────────────────────────────

const TASK_LIST_COLUMNS: { key: string; label: string }[] = [
  { key: "task_id", label: "ID" },
  { key: "task_type_name", label: "Type" },
  { key: "task_reference", label: "Reference" },
  { key: "task_owner_name", label: "Owner" },
  { key: "task_customer_name", label: "Client" },
  { key: "task_created_in", label: "Created In" },
  { key: "task_created_by_name", label: "Created By" },
  { key: "task_priority", label: "Priority" },
  { key: "task_status_name", label: "Status" },
  { key: "task_status_justification", label: "Justification" },
  { key: "task_start", label: "Start" },
  { key: "task_end", label: "End" },
  { key: "task_start_performed", label: "Start Performed" },
  { key: "task_end_performed", label: "End Performed" },
  { key: "task_booking_date", label: "Booking Date" },
  { key: "task_booking_amount", label: "Booking Amount" },
  { key: "task_deal_id", label: "Deal ID" },
  { key: "task_ws", label: "WS" },
  { key: "task_completed_pct", label: "Completed (%)" },
  { key: "task_track", label: "Track" },
  { key: "task_subtrack", label: "Subtrack" },
  { key: "task_value", label: "Value" },
  { key: "task_currency", label: "Currency" },
];

function TaskListReport({ tasks }: { tasks: TaskItem[] }) {
  const { t } = useTranslation();

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportToExcel(tasks as unknown as Record<string, unknown>[], TASK_LIST_COLUMNS, `${today}_task_list.csv`);
  };

  if (tasks.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">{t("task.noTasksFound")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              {TASK_LIST_COLUMNS.map((c) => (
                <th key={c.key} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((tsk) => (
              <tr key={tsk.task_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {TASK_LIST_COLUMNS.map((c) => {
                  const raw = (tsk as Record<string, unknown>)[c.key];
                  let display: string;
                  if (c.key.includes("task_start") || c.key.includes("task_end") || c.key === "task_booking_date" || c.key === "task_created_in") {
                    display = raw ? fmtDate(String(raw)) : "—";
                  } else {
                    display = raw != null && raw !== "" ? String(raw) : "—";
                  }
                  return <td key={c.key} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Download size={13} /> {t("common.export")}
        </button>
      </div>
    </div>
  );
}

// ─── Task Detail Report ───────────────────────────────────────────────────────

function ActivityPieSummary({ summary }: { summary: ReportTaskDetail["activity_status_summary"] }) {
  const total = summary.reduce((acc, s) => acc + s.activity_count, 0) || 1;
  const colors = ["#19A3FC", "#4CAF50", "#FF7A00", "#B22000", "#94a3b8", "#8b5cf6", "#f472b6"];

  let cumulative = 0;
  const segments = summary.map((s, i) => {
    const fraction = s.activity_count / total;
    const start = cumulative;
    cumulative += fraction;
    return { ...s, start, end: cumulative, color: colors[i % colors.length] };
  });

  const R = 45;
  const C = 50;

  const arcPath = (start: number, end: number) => {
    const a0 = start * 2 * Math.PI - Math.PI / 2;
    const a1 = end * 2 * Math.PI - Math.PI / 2;
    const x0 = C + R * Math.cos(a0);
    const y0 = C + R * Math.sin(a0);
    const x1 = C + R * Math.cos(a1);
    const y1 = C + R * Math.sin(a1);
    const largeArc = end - start > 0.5 ? 1 : 0;
    return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="140" viewBox="0 0 100 100">
        {segments.map((s, i) => (
          <path key={i} d={arcPath(s.start, s.end)} fill={s.color} stroke="white" strokeWidth="0.5" />
        ))}
        <circle cx={C} cy={C} r={22} fill="white" className="dark:fill-gray-900" />
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.activity_status_name} ({s.activity_count} · {(s.percentage * 100).toFixed(0)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

const SCHEDULE_COLUMNS: { key: string; label: string }[] = [
  { key: "seq", label: "#" },
  { key: "name", label: "Task" },
  { key: "start_expected", label: "Start Expected" },
  { key: "end_expected", label: "End Expected" },
  { key: "effort_expected", label: "Effort Exp. (h)" },
  { key: "start_performed", label: "Start Performed" },
  { key: "end_performed", label: "End Performed" },
  { key: "effort_performed", label: "Effort Perf. (h)" },
  { key: "completed_pct", label: "Completed (%)" },
  { key: "status_name", label: "Status" },
];

function ScheduleTable({ schedule, taskId }: { schedule: ReportTaskDetail["schedule"]; taskId: number }) {
  const { t } = useTranslation();

  const handleExport = () => {
    exportToExcel(schedule as unknown as Record<string, unknown>[], SCHEDULE_COLUMNS, `schedule_task_${taskId}.csv`);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              {SCHEDULE_COLUMNS.map((c) => (
                <th key={c.key} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 ${row.is_task_row ? "bg-blue-50/50 dark:bg-blue-900/10 font-semibold" : ""}`}>
                {SCHEDULE_COLUMNS.map((c) => {
                  const raw = (row as Record<string, unknown>)[c.key];
                  let display: string;
                  if (c.key.includes("start") || c.key.includes("end")) {
                    display = raw ? fmtDate(String(raw)) : "—";
                  } else if (c.key === "name") {
                    display = row.is_task_row ? String(raw ?? "—") : `    ${String(raw ?? "—")}`;
                  } else {
                    display = raw != null && raw !== "" ? String(raw) : "—";
                  }
                  return <td key={c.key} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Download size={13} /> {t("common.export")}
        </button>
      </div>
    </div>
  );
}

const ACTIVITY_DETAIL_COLUMNS: { key: string; label: string }[] = [
  { key: "activity_seq", label: "Num" },
  { key: "activity_wbs", label: "WBS" },
  { key: "activity_name", label: "Activity" },
  { key: "activity_start", label: "Start Expected" },
  { key: "activity_end", label: "End Expected" },
  { key: "activity_completed", label: "Completed" },
  { key: "activity_status_name", label: "Status" },
  { key: "activity_scope", label: "Scope" },
];

function ActivityDetailList({ activities }: { activities: ReportTaskDetail["activities"] }) {
  if (activities.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-3">No activities.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((a, i) => (
        <div key={a.activity_id ?? i} className="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px] mb-1.5">
            {ACTIVITY_DETAIL_COLUMNS.filter((c) => c.key !== "activity_scope").map((c) => {
              const raw = (a as Record<string, unknown>)[c.key];
              let display: string;
              if (c.key === "activity_start" || c.key === "activity_end") {
                display = raw ? fmtDate(String(raw)) : "—";
              } else if (c.key === "activity_completed") {
                const v = typeof raw === "number" ? raw : Number(raw ?? 0);
                display = `${Math.round(v * 100)}%`;
              } else {
                display = raw != null && raw !== "" ? String(raw) : "—";
              }
              return (
                <div key={c.key}>
                  <p className="text-gray-400 dark:text-gray-500 uppercase font-medium">{c.label}</p>
                  <p className="text-gray-700 dark:text-gray-300">{display}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Scope:</span> {String(a.activity_scope ?? "—")}
          </p>
        </div>
      ))}
    </div>
  );
}

function TaskDetailReport({ taskId }: { taskId: number }) {
  const detailQuery = useQuery({
    queryKey: ["report-task-detail", taskId],
    queryFn: () => tasksApi.getReportTaskDetail(taskId).then((r) => r.data),
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = detailQuery.data;
  if (!data || !data.task) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No data.</p>;
  }

  const { task, activities, schedule, activity_status_summary } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center">
          <ActivityPieSummary summary={activity_status_summary} />
        </div>
        <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-400 uppercase text-[10px]">ID:</span> <span className="text-gray-700 dark:text-gray-300 font-medium">{task.task_id}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Priority:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_priority ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Status:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_status_name ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Client:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_customer_name ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">CSM:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_owner_name ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Deal ID:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_deal_id ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Reference:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_reference ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">WS:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_ws ?? "—"}</span></div>
            <div><span className="text-gray-400 uppercase text-[10px]">Track:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_track ?? "—"}</span></div>
            <div className="sm:col-span-3"><span className="text-gray-400 uppercase text-[10px]">Subtrack:</span> <span className="text-gray-700 dark:text-gray-300">{task.task_subtrack ?? "—"}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Schedule</h4>
        <ScheduleTable schedule={schedule} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Activity Detail</h4>
        <ActivityDetailList activities={activities} />
      </div>
    </div>
  );
}

// ─── Main Reports Tab ─────────────────────────────────────────────────────────

export default function TaskReportsTab() {
  const { t } = useTranslation();
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedOwnerNames, setSelectedOwnerNames] = useState<string[]>([]);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<ReportId>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const ownersQuery = useQuery({
    queryKey: ["report-owners"],
    queryFn: () => tasksApi.getReportOwners().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const owners = ownersQuery.data ?? [];
  const ownerOptions = owners.map((o) => o.task_owner_name);
  const ownerIds = owners
    .filter((o) => selectedOwnerNames.includes(o.task_owner_name))
    .map((o) => o.task_owner_id);

  const hasOwners = ownerIds.length > 0;

  const filterOptionsQuery = useQuery({
    queryKey: ["report-filter-options", ownerIds, selectedTaskTypes, selectedClients, selectedStatuses],
    queryFn: () =>
      tasksApi
        .getReportFilterOptions({
          owner_ids: ownerIds,
          task_type_names: selectedTaskTypes,
          client_names: selectedClients,
          status_names: selectedStatuses,
        })
        .then((r) => r.data),
    enabled: hasOwners,
    staleTime: 30 * 1000,
  });

  const dynOptions = filterOptionsQuery.data;

  const tasksMutation = useMutation<TaskItem[], Error, void>({
    mutationFn: () =>
      tasksApi
        .getReportTasks({
          owner_ids: ownerIds,
          task_type_names: selectedTaskTypes,
          client_names: selectedClients,
          status_names: selectedStatuses,
        })
        .then((r) => r.data),
  });

  const handleOwnerChange = (vals: string[]) => {
    setSelectedOwnerNames(vals);
    setSelectedTaskTypes([]);
    setSelectedClients([]);
    setSelectedStatuses([]);
    setActiveReport(null);
    setSelectedTaskId(null);
  };

  const handleFilterChange = (setter: (v: string[]) => void) => (vals: string[]) => {
    setter(vals);
    setActiveReport(null);
  };

  const handleClearAll = () => {
    setSelectedOwnerNames([]);
    setSelectedTaskTypes([]);
    setSelectedClients([]);
    setSelectedStatuses([]);
    setActiveReport(null);
    setSelectedTaskId(null);
  };

  const handleRunReport = (reportId: ReportId) => {
    setActiveReport(reportId);
    setSelectedTaskId(null);
    if (hasOwners) tasksMutation.mutate();
  };

  const reportTasks = tasksMutation.data ?? [];
  const taskIdOptions = reportTasks.map((t) => t.task_id);

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {t("task.reports")}
          </button>
          {selectedOwnerNames.length > 0 && (
            <button onClick={handleClearAll} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              {t("task.clearAll")}
            </button>
          )}
        </div>

        {panelOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MultiSelect
              label={t("task.filterOwner")}
              options={ownerOptions}
              selected={selectedOwnerNames}
              onChange={handleOwnerChange}
              placeholder={t("task.filterAllOwners")}
            />
            <MultiSelect
              label={t("task.filterTaskType")}
              options={dynOptions?.task_types ?? []}
              selected={selectedTaskTypes}
              onChange={handleFilterChange(setSelectedTaskTypes)}
              placeholder={t("task.filterAllTypes")}
              disabled={!hasOwners}
            />
            <MultiSelect
              label={t("task.filterClient")}
              options={dynOptions?.clients ?? []}
              selected={selectedClients}
              onChange={handleFilterChange(setSelectedClients)}
              placeholder={t("task.filterAllClients")}
              disabled={!hasOwners}
            />
            <MultiSelect
              label={t("task.filterStatus")}
              options={dynOptions?.statuses ?? []}
              selected={selectedStatuses}
              onChange={handleFilterChange(setSelectedStatuses)}
              placeholder={t("task.filterAllStatuses")}
              disabled={!hasOwners}
            />
          </div>
        )}
      </div>

      {/* Report cards */}
      {hasOwners && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleRunReport("task_list")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                activeReport === "task_list"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Table size={14} /> Task List
            </button>
            <button
              onClick={() => handleRunReport("task_detail")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                activeReport === "task_detail"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <FileText size={14} /> Task Details
            </button>
          </div>

          {activeReport && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {tasksMutation.isPending ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeReport === "task_list" ? (
                <TaskListReport tasks={reportTasks} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task ID</label>
                    <select
                      value={selectedTaskId ?? ""}
                      onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
                      className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {taskIdOptions.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  {selectedTaskId ? <TaskDetailReport taskId={selectedTaskId} /> : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!hasOwners && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("task.filterOwner")}: {t("task.filterAllOwners")}</p>
        </div>
      )}
    </div>
  );
}
