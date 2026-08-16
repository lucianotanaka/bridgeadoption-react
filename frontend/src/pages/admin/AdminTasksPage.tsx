/**
 * AdminTasksPage — Admin: Adjust Task
 *
 * Migração do Streamlit admin_task.py para React.
 * Funcionalidades:
 *  - Filtros dinâmicos: task_id, ws, deal, track, subtrack (com cross-filter)
 *  - Tab 1 (Tarefas): tabela multi-seleção, Editar campos, Remover (bulk)
 *  - Tab 2 (Atividades): tabela single-seleção, Editar campos, Remover
 *  - Tab 3 (Registros): tabela read-only com info do registro selecionado
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, RefreshCw, Edit2, Trash2, CheckCircle, XCircle, X, Save, ChevronDown } from "lucide-react";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

type TaskMode = "view" | "edit" | "remove_confirm";
type ActMode = "view" | "edit" | "remove_confirm";

interface FilterOptions {
  ws_list: string[];
  deal_ids: string[];
  tracks: string[];
  subtracks: string[];
}

// ─── Field definitions (mirrors Streamlit _TASK_EDIT_FIELDS) ────────────────

type WidgetType = "int" | "float" | "bool" | "date" | "text" | "str" | "choice";

interface FieldDef {
  key: string;
  label: string;
  type: WidgetType;
  choices?: string[];
}

const TASK_EDIT_FIELDS: FieldDef[] = [
  { key: "task_tasktype_id",          label: "Task Type ID",          type: "int" },
  { key: "task_reference",            label: "Reference",             type: "str" },
  { key: "task_owner_id",             label: "Owner ID",              type: "int" },
  { key: "task_temp_owner_id",        label: "Temp Owner ID",         type: "int" },
  { key: "task_customer_id",          label: "Customer ID",           type: "int" },
  { key: "task_cr_party_id",          label: "CR Party ID",           type: "str" },
  { key: "task_cr_party_name",        label: "CR Party Name",         type: "str" },
  { key: "task_customer_name",        label: "Customer Name",         type: "str" },
  { key: "task_created_by",           label: "Created By",            type: "int" },
  { key: "task_priority",             label: "Priority",              type: "choice", choices: ["LOW", "MEDIUM", "HIGH"] },
  { key: "task_project_id",           label: "Project ID",            type: "int" },
  { key: "task_status",               label: "Status",                type: "int" },
  { key: "task_status_justification", label: "Status Justification",  type: "str" },
  { key: "task_start",                label: "Start Date",            type: "date" },
  { key: "task_end",                  label: "End Date",              type: "date" },
  { key: "task_start_performed",      label: "Start Performed",       type: "date" },
  { key: "task_end_performed",        label: "End Performed",         type: "date" },
  { key: "task_value",                label: "Value",                 type: "float" },
  { key: "task_forecast",             label: "Forecast",              type: "float" },
  { key: "task_backlog",              label: "Backlog",               type: "float" },
  { key: "task_rate",                 label: "Rate",                  type: "float" },
  { key: "task_currency",             label: "Currency",              type: "str" },
  { key: "task_ws",                   label: "WS",                    type: "str" },
  { key: "task_deal_id",              label: "Deal ID",               type: "str" },
  { key: "task_track",                label: "Track",                 type: "text" },
  { key: "task_subtrack",             label: "Sub-Track",             type: "text" },
  { key: "task_highlight",            label: "Highlight",             type: "bool" },
  { key: "task_remark",               label: "Remark",                type: "text" },
  { key: "task_description",          label: "Description",           type: "text" },
  { key: "task_ea_flag",              label: "EA Flag",               type: "bool" },
  { key: "task_telemetry_flag",       label: "Telemetry Flag",        type: "bool" },
  { key: "task_opt_in_flag",          label: "Opt-In Flag",           type: "bool" },
  { key: "task_completed",            label: "Completed %",           type: "float" },
  { key: "task_architecture",         label: "Architecture",          type: "str" },
  { key: "task_solution_domain",      label: "Solution Domain",       type: "str" },
  { key: "task_eligible",             label: "Eligible",              type: "choice", choices: ["Y", "N"] },
  { key: "task_end_fy",               label: "End FY",                type: "int" },
  { key: "task_booking_date",         label: "Booking Date",          type: "date" },
  { key: "task_booking_amount",       label: "Booking Amount",        type: "float" },
];

const ACTIVITY_EDIT_FIELDS: FieldDef[] = [
  { key: "activity_task_id",               label: "Task ID",               type: "int" },
  { key: "activity_seq",                   label: "Seq",                   type: "int" },
  { key: "activity_name",                  label: "Name",                  type: "str" },
  { key: "activity_objective",             label: "Objective",             type: "text" },
  { key: "activity_scope",                 label: "Scope",                 type: "text" },
  { key: "activity_expected_results",      label: "Expected Results",      type: "text" },
  { key: "activity_effort",               label: "Effort",                type: "float" },
  { key: "activity_status",               label: "Status",                type: "int" },
  { key: "activity_ws",                   label: "WS",                    type: "str" },
  { key: "activity_deal_id",              label: "Deal ID",               type: "str" },
  { key: "activity_track",                label: "Track",                 type: "text" },
  { key: "activity_sub_track",            label: "Sub-Track",             type: "text" },
  { key: "activity_value",                label: "Value",                 type: "float" },
  { key: "activity_currency",             label: "Currency",              type: "str" },
  { key: "activity_start",               label: "Start",                 type: "date" },
  { key: "activity_end",                  label: "End",                   type: "date" },
  { key: "activity_start_performed",      label: "Start Performed",       type: "date" },
  { key: "activity_end_performed",        label: "End Performed",         type: "date" },
  { key: "activity_effort_performed",     label: "Effort Performed",      type: "float" },
  { key: "activity_completed",            label: "Completed %",           type: "float" },
  { key: "activity_approved",             label: "Approved",              type: "bool" },
  { key: "activity_approved_value",       label: "Approved Value",        type: "float" },
  { key: "activity_approved_currency",    label: "Approved Currency",     type: "str" },
  { key: "activity_approval_date",        label: "Approval Date",         type: "date" },
  { key: "activity_approval_request_date", label: "Approval Request Date", type: "date" },
  { key: "activity_approval_fy",          label: "Approval FY",           type: "int" },
  { key: "activity_end_fy",               label: "End FY",                type: "int" },
  { key: "activity_backlog_value",         label: "Backlog Value",         type: "float" },
];

// ─── Styling helpers ──────────────────────────────────────────────────────────

const inputCls = "w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = "w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const textareaCls = "w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none";
const btnPrimary = "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const btnDanger = "flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const btnGhost = "flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const spinner = <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />;

// ─── Mini metric ──────────────────────────────────────────────────────────────

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 leading-tight">{label}</span>
      <span className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">{value}</span>
    </div>
  );
}

// ─── Multi-select pill ────────────────────────────────────────────────────────

function MultiSelect({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <div className="relative">
      <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[30px]"
      >
        <span className="truncate">
          {value.length === 0 ? <span className="text-gray-400">Todos</span> : value.join(", ")}
        </span>
        <ChevronDown size={12} className="ml-1 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Nenhuma opção</div>
          ) : (
            options.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="w-3 h-3 rounded accent-blue-600"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ─── Field multi-select (for edit form field selector) ───────────────────────

function FieldSelector({
  fields, selected, onChange,
}: { fields: FieldDef[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };
  const label = selected.length === 0
    ? "Selecione campos para editar..."
    : `${selected.length} campo(s) selecionado(s)`;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[30px]">
        <span className="truncate text-gray-500">{label}</span>
        <ChevronDown size={12} className="ml-1 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {fields.map(f => (
            <label key={f.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input type="checkbox" checked={selected.includes(f.key)} onChange={() => toggle(f.key)} className="w-3 h-3 rounded accent-blue-600" />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{f.key}</span>
              <span className="text-xs text-gray-400 truncate">— {f.label}</span>
            </label>
          ))}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ─── Generic data table ───────────────────────────────────────────────────────

function DataTable({
  rows, selectedIds, idKey, onSelect, multiSelect = false, maxCols = 10,
}: {
  rows: Row[];
  selectedIds: (number | string)[];
  idKey: string;
  onSelect: (ids: (number | string)[]) => void;
  multiSelect?: boolean;
  maxCols?: number;
}) {
  if (!rows.length) return <p className="text-xs text-gray-400 py-4">Nenhum registro encontrado.</p>;

  const allKeys = Object.keys(rows[0]);
  const cols = allKeys.slice(0, maxCols);

  const toggleRow = (id: number | string) => {
    if (multiSelect) {
      onSelect(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
    } else {
      onSelect(selectedIds.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            {multiSelect && <th className="w-8 px-2 py-2" />}
            {cols.map(k => (
              <th key={k} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = row[idKey] as number | string;
            const isSel = selectedIds.includes(id);
            return (
              <tr key={i} onClick={() => toggleRow(id)}
                className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors ${isSel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                {multiSelect && (
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={isSel} onChange={() => toggleRow(id)} onClick={e => e.stopPropagation()} className="w-3 h-3 accent-blue-600" />
                  </td>
                )}
                {cols.map(k => (
                  <td key={k} className="px-3 py-1.5 whitespace-nowrap text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                    {row[k] === null || row[k] === undefined ? <span className="text-gray-300 dark:text-gray-600">—</span> : String(row[k])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Dynamic edit form ───────────────────────────────────────────────────────

function EditForm({
  fields, selectedFields, currentRow, onSave, onCancel, saving, idLabel,
}: {
  fields: FieldDef[];
  selectedFields: string[];
  currentRow: Row | null;
  onSave: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
  idLabel: string;
}) {
  const fieldMap = useMemo(() => Object.fromEntries(fields.map(f => [f.key, f])), [fields]);
  const initValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const k of selectedFields) {
      const cur = currentRow?.[k];
      vals[k] = cur !== undefined && cur !== null ? cur : "";
    }
    return vals;
  }, [selectedFields, currentRow]);

  const [values, setValues] = useState<Record<string, unknown>>(initValues);

  const set = (k: string, v: unknown) => setValues(p => ({ ...p, [k]: v }));

  const renderField = (k: string) => {
    const def = fieldMap[k];
    if (!def) return null;
    const cur = values[k];
    const curStr = cur !== null && cur !== undefined ? String(cur) : "";

    switch (def.type) {
      case "int":
        return <input type="number" step="1" value={curStr} onChange={e => set(k, e.target.value === "" ? null : parseInt(e.target.value))} className={inputCls} />;
      case "float":
        return <input type="number" step="0.0001" value={curStr} onChange={e => set(k, e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} />;
      case "bool":
        return (
          <select value={curStr === "true" || curStr === "1" ? "1" : "0"} onChange={e => set(k, parseInt(e.target.value))} className={selectCls}>
            <option value="0">False (0)</option>
            <option value="1">True (1)</option>
          </select>
        );
      case "date":
        return <input type="date" value={curStr.slice(0, 10)} onChange={e => set(k, e.target.value || null)} className={inputCls} />;
      case "choice":
        return (
          <select value={curStr} onChange={e => set(k, e.target.value)} className={selectCls}>
            {(def.choices ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        );
      case "text":
        return <textarea value={curStr} onChange={e => set(k, e.target.value)} className={textareaCls} rows={2} />;
      default:
        return <input type="text" value={curStr} onChange={e => set(k, e.target.value || null)} className={inputCls} />;
    }
  };

  const cols = 3;
  const chunks: string[][] = [];
  for (let i = 0; i < selectedFields.length; i += cols) chunks.push(selectedFields.slice(i, i + cols));

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 mt-2">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Editando {idLabel}</p>
      {chunks.map((chunk, ci) => (
        <div key={ci} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${chunk.length}, minmax(0,1fr))` }}>
          {chunk.map(k => (
            <div key={k}>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block font-mono">{k}</label>
              {renderField(k)}
            </div>
          ))}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(values)} disabled={saving} className={btnPrimary}>
          {saving ? spinner : <Save size={13} />} {saving ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} disabled={saving} className={btnGhost}>
          <X size={13} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTasksPage() {
  const qc = useQueryClient();

  // ── Filter state
  const [taskIdInput, setTaskIdInput] = useState("");
  const [selWs, setSelWs] = useState<string[]>([]);
  const [selDeal, setSelDeal] = useState<string[]>([]);
  const [selTrack, setSelTrack] = useState<string[]>([]);
  const [selSubtrack, setSelSubtrack] = useState<string[]>([]);
  const [filterApplied, setFilterApplied] = useState(false);

  // ── Data state
  const [tasks, setTasks] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [records, setRecords] = useState<Row[]>([]);

  // ── Task tab state
  const [activeTab, setActiveTab] = useState<"tasks" | "activities" | "records">("tasks");
  const [selTaskIds, setSelTaskIds] = useState<number[]>([]);
  const [taskMode, setTaskMode] = useState<TaskMode>("view");
  const [taskEditFields, setTaskEditFields] = useState<string[]>([]);
  const [taskMsg, setTaskMsg] = useState("");

  // ── Activity tab state
  const [selActId, setSelActId] = useState<number | null>(null);
  const [selActTaskId, setSelActTaskId] = useState<number | null>(null);
  const [actMode, setActMode] = useState<ActMode>("view");
  const [actEditFields, setActEditFields] = useState<string[]>([]);
  const [actMsg, setActMsg] = useState("");

  // ── Record tab state
  const [selRecId, setSelRecId] = useState<number | null>(null);

  // ── Filter options (loaded at mount)
  const filterOptsQ = useQuery<FilterOptions>({
    queryKey: ["admin-task-filter-options"],
    queryFn: () => apiClient.get<FilterOptions>("/admin/tasks/filter-options").then(r => r.data),
    staleTime: 300000,
  });
  const opts = filterOptsQ.data ?? { ws_list: [], deal_ids: [], tracks: [], subtracks: [] };

  // ── Apply filter mutation
  const filterMut = useMutation<Row[], Error, void>({
    mutationFn: () => apiClient.post<Row[]>("/admin/tasks/filter", {
      task_id: taskIdInput.trim() !== "" && /^\d+$/.test(taskIdInput.trim()) ? parseInt(taskIdInput.trim()) : null,
      ws_list: selWs.length ? selWs : null,
      deal_ids: selDeal.length ? selDeal : null,
      tracks: selTrack.length ? selTrack : null,
      subtracks: selSubtrack.length ? selSubtrack : null,
    }).then(r => r.data),
    onSuccess: (data) => {
      setTasks(data);
      setFilterApplied(true);
      setSelTaskIds([]);
      setSelActId(null);
      setSelActTaskId(null);
      setTaskMode("view");
      setTaskEditFields([]);
      setActMode("view");
      setActEditFields([]);
      setTaskMsg("");
      setActMsg("");
      setSelRecId(null);
      // Load activities and records for all task_ids
      const ids = data.map(r => r["task_id"] as number).filter(Boolean);
      if (ids.length) {
        apiClient.post<Row[]>("/admin/tasks/activities-many", { task_ids: ids }).then(r => setActivities(r.data));
        apiClient.post<Row[]>("/admin/tasks/records-many", { task_ids: ids }).then(r => setRecords(r.data));
      } else {
        setActivities([]);
        setRecords([]);
      }
    },
  });

  // ── Task update
  const taskUpdateMut = useMutation<{ success: boolean }, Error, { task_id: number; data: Record<string, unknown> }>({
    mutationFn: ({ task_id, data }) => apiClient.put<{ success: boolean }>(`/admin/tasks/${task_id}`, { data }).then(r => r.data),
    onSuccess: (res, vars) => {
      if (res.success) {
        setTaskMsg(`task_id ${vars.task_id} atualizado com sucesso.`);
        setTaskMode("view");
        setTaskEditFields([]);
        void filterMut.mutate();
      } else {
        setTaskMsg("Nenhuma linha atualizada.");
      }
    },
    onError: (e) => setTaskMsg(`Erro: ${e.message}`),
  });

  // ── Task remove
  const taskRemoveMut = useMutation<{ removed: number; errors: string[] }, Error, number[]>({
    mutationFn: (ids) => apiClient.post<{ removed: number; errors: string[] }>("/admin/tasks/remove", { task_ids: ids }).then(r => r.data),
    onSuccess: (res) => {
      const msg = res.errors.length
        ? `Concluído com avisos: ${res.errors.join("; ")}`
        : `${res.removed} task(s) removida(s) com sucesso.`;
      setTaskMsg(msg);
      setTaskMode("view");
      setSelTaskIds([]);
      void filterMut.mutate();
    },
    onError: (e) => setTaskMsg(`Erro: ${e.message}`),
  });

  // ── Activity update
  const actUpdateMut = useMutation<{ success: boolean }, Error, { activity_id: number; data: Record<string, unknown> }>({
    mutationFn: ({ activity_id, data }) => apiClient.put<{ success: boolean }>(`/admin/tasks/activities/${activity_id}`, { data }).then(r => r.data),
    onSuccess: (res, vars) => {
      if (res.success) {
        setActMsg(`activity_id ${vars.activity_id} atualizado com sucesso.`);
        setActMode("view");
        setActEditFields([]);
        void filterMut.mutate();
      } else {
        setActMsg("Nenhuma linha atualizada.");
      }
    },
    onError: (e) => setActMsg(`Erro: ${e.message}`),
  });

  // ── Activity remove
  const actRemoveMut = useMutation<{ success: boolean; errors: string[] }, Error, number>({
    mutationFn: (id) => apiClient.post<{ success: boolean; errors: string[] }>(`/admin/tasks/activities/${id}/remove`).then(r => r.data),
    onSuccess: (res) => {
      const msg = res.errors.length
        ? `Concluído com avisos: ${res.errors.join("; ")}`
        : `activity_id ${selActId} removida com sucesso.`;
      setActMsg(msg);
      setActMode("view");
      setSelActId(null);
      void filterMut.mutate();
    },
    onError: (e) => setActMsg(`Erro: ${e.message}`),
  });

  // ── Derived
  const singleTaskId = selTaskIds.length === 1 ? selTaskIds[0] : null;
  const currentTaskRow = singleTaskId ? (tasks.find(t => (t["task_id"] as number) === singleTaskId) ?? null) : null;
  const currentActRow = selActId ? (activities.find(a => (a["activity_id"] as number) === selActId) ?? null) : null;

  // ── Activities and records shown based on selection
  const visibleActivities = useMemo(() => {
    if (singleTaskId) return activities.filter(a => (a["activity_task_id"] as number) === singleTaskId);
    return activities;
  }, [activities, singleTaskId]);

  const visibleRecords = useMemo(() => {
    if (selActId && selActTaskId) return records.filter(r => (r["taskrecord_activity_id"] as number) === selActId && (r["taskrecord_task_id"] as number) === selActTaskId);
    if (singleTaskId) return records.filter(r => (r["taskrecord_task_id"] as number) === singleTaskId);
    return records;
  }, [records, selActId, selActTaskId, singleTaskId]);

  // ── Clear filters
  const clearFilters = () => {
    setTaskIdInput(""); setSelWs([]); setSelDeal([]); setSelTrack([]); setSelSubtrack([]);
    setFilterApplied(false); setTasks([]); setActivities([]); setRecords([]);
    setSelTaskIds([]); setSelActId(null); setSelActTaskId(null);
    setTaskMode("view"); setTaskEditFields([]); setActMode("view"); setActEditFields([]);
    setTaskMsg(""); setActMsg(""); setSelRecId(null);
    void qc.invalidateQueries({ queryKey: ["admin-task-filter-options"] });
  };

  const nT = tasks.length, nA = activities.length, nR = records.length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ajuste administrativo de tarefas, atividades e registros</p>
      </div>

      {/* Filter card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Filter size={13} /> Filtros dinâmicos — tbTask
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">task_id</label>
            <input
              value={taskIdInput}
              onChange={e => setTaskIdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && filterMut.mutate()}
              placeholder="Ex.: 1234"
              className={inputCls}
            />
          </div>
          <MultiSelect label="task_ws" options={opts.ws_list} value={selWs} onChange={setSelWs} />
          <MultiSelect label="task_deal_id" options={opts.deal_ids} value={selDeal} onChange={setSelDeal} />
          <MultiSelect label="task_track" options={opts.tracks} value={selTrack} onChange={setSelTrack} />
          <MultiSelect label="task_subtrack" options={opts.subtracks} value={selSubtrack} onChange={setSelSubtrack} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => filterMut.mutate()} disabled={filterMut.isPending} className={btnPrimary}>
            {filterMut.isPending ? spinner : <Filter size={13} />}
            {filterMut.isPending ? "Carregando..." : "Aplicar Filtros"}
          </button>
          <button onClick={clearFilters} className={btnGhost}>
            <RefreshCw size={13} /> Limpar Filtros
          </button>
          {filterApplied && (
            <div className="flex items-center gap-4 ml-2">
              <MiniMetric label="Tarefas" value={nT} />
              <MiniMetric label="Atividades" value={nA} />
              <MiniMetric label="Registros" value={nR} />
            </div>
          )}
        </div>
        {filterMut.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">{filterMut.error?.message}</p>
        )}
      </div>

      {/* Hint */}
      {!filterApplied && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
          Utilize os filtros acima e clique em <strong>Aplicar Filtros</strong> para carregar os dados.
        </div>
      )}

      {/* Tabs */}
      {filterApplied && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 pt-3 gap-1">
            {(["tasks", "activities", "records"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeTab === t ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                {t === "tasks" ? `Tarefas — tbTask (${nT})` : t === "activities" ? `Atividades — tbTaskActivity (${nA})` : `Registros — tbTaskRecord (${nR})`}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">

            {/* ── TAB 1: Tasks ─────────────────────────────────────── */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                {/* Caption */}
                {selTaskIds.length === 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Task selecionada: <strong>#{singleTaskId}</strong> — Editar ou Remover disponíveis.
                  </p>
                )}
                {selTaskIds.length > 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>{selTaskIds.length} tasks selecionadas</strong> — apenas o botão Remover está disponível para múltipla seleção.
                  </p>
                )}
                {selTaskIds.length === 0 && (
                  <p className="text-xs text-gray-400">Clique em uma linha para selecionar (múltiplas: use checkboxes — apenas Remover).</p>
                )}

                {/* Table */}
                <div className="max-h-72 overflow-auto">
                  <DataTable
                    rows={tasks}
                    selectedIds={selTaskIds}
                    idKey="task_id"
                    multiSelect
                    onSelect={ids => {
                      const nums = ids as number[];
                      setSelTaskIds(nums);
                      if (nums.length !== 1) { setTaskMode("view"); setTaskEditFields([]); }
                    }}
                  />
                </div>

                {/* Action buttons */}
                {taskMode === "view" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTaskMode("edit"); setTaskMsg(""); }}
                      disabled={selTaskIds.length !== 1}
                      className={btnPrimary}
                    >
                      <Edit2 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => { setTaskMode("remove_confirm"); setTaskMsg(""); }}
                      disabled={selTaskIds.length === 0}
                      className={btnDanger}
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                )}

                {/* Feedback */}
                {taskMsg && (
                  <p className={`text-xs ${taskMsg.includes("Erro") || taskMsg.includes("avisos") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {taskMsg}
                  </p>
                )}

                {/* Edit mode */}
                {taskMode === "edit" && singleTaskId && (
                  <div className="space-y-2">
                    <FieldSelector fields={TASK_EDIT_FIELDS} selected={taskEditFields} onChange={setTaskEditFields} />
                    {taskEditFields.length > 0 && (
                      <EditForm
                        fields={TASK_EDIT_FIELDS}
                        selectedFields={taskEditFields}
                        currentRow={currentTaskRow}
                        saving={taskUpdateMut.isPending}
                        idLabel={`task_id = ${singleTaskId}`}
                        onCancel={() => { setTaskMode("view"); setTaskEditFields([]); setTaskMsg(""); }}
                        onSave={vals => taskUpdateMut.mutate({ task_id: singleTaskId, data: vals })}
                      />
                    )}
                    {taskEditFields.length === 0 && (
                      <button onClick={() => { setTaskMode("view"); setTaskEditFields([]); }} className={btnGhost}>
                        <X size={13} /> Cancelar edição
                      </button>
                    )}
                  </div>
                )}

                {/* Remove confirm */}
                {taskMode === "remove_confirm" && selTaskIds.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 space-y-3">
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                      Confirma a <strong>remoção</strong> de <strong>{selTaskIds.length} task(s)</strong>:{" "}
                      <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">{selTaskIds.join(", ")}</code>?
                      Todos os dados serão zerados/nulos. Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => taskRemoveMut.mutate(selTaskIds)} disabled={taskRemoveMut.isPending} className={btnDanger}>
                        {taskRemoveMut.isPending ? spinner : <CheckCircle size={13} />} Confirmar Remoção
                      </button>
                      <button onClick={() => setTaskMode("view")} disabled={taskRemoveMut.isPending} className={btnGhost}>
                        <XCircle size={13} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: Activities ─────────────────────────────── */}
            {activeTab === "activities" && (
              <div className="space-y-3">
                {/* Caption */}
                {singleTaskId
                  ? <p className="text-xs text-gray-500 dark:text-gray-400">Atividades da task <strong>#{singleTaskId}</strong>. Clique em uma linha para selecionar.</p>
                  : <p className="text-xs text-gray-400">Atividades de todas as tarefas filtradas. Selecione uma tarefa na aba anterior para restringir.</p>
                }

                {/* Table */}
                <div className="max-h-72 overflow-auto">
                  <DataTable
                    rows={visibleActivities}
                    selectedIds={selActId !== null ? [selActId] : []}
                    idKey="activity_id"
                    onSelect={ids => {
                      const id = ids.length ? (ids[0] as number) : null;
                      const row = id !== null ? activities.find(a => (a["activity_id"] as number) === id) ?? null : null;
                      setSelActId(id);
                      setSelActTaskId(row ? (row["activity_task_id"] as number) : null);
                      setActMode("view");
                      setActEditFields([]);
                      setActMsg("");
                    }}
                  />
                </div>

                {/* Buttons */}
                {actMode === "view" && (
                  <div className="flex gap-2">
                    <button onClick={() => { setActMode("edit"); setActMsg(""); }} disabled={!selActId} className={btnPrimary}>
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => { setActMode("remove_confirm"); setActMsg(""); }} disabled={!selActId} className={btnDanger}>
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                )}

                {/* Feedback */}
                {actMsg && (
                  <p className={`text-xs ${actMsg.includes("Erro") || actMsg.includes("avisos") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {actMsg}
                  </p>
                )}

                {/* Edit mode */}
                {actMode === "edit" && selActId && (
                  <div className="space-y-2">
                    <FieldSelector fields={ACTIVITY_EDIT_FIELDS} selected={actEditFields} onChange={setActEditFields} />
                    {actEditFields.length > 0 && (
                      <EditForm
                        fields={ACTIVITY_EDIT_FIELDS}
                        selectedFields={actEditFields}
                        currentRow={currentActRow}
                        saving={actUpdateMut.isPending}
                        idLabel={`activity_id = ${selActId}`}
                        onCancel={() => { setActMode("view"); setActEditFields([]); setActMsg(""); }}
                        onSave={vals => actUpdateMut.mutate({ activity_id: selActId, data: vals })}
                      />
                    )}
                    {actEditFields.length === 0 && (
                      <button onClick={() => { setActMode("view"); setActEditFields([]); }} className={btnGhost}>
                        <X size={13} /> Cancelar edição
                      </button>
                    )}
                  </div>
                )}

                {/* Remove confirm */}
                {actMode === "remove_confirm" && selActId && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 space-y-3">
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                      Confirma a <strong>remoção</strong> da atividade <strong>activity_id = {selActId}</strong>?
                      Os dados e registros relacionados serão zerados/nulos.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => actRemoveMut.mutate(selActId)} disabled={actRemoveMut.isPending} className={btnDanger}>
                        {actRemoveMut.isPending ? spinner : <CheckCircle size={13} />} Confirmar Remoção
                      </button>
                      <button onClick={() => setActMode("view")} disabled={actRemoveMut.isPending} className={btnGhost}>
                        <XCircle size={13} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: Records ────────────────────────────────── */}
            {activeTab === "records" && (
              <div className="space-y-3">
                {/* Caption */}
                {selActId && selActTaskId
                  ? <p className="text-xs text-gray-500 dark:text-gray-400">Registros da atividade <strong>#{selActId}</strong> (task <strong>#{selActTaskId}</strong>). Clique para ver detalhes.</p>
                  : singleTaskId
                  ? <p className="text-xs text-gray-500 dark:text-gray-400">Registros da task <strong>#{singleTaskId}</strong>. Selecione uma atividade na aba anterior para filtrar.</p>
                  : <p className="text-xs text-gray-400">Registros de todas as tarefas filtradas.</p>
                }

                {/* Table */}
                <div className="max-h-96 overflow-auto">
                  <DataTable
                    rows={visibleRecords}
                    selectedIds={selRecId !== null ? [selRecId] : []}
                    idKey="taskrecord_id"
                    onSelect={ids => setSelRecId(ids.length ? (ids[0] as number) : null)}
                  />
                </div>

                {/* Selected record info */}
                {selRecId !== null && (() => {
                  const rec = visibleRecords.find(r => (r["taskrecord_id"] as number) === selRecId);
                  if (!rec) return null;
                  return (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex flex-wrap gap-4">
                      <span>taskrecord_id = <strong>{String(rec["taskrecord_id"])}</strong></span>
                      {rec["taskrecord_task_id"] != null && <span>task_id = <strong>{String(rec["taskrecord_task_id"])}</strong></span>}
                      {rec["taskrecord_activity_id"] != null && <span>activity_id = <strong>{String(rec["taskrecord_activity_id"])}</strong></span>}
                      {rec["taskrecord_remark"] != null && <span className="truncate max-w-xs">remark: {String(rec["taskrecord_remark"])}</span>}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
