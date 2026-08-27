import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Save, History, X, Edit2, Users, Info, Plus } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, ActivityItem, HistoryItem, CSMItem, StatusType, RACIItem, PersonItem, CompanyItem, StatusJustificationItem, ProjectItem, ProjectTeamItem } from "@/api/tasks";
import { useAuthStore } from "@/store/authStore";

// IDs de status que encerram a task — usados para filtrar opções (Regra 2 e 3)
const CLOSING_STATUS_IDS = new Set([4, 6, 10]);

interface Props {
  tasks: TaskItem[];
  initialIndex?: number;
  onClose?: () => void;
}

const CLOSED_STATUS = new Set([4, 5, 6, 10]);
const PROGRESS_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];
const PROGRESS_MAP: Record<string, number> = { "0%": 0, "25%": 0.25, "50%": 0.5, "75%": 0.75, "100%": 1 };
const REVERSE_PROGRESS: Record<string, string> = { "0": "0%", "0.25": "25%", "0.5": "50%", "0.75": "75%", "1": "100%" };
const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];
const CURRENCY_OPTIONS = ["BRL", "USD", "EUR"];
const DEADLINE_ICON: Record<string, string> = { today: "⚠️", this_week: "⏳", next_week: "📅", future: "🕒" };

function fmtDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fmtDateDisplay(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")}/${months[d.getMonth()]}/${d.getFullYear()}`;
}

function computeFY(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `FY${month >= 4 ? year : year - 1}`;
}

function computeFYYear(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return month >= 4 ? year : year - 1;
}

function completedToLabel(v?: number | null): string {
  if (v == null) return "0%";
  const pct = Math.round((v * 100) / 25) * 25;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

function pctLabel(v?: number | null): string {
  if (v == null) return "0%";
  const r = Math.round(v * 100) / 100;
  return REVERSE_PROGRESS[String(r)] ?? `${Math.round(v * 100)}%`;
}

function deadlineBucket(endDate?: string | null): string {
  if (!endDate) return "future";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  const diff = Math.floor((end.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "delayed";
  if (diff === 0) return "today";
  if (diff <= 7) return "this_week";
  if (diff <= 14) return "next_week";
  return "future";
}

function statusBadgeClass(name?: string | null): string {
  const n = (name ?? "").toUpperCase();
  if (n.includes("DELAYED") || n.includes("ATRASAD")) return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
  if (n.includes("ACTIVE") || n.includes("PROGRESS") || n.includes("ATIV")) return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700";
  if (n.includes("HOLD") || n.includes("PENDING") || n.includes("AGUARD") || n.includes("WAIT")) return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700";
  if (n.includes("CLOSED") || n.includes("DONE") || n.includes("COMPLET") || n.includes("FECHAD")) return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600";
  if (n.includes("CANCEL")) return "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600";
  return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
}

function statusEmoji(name?: string | null): string {
  const n = (name ?? "").toUpperCase();
  if (n.includes("DELAYED") || n.includes("ATRASAD")) return "🚨";
  if (n.includes("ACTIVE") || n.includes("PROGRESS") || n.includes("ATIV")) return "🟢";
  if (n.includes("HOLD") || n.includes("PENDING") || n.includes("AGUARD") || n.includes("WAIT")) return "⏸️";
  if (n.includes("CLOSED") || n.includes("DONE") || n.includes("COMPLET") || n.includes("FECHAD")) return "✅";
  if (n.includes("CANCEL")) return "🚫";
  return "🔵";
}

function priorityBadgeClass(priority?: string | null): string {
  const p = (priority ?? "").toUpperCase();
  if (p === "HIGH") return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
  if (p === "MEDIUM") return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700";
  if (p === "LOW") return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600";
}

function priorityEmoji(priority?: string | null): string {
  const p = (priority ?? "").toUpperCase();
  if (p === "HIGH") return "🔴";
  if (p === "MEDIUM") return "🟡";
  if (p === "LOW") return "🟢";
  return "";
}

function LabelInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Inp({ value, onChange, disabled, type = "text" }: { value: string; onChange: (v: string) => void; disabled?: boolean; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:opacity-60" />
  );
}

function Sel({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:opacity-60">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, disabled, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} rows={rows}
      className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:opacity-60 resize-none" />
  );
}

function HistoryPanel({ items }: { items: HistoryItem[] }) {
  const { t } = useTranslation();
  if (!items.length) return <p className="text-xs text-gray-400 py-3">{t("task.noHistory")}</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {items.map((h) => (
              <div key={h.taskrecord_id} className="text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-gray-400 dark:text-gray-500">
                    {h.taskrecord_date ? (() => {
                      const d = new Date(String(h.taskrecord_date));
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const dd = String(d.getDate()).padStart(2, "0");
                      const mmm = months[d.getMonth()];
                      const yyyy = d.getFullYear();
                      const hh = String(d.getHours()).padStart(2, "0");
                      const mi = String(d.getMinutes()).padStart(2, "0");
                      const ss = String(d.getSeconds()).padStart(2, "0");
                      return `${dd}/${mmm}/${yyyy} ${hh}:${mi}:${ss}`;
                    })() : "—"}
                  </span>
                  {h.taskrecord_type && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.taskrecord_type === "BLOCKER" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : h.taskrecord_type === "ISSUE" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{h.taskrecord_type}</span>}
                  {h.taskrecord_status && String(h.taskrecord_status) !== "0" && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h.taskrecord_status}</span>}
                  {Boolean((h as Record<string, unknown>).taskrecord_next_followup) && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      ⏰ {String((h as Record<string, unknown>).taskrecord_next_followup).slice(0, 10)}
                    </span>
                  )}
                  <span className="ml-auto text-gray-400 dark:text-gray-500">{String(h.taskrecord_updated_by ?? "")}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{String(h.taskrecord_remark ?? "")}</p>
              </div>
      ))}
    </div>
  );
}

function ActivityRow({ act, statusTypes, taskId, onUpdated, onSelectHistory, isSelectedForHistory }: { act: ActivityItem; statusTypes: StatusType[]; taskId: number; onUpdated: () => void; onSelectHistory?: (activityId: number | null) => void; isSelectedForHistory?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"objective" | "scope" | "results" | "track">("objective");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const pct = Math.min(100, Math.max(0, ((act.activity_completed ?? 0) <= 1 ? (act.activity_completed ?? 0) * 100 : act.activity_completed ?? 0)));
  // Suporta tanto 'activity_status' (tbTaskActivity) quanto 'activity_status_id' (vwTaskActivity)
  // Number() garante que strings "10" ou floats 10.0 sejam tratados corretamente
  const statusId = Number((act.activity_status ?? (act as Record<string, unknown>).activity_status_id) ?? 0);
  const isClosed = CLOSED_STATUS.has(statusId);
  // Se activity_status_name não vier da API (SELECT * FROM tbTaskActivity não tem essa coluna),
  // resolve o nome a partir do catálogo de statusTypes já carregado no componente pai
  const resolvedStatusName = act.activity_status_name
    ?? statusTypes.find((sx) => sx.statustype_id === statusId)?.statustype_name
    ?? null;
  const bucket = isClosed ? "future" : deadlineBucket(fmtDate(act.activity_end_performed ?? act.activity_end) || null);

  const g = (k: string, fallback: string = ""): string => k in edits ? edits[k] : String((act as Record<string, unknown>)[k] ?? fallback);
  const s = (k: string, v: string) => { setEdits((p) => ({ ...p, [k]: v })); setSaved(false); };

  const saveMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const data: Record<string, unknown> = {};
      const changes: string[] = [];
      const seq = parseInt(edits.activity_seq ?? "");
      if (!isNaN(seq) && seq !== act.activity_seq) data.activity_seq = seq;
      if ("activity_status_name" in edits && edits.activity_status_name !== (resolvedStatusName ?? "")) {
        const found = statusTypes.find((sx) => sx.statustype_name === edits.activity_status_name);
        // Envia SOMENTE activity_status (INT FK) — tbTaskActivity não tem coluna activity_status_name
        if (found) { data.activity_status = found.statustype_id; changes.push(`Status → ${edits.activity_status_name}`); }
      }
      if ("activity_completed_pct" in edits) {
        const pctNum = PROGRESS_MAP[edits.activity_completed_pct] ?? 0;
        if (pctNum !== act.activity_completed) data.activity_completed = pctNum;
      }
      const sp = edits.activity_start_performed;
      if (sp !== undefined && sp !== fmtDate(act.activity_start_performed)) { data.activity_start_performed = sp || null; changes.push(`Start → ${sp}`); }
      const ep = edits.activity_end_performed;
      if (ep !== undefined && ep !== fmtDate(act.activity_end_performed)) { data.activity_end_performed = ep || null; changes.push(`End → ${ep}`); }
      if ("activity_effort_performed" in edits) {
        const ef = parseFloat(edits.activity_effort_performed);
        if (!isNaN(ef) && ef !== act.activity_effort_performed) { data.activity_effort_performed = ef; changes.push(`Effort → ${ef}h`); }
      }
      ["activity_objective", "activity_scope", "activity_expected_results", "activity_track", "activity_sub_track", "activity_deal_id", "activity_ws", "activity_value", "activity_currency", "activity_approved_value", "activity_approved_currency", "activity_approval_request_date", "activity_approval_date"].forEach((k) => {
        if (k in edits && edits[k] !== String((act as Record<string, unknown>)[k] ?? "")) data[k] = edits[k];
      });
      if ("activity_approved" in edits) data.activity_approved = edits.activity_approved === "1" ? 1 : 0;
      // Computed: activity_approval_fy
      const approvalDate = "activity_approval_date" in edits ? edits.activity_approval_date : fmtDate(act.activity_approval_date);
      if (approvalDate) { const fy = computeFYYear(approvalDate); if (fy) data.activity_approval_fy = fy; }
      // Computed: activity_end_fy (only if status = 10 and end_performed set)
      const endPerf = "activity_end_performed" in edits ? edits.activity_end_performed : fmtDate(act.activity_end_performed);
      const newStatusId = "activity_status_name" in edits ? (statusTypes.find((sx) => sx.statustype_name === edits.activity_status_name)?.statustype_id ?? act.activity_status) : act.activity_status;
      if (endPerf && Number(newStatusId) === 10) { const fy = computeFYYear(endPerf); if (fy) data.activity_end_fy = fy; }
      // Computed: activity_backlog_value
      const actValue = "activity_value" in edits ? parseFloat(edits.activity_value) : (act.activity_value ?? 0);
      const approvedValue = "activity_approved_value" in edits ? parseFloat(edits.activity_approved_value) : (act.activity_approved_value ?? 0);
      if (actValue > 0) data.activity_backlog_value = Math.abs(actValue - approvedValue);
      const remark = changes.join("; ");
      const history = remark ? { taskrecord_task_id: taskId, taskrecord_activity_id: act.activity_id, taskrecord_remark: remark } : undefined;
      return Promise.all([
        Object.keys(data).length > 0 ? tasksApi.updateActivity(act.activity_id, data).then((r) => r.data) : Promise.resolve(null),
        history ? tasksApi.addHistory(taskId, history).then((r) => r.data) : Promise.resolve(null),
      ]);
    },
    onSuccess: () => {
      setEdits({}); setSaved(true);
      void qc.invalidateQueries({ queryKey: ["task-activities", taskId] });
      void qc.invalidateQueries({ queryKey: ["act-hist"] });
      onUpdated();
    },
  });

  const statusOptions = statusTypes.filter((sx) => sx.statustype_id !== 5).map((sx) => sx.statustype_name);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-2">
      <button onClick={() => { const next = !expanded; setExpanded(next); onSelectHistory?.(next ? act.activity_id : null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${bucket === "delayed" ? "border-l-2 border-l-red-500" : ""}`}>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-4">{act.activity_seq}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{act.activity_name ?? "—"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${bucket === "delayed" ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
          </div>
        </div>
        {bucket === "delayed"
          ? <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/40 animate-pulse shrink-0">ATRASADO</span>
          : <span className="text-sm shrink-0">{DEADLINE_ICON[bucket] ?? ""}</span>}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isClosed ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"}`}>{resolvedStatusName ?? "—"}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">{fmtDate(act.activity_end_performed ?? act.activity_end) || "—"}</span>
        <Edit2 size={11} className="text-gray-400 shrink-0" />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30 dark:bg-gray-800/20 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <LabelInput label={t("task.formSeq")}><Inp value={g("activity_seq", String(act.activity_seq ?? "1"))} onChange={(v) => s("activity_seq", v)} disabled={isClosed} type="number" /></LabelInput>
            <LabelInput label={t("task.formStart")}>
              <Inp value={g("activity_start_performed", fmtDate(act.activity_start_performed))} onChange={(v) => s("activity_start_performed", v)} disabled={isClosed} type="date" />
              <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {fmtDate(act.activity_start) || "—"}</p>
            </LabelInput>
            <LabelInput label={t("task.formEnd")}>
              <Inp value={g("activity_end_performed", fmtDate(act.activity_end_performed))} onChange={(v) => s("activity_end_performed", v)} disabled={isClosed} type="date" />
              <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {fmtDate(act.activity_end) || "—"}</p>
            </LabelInput>
            <LabelInput label={t("task.formEffortH")}>
              <Inp value={g("activity_effort_performed", String(act.activity_effort_performed ?? "0"))} onChange={(v) => s("activity_effort_performed", v)} disabled={isClosed} type="number" />
              <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {String(act.activity_effort ?? 0)}</p>
            </LabelInput>
            <LabelInput label={t("task.formCompleted")}><Sel value={g("activity_completed_pct", pctLabel(act.activity_completed))} onChange={(v) => s("activity_completed_pct", v)} options={PROGRESS_OPTIONS} disabled={isClosed} /></LabelInput>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <LabelInput label={t("task.formStatus")}><Sel value={g("activity_status_name", resolvedStatusName ?? "")} onChange={(v) => s("activity_status_name", v)} options={statusOptions} disabled={isClosed} /></LabelInput>
            <LabelInput label={t("task.formDealId")}><Inp value={g("activity_deal_id", String(act.activity_deal_id ?? ""))} onChange={(v) => s("activity_deal_id", v)} disabled={isClosed} /></LabelInput>
            <LabelInput label="WS"><Inp value={g("activity_ws", String(act.activity_ws ?? ""))} onChange={(v) => s("activity_ws", v)} disabled={isClosed} /></LabelInput>
          </div>
          {/* Value + Currency + Req. Aprovação + Aprovado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LabelInput label={t("task.formValueDollar")}><Inp value={g("activity_value", String(act.activity_value ?? "0"))} onChange={(v) => s("activity_value", v)} disabled={isClosed} type="number" /></LabelInput>
            <LabelInput label={t("task.formCurrency")}><Sel value={g("activity_currency", String(act.activity_currency ?? "USD"))} onChange={(v) => s("activity_currency", v)} options={CURRENCY_OPTIONS} disabled={isClosed} /></LabelInput>
            <LabelInput label="Req. Aprovação"><Inp value={g("activity_approval_request_date", fmtDate(act.activity_approval_request_date))} onChange={(v) => s("activity_approval_request_date", v)} disabled={isClosed} type="date" /></LabelInput>
            <LabelInput label="Aprovado">
              <select value={g("activity_approved", String(act.activity_approved ?? "0"))} onChange={(e) => s("activity_approved", e.target.value)} disabled={isClosed}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60">
                <option value="0">Não</option>
                <option value="1">Sim</option>
              </select>
            </LabelInput>
          </div>
          {/* Valor Aprovado + Moeda Aprov. + Data Aprovação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput label="Valor Aprovado"><Inp value={g("activity_approved_value", String(act.activity_approved_value ?? "0"))} onChange={(v) => s("activity_approved_value", v)} disabled={isClosed} type="number" /></LabelInput>
            <LabelInput label="Moeda Aprov."><Sel value={g("activity_approved_currency", act.activity_approved_currency ?? "USD")} onChange={(v) => s("activity_approved_currency", v)} options={CURRENCY_OPTIONS} disabled={isClosed} /></LabelInput>
            <LabelInput label="Data Aprovação"><Inp value={g("activity_approval_date", fmtDate(act.activity_approval_date))} onChange={(v) => s("activity_approval_date", v)} disabled={isClosed} type="date" /></LabelInput>
          </div>
          {/* Track, Subtrack, Objective, Scope, Expected Results — each on own line */}
          <LabelInput label="Track"><Inp value={g("activity_track", String(act.activity_track ?? ""))} onChange={(v) => s("activity_track", v)} disabled={isClosed} /></LabelInput>
          <LabelInput label="Subtrack"><Inp value={g("activity_sub_track", String(act.activity_sub_track ?? ""))} onChange={(v) => s("activity_sub_track", v)} disabled={isClosed} /></LabelInput>
          <LabelInput label={t("task.tabObjective")}><Textarea value={g("activity_objective", String(act.activity_objective ?? ""))} onChange={(v) => s("activity_objective", v)} disabled={isClosed} placeholder="Objetivo da atividade..." rows={2} /></LabelInput>
          <LabelInput label={t("task.tabScope")}><Textarea value={g("activity_scope", String(act.activity_scope ?? ""))} onChange={(v) => s("activity_scope", v)} disabled={isClosed} placeholder="Escopo..." rows={2} /></LabelInput>
          <LabelInput label={t("task.tabExpectedResults")}><Textarea value={g("activity_expected_results", String(act.activity_expected_results ?? ""))} onChange={(v) => s("activity_expected_results", v)} disabled={isClosed} placeholder="Resultados esperados..." rows={2} /></LabelInput>
          <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {saved && <p className="text-[10px] text-green-600 dark:text-green-400">{t("task.savedSuccess")}</p>}
              {saveMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">{t("task.saveFailed")}</p>}
              <button onClick={() => !isClosed && saveMut.mutate()} disabled={isClosed || saveMut.isPending}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white transition-colors">
                {saveMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={11} />}
                {saveMut.isPending ? t("task.savingIndicator") : t("task.saveBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEditForm({ task, csms, statusTypes, activities, canEdit, canClose, onSaved, showCreationInfo }: {
  task: TaskItem; csms: CSMItem[]; statusTypes: StatusType[]; activities: ActivityItem[];
  canEdit: boolean; canClose: boolean; onSaved: () => void; showCreationInfo: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isClosed = CLOSED_STATUS.has(task.task_status_id ?? 0);
  // Regra 1: somente dono/dono-temp/admin/permissão-full pode editar
  const isReadOnly = isClosed || !canEdit;
  // Regra 3: verifica se há activities abertas (impedindo opções de encerramento)
  const hasOpenActivities = activities.some((a) => {
    const sid = Number((a.activity_status ?? (a as Record<string, unknown>).activity_status_id) ?? 0);
    return !CLOSED_STATUS.has(sid);
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [showProjectTeam, setShowProjectTeam] = useState(false);

  const g = (k: string, fallback: string = ""): string => k in edits ? edits[k] : String((task as Record<string, unknown>)[k] ?? fallback);
  const s = (k: string, v: string) => { setEdits((p) => ({ ...p, [k]: v })); setSaved(false); };

  const csmOptions = ["", ...csms.map((c) => c.csm_name)];
  // Regras 2 e 3: filtra opções de encerramento com base em permissão e activities abertas
  const statusOptions = statusTypes
    .filter((st) => st.statustype_id !== 5)
    .filter((st) => CLOSING_STATUS_IDS.has(st.statustype_id) ? (canClose && !hasOpenActivities) : true)
    .map((st) => st.statustype_name);
  const TASK_CURRENCY_OPTIONS = ["BRL", "USD", "EUR"];
  const PCT_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];
  const taskTypeId = Number(task.task_type_id ?? 0);
  const isSpecialType = [21, 22].includes(taskTypeId);

  // Derive selected status id for justification logic
  const selectedStatusName = g("task_status_name", task.task_status_name ?? "");
  const selectedStatus = statusTypes.find((st) => st.statustype_name === selectedStatusName);
  const selectedStatusId = selectedStatus?.statustype_id ?? (task.task_status_id ?? 0);
  const needsJustification = [3, 4].includes(Number(selectedStatusId));

  // Status justifications — load ALL, filter client-side (mirrors Streamlit approach)
  const justQ = useQuery({
    queryKey: ["status-justifications-all"],
    queryFn: () => tasksApi.getStatusJustifications().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  // Projects
  const customerId = Number(task.task_customer_id ?? 0);
  const projectsQ = useQuery({
    queryKey: ["task-projects", customerId],
    queryFn: () => tasksApi.getProjects(customerId).then((r) => r.data),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsQ.data ?? [];
  const projectTeamQ = useQuery({
    queryKey: ["task-project-team", customerId],
    queryFn: () => tasksApi.getProjectTeam(customerId).then((r) => r.data),
    enabled: !!customerId && showProjectTeam,
    staleTime: 5 * 60 * 1000,
  });

  const justifications = (justQ.data ?? [])
    .filter((j) => Number(j.status_justification_status_id) === Number(selectedStatusId))
    .map((j) => String(j.status_justification_pt ?? j.status_justification_en ?? ""))
    .filter(Boolean);

  const endForFY = g("task_end_performed", fmtDate(task.task_end_performed)) || fmtDate(task.task_end);

  const saveMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const data: Record<string, unknown> = {};
      const changes: string[] = [];
      const mapField = (k: string, label: string, transform?: (v: string) => unknown) => {
        if (!(k in edits)) return;
        const orig = String((task as Record<string, unknown>)[k] ?? "");
        if (edits[k] === orig) return;
        data[k] = transform ? transform(edits[k]) : edits[k];
        changes.push(`${label} → ${edits[k]}`);
      };
      if ("task_owner_name" in edits && edits.task_owner_name !== (task.task_owner_name ?? "")) {
        const csm = csms.find((c) => c.csm_name === edits.task_owner_name);
        data.task_owner_id = csm ? csm.csm_id : 0;
        changes.push(`Owner → ${edits.task_owner_name || "UNASSIGNED"}`);
      }
      if ("task_temp_owner_name" in edits && edits.task_temp_owner_name !== (task.task_temp_owner_name ?? "")) {
        const csm = csms.find((c) => c.csm_name === edits.task_temp_owner_name);
        data.task_temp_owner_id = csm ? csm.csm_id : 0;
        changes.push(`Temp Owner → ${edits.task_temp_owner_name || "none"}`);
      }
      if ("task_status_name" in edits && edits.task_status_name !== (task.task_status_name ?? "")) {
        const st = statusTypes.find((x) => x.statustype_name === edits.task_status_name);
        if (st) { data.task_status = st.statustype_id; changes.push(`Status → ${edits.task_status_name}`); }
      }
      if ("task_status_justification" in edits) data.task_status_justification = edits.task_status_justification || null;
      if ("task_project_id" in edits) { const pid = parseInt(edits.task_project_id); data.task_project_id = pid || null; }
      if ("task_completed_pct" in edits) { data.task_completed = parseInt(edits.task_completed_pct) / 100; }
      mapField("task_priority", "Priority");
      mapField("task_reference", "Reference");
      mapField("task_ws", "WS");
      mapField("task_deal_id", "Deal ID");
      mapField("task_value", "Value", (v) => parseFloat(v) || 0);
      mapField("task_currency", "Currency");
      mapField("task_remark", "Remark");
      mapField("task_description", "Description");
      // Regras 4 e 5: datas de início/fim derivadas das activities (se existirem)
      if (activities.length > 0) {
        const startCandidates = activities
          .map((a) => a.activity_start_performed || a.activity_start)
          .filter(Boolean)
          .map((d) => String(d).slice(0, 10))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        if (startCandidates.length > 0) {
          data.task_start_performed = startCandidates[0]; // menor data
          changes.push(`Start → ${startCandidates[0]}`);
        }
        const endCandidates = activities
          .map((a) => a.activity_end_performed || a.activity_end)
          .filter(Boolean)
          .map((d) => String(d).slice(0, 10))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        if (endCandidates.length > 0) {
          data.task_end_performed = endCandidates[endCandidates.length - 1]; // maior data
          changes.push(`End → ${endCandidates[endCandidates.length - 1]}`);
        }
      } else {
        // Sem activities: permite edição manual das datas
        mapField("task_start_performed", "Start");
        mapField("task_end_performed", "End");
      }
      const remark = changes.join("; ");
      const history = remark ? { taskrecord_remark: remark } : undefined;
      return tasksApi.updateTask(task.task_id, data, history).then((r) => r.data);
    },
    onSuccess: () => {
      setEdits({}); setSaved(true);
      void qc.invalidateQueries({ queryKey: ["task-activities", task.task_id] });
      void qc.invalidateQueries({ queryKey: ["task-history", task.task_id] });
      onSaved();
    },
  });

  return (
    <div className="space-y-3">
      {showCreationInfo && (
        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-[10px]">
          <div><span className="text-gray-400 uppercase">Criado por: </span><span className="font-medium text-gray-700 dark:text-gray-300">{task.task_created_by_name ?? "—"}</span></div>
          <div><span className="text-gray-400 uppercase">Criado em: </span><span className="font-medium text-gray-700 dark:text-gray-300">{task.task_created_in ? fmtDateDisplay(String(task.task_created_in)) : "—"}</span></div>
        </div>
      )}

      {/* Indicador de somente-leitura (Regra 1) */}
      {!canEdit && !isClosed && (
        <div className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-[10px] text-amber-700 dark:text-amber-300">
          ⚠️ Somente o responsável ou administrador pode editar esta tarefa.
        </div>
      )}

      {/* Owner + Status */}
      <div className="grid grid-cols-2 gap-3">
        <LabelInput label={t("task.formOwner")}><Sel value={g("task_owner_name", task.task_owner_name ?? "")} onChange={(v) => s("task_owner_name", v)} options={csmOptions} disabled={isReadOnly} /></LabelInput>
        <LabelInput label={t("task.formStatus")}><Sel value={g("task_status_name", task.task_status_name ?? "")} onChange={(v) => s("task_status_name", v)} options={statusOptions} disabled={isReadOnly} /></LabelInput>
      </div>

      {/* Status Justification */}
      {needsJustification && (
        <LabelInput label="Justificativa ⚠️">
          <select value={g("task_status_justification", task.task_status_justification ?? "")} onChange={(e) => s("task_status_justification", e.target.value)} disabled={isReadOnly}
            className="w-full text-xs px-2 py-1.5 border border-orange-400 dark:border-orange-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-60">
            <option value="">Selecione uma justificativa...</option>
            {justifications.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </LabelInput>
      )}

      {/* Temp Owner + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <LabelInput label={t("task.formTempOwner")}><Sel value={g("task_temp_owner_name", task.task_temp_owner_name ?? "")} onChange={(v) => s("task_temp_owner_name", v)} options={csmOptions} disabled={isReadOnly} /></LabelInput>
        <LabelInput label={t("task.formPriority")}><Sel value={g("task_priority", task.task_priority ?? "LOW")} onChange={(v) => s("task_priority", v)} options={PRIORITY_OPTIONS} disabled={isReadOnly} /></LabelInput>
      </div>

      {/* Reference (full width) */}
      <LabelInput label={t("task.formReference")}><Inp value={g("task_reference", task.task_reference ?? "")} onChange={(v) => s("task_reference", v)} disabled={isReadOnly} /></LabelInput>

      {/* WS/Subscr. + Deal ID + Value + Moeda */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LabelInput label="WS / Subscr."><Inp value={g("task_ws", task.task_ws ?? "")} onChange={(v) => s("task_ws", v)} disabled={isReadOnly} /></LabelInput>
        <LabelInput label={t("task.formDealId")}><Inp value={g("task_deal_id", task.task_deal_id ?? "")} onChange={(v) => s("task_deal_id", v)} disabled={isReadOnly} /></LabelInput>
        <LabelInput label={t("task.formValue")}><Inp value={g("task_value", String(task.task_value ?? "0"))} onChange={(v) => s("task_value", v)} disabled={isReadOnly} type="number" /></LabelInput>
        <LabelInput label={t("task.formCurrency")}><Sel value={g("task_currency", task.task_currency ?? "USD")} onChange={(v) => s("task_currency", v)} options={CURRENCY_OPTIONS} disabled={isReadOnly} /></LabelInput>
      </div>

      {/* Track + Subtrack (read-only, always shown) */}
      <LabelInput label="Track"><Inp value={String(task.task_track ?? "")} onChange={() => void 0} disabled /></LabelInput>
      <LabelInput label="Subtrack"><Inp value={String(task.task_subtrack ?? "")} onChange={() => void 0} disabled /></LabelInput>

      {/* Start + End + Concluído % */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput label={t("task.formStart")}>
          {/* Regra 4: leitura automática das activities quando existirem */}
          <Inp value={g("task_start_performed", fmtDate(task.task_start_performed))} onChange={(v) => s("task_start_performed", v)} disabled={isReadOnly || activities.length > 0} type="date" />
          {activities.length > 0
            ? <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Auto: menor data das atividades</p>
            : <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {fmtDateDisplay(task.task_start)}</p>}
        </LabelInput>
        <LabelInput label={t("task.formEnd")}>
          {/* Regra 5: leitura automática das activities quando existirem */}
          <Inp value={g("task_end_performed", fmtDate(task.task_end_performed))} onChange={(v) => s("task_end_performed", v)} disabled={isReadOnly || activities.length > 0} type="date" />
          {activities.length > 0
            ? <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Auto: maior data das atividades</p>
            : <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {fmtDateDisplay(task.task_end)}</p>}
        </LabelInput>
        <LabelInput label={t("task.completedPct")}><Sel value={g("task_completed_pct", completedToLabel(task.task_completed))} onChange={(v) => s("task_completed_pct", v)} options={PCT_OPTIONS} disabled={isReadOnly} /></LabelInput>
      </div>

      {/* Project */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <LabelInput label={t("task.fieldProject")}>
            <select value={g("task_project_id", String(task.task_project_id ?? ""))} onChange={(e) => s("task_project_id", e.target.value)} disabled={isReadOnly || !projects.length}
              className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60">
              <option value="">{t("task.noProject")}</option>
              {projects.map((p) => <option key={p.project_id} value={String(p.project_id)}>{p.project_ov_name ?? p.project_name ?? `#${p.project_id}`}</option>)}
            </select>
          </LabelInput>
        </div>
        {projects.length > 0 && (
          <button onClick={() => setShowProjectTeam(!showProjectTeam)}
            className={`mb-0 px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-colors ${showProjectTeam ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100"}`}>
            <Info size={11} />
          </button>
        )}
      </div>

      {/* Project team */}
      {showProjectTeam && projectTeamQ.data && projectTeamQ.data.length > 0 && (
        <div className="p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
          <p className="font-bold uppercase text-[9px] mb-1">{t("task.projectTeam")}</p>
          {projectTeamQ.data.filter((pt) => pt.projteam_project_id === (parseInt(g("task_project_id", String(task.task_project_id ?? "0"))) || task.task_project_id)).map((pt, i) => (
            <p key={i}>{pt.projteam_member_name} {pt.projteam_level_name ? `(${pt.projteam_level_name})` : ""}</p>
          ))}
        </div>
      )}

      {/* Description */}
      <LabelInput label={t("common.description")}>
        <Textarea value={g("task_description", task.task_description ?? "")} onChange={(v) => s("task_description", v)} disabled={isReadOnly} placeholder={t("task.descriptionPlaceholder")} rows={2} />
      </LabelInput>

      {/* For type 21/22: LCI/EA fields (read-only) */}
      {isSpecialType && (
        <div className="p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
          <p className="text-[9px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Informações EA / LCI</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {task.task_cr_party_id && <div><span className="text-gray-400">Party ID: </span><span className="text-gray-700 dark:text-gray-300">{task.task_cr_party_id}</span></div>}
            {task.task_cr_party_name && <div><span className="text-gray-400">Party: </span><span className="text-gray-700 dark:text-gray-300">{task.task_cr_party_name}</span></div>}
            <div><span className="text-gray-400">EA: </span><span>{task.task_ea_flag ? "✅" : "❌"}</span></div>
            <div><span className="text-gray-400">Telemetry: </span><span>{task.task_telemetry_flag ? "✅" : "❌"}</span></div>
            <div><span className="text-gray-400">Opt-in: </span><span>{task.task_opt_in_flag ? "✅" : "❌"}</span></div>
            {task.task_eligible && <div><span className="text-gray-400">Eligible: </span><span className="text-gray-700 dark:text-gray-300">{task.task_eligible}</span></div>}
            {task.task_booking_date && <div><span className="text-gray-400">Booking: </span><span className="text-gray-700 dark:text-gray-300">{fmtDateDisplay(task.task_booking_date)}</span></div>}
            {task.task_booking_amount != null && <div><span className="text-gray-400">Booking Amt: </span><span className="text-gray-700 dark:text-gray-300">{task.task_booking_amount}</span></div>}
            {task.task_architecture && <div><span className="text-gray-400">Architecture: </span><span className="text-gray-700 dark:text-gray-300">{task.task_architecture}</span></div>}
            {task.task_solution_domain && <div><span className="text-gray-400">Solution: </span><span className="text-gray-700 dark:text-gray-300">{task.task_solution_domain}</span></div>}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && <p className="text-xs text-green-600 dark:text-green-400">Salvo!</p>}
        {saveMut.isError && <p className="text-xs text-red-600 dark:text-red-400">Erro ao salvar</p>}
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || isReadOnly}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
          {saveMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
          {saveMut.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ─── RACI Matrix ──────────────────────────────────────────────────────────────

const RACI_COLS: { key: string; label: string; color: string; bg: string }[] = [
  { key: "R", label: "R — Responsible", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  { key: "A", label: "A — Accountable", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
  { key: "C", label: "C — Consulted", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  { key: "I", label: "I — Informed", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700" },
];

function RACIMatrix({ task, taskId, selectedActivityId, selectedActivityName }: {
  task: TaskItem; taskId: number;
  selectedActivityId: number | null;
  selectedActivityName?: string;
}) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPersonId, setNewPersonId] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("R");
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonJobTitle, setNewPersonJobTitle] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");

  const isTask = selectedActivityId === null;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const raciQ = useQuery({
    queryKey: ["task-raci", taskId, selectedActivityId],
    queryFn: () => tasksApi.getRaci(taskId, selectedActivityId ?? undefined).then((r) => r.data),
    staleTime: 60000,
  });

  const companyQ = useQuery({
    queryKey: ["company-list"],
    queryFn: () => tasksApi.getCompanyList().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const personQ = useQuery({
    queryKey: ["person-list", selectedCompanyId],
    queryFn: () => tasksApi.getPersonList(
      selectedCompanyId ? parseInt(selectedCompanyId) : undefined,
      !selectedCompanyId
    ).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });

  const addMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      if (!newPersonId) return Promise.resolve(null);
      return tasksApi.addRaci(taskId, {
        person_id: parseInt(newPersonId),
        responsibility: newResponsibility,
        activity_id: selectedActivityId,
        person_type: "user",
      }).then((r) => r.data);
    },
    onSuccess: () => {
      setNewPersonId(""); setShowAddForm(false);
      void qc.invalidateQueries({ queryKey: ["task-raci", taskId] });
    },
  });

  const createPersonMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      if (!newPersonName.trim()) return Promise.resolve(null);
      return tasksApi.createPerson({
        person_name: newPersonName.trim(),
        person_company_id: selectedCompanyId ? parseInt(selectedCompanyId) : undefined,
        person_job_title: newPersonJobTitle.trim() || undefined,
        person_email: newPersonEmail.trim() || undefined,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      const result = data as { success: boolean; person_id: number } | null;
      setNewPersonName(""); setNewPersonJobTitle(""); setNewPersonEmail("");
      setShowNewPersonForm(false);
      void qc.invalidateQueries({ queryKey: ["person-list"] });
      if (result?.person_id) {
        setNewPersonId(String(result.person_id));
      }
    },
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState("R");
  const [infoId, setInfoId] = useState<number | null>(null);

  const updateMut = useMutation<unknown, Error, { raciId: number; responsibility: string }>({
    mutationFn: ({ raciId, responsibility }) => tasksApi.updateRaci(taskId, raciId, responsibility).then((r) => r.data),
    onSuccess: () => {
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["task-raci", taskId] });
    },
  });

  const removeMut = useMutation<unknown, Error, number>({
    mutationFn: (raciId) => tasksApi.removeRaci(taskId, raciId).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["task-raci", taskId] }),
  });

  const raci = raciQ.data ?? [];
  const persons = personQ.data ?? [];
  const byRole = (role: string) => raci.filter((r) => r.taskraci_responsibility === role);

  const personOptions = persons.map((p) => ({ value: String(p.person_id), label: p.person_name }));
  const alreadyAssigned = new Set(raci.map((r) => `${r.taskraci_person_id}-${r.taskraci_responsibility}`));
  const availablePersons = personOptions.filter((p) => !alreadyAssigned.has(`${p.value}-${newResponsibility}`));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Users size={12} />
          {isTask ? `RACI Matrix — Task #${task.task_id}` : `RACI Matrix — ${selectedActivityName ?? "Activity"}`}
        </p>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${showAddForm ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="w-48 shrink-0">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Company</label>
              <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setNewPersonId(""); }}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Internal</option>
                {(companyQ.data ?? []).map((c) => <option key={c.company_id} value={String(c.company_id)}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Person</label>
              <select value={newPersonId} onChange={(e) => setNewPersonId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select person...</option>
                {availablePersons.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="w-36">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Role</label>
              <select value={newResponsibility} onChange={(e) => setNewResponsibility(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                {RACI_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewPersonForm(!showNewPersonForm)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-colors ${showNewPersonForm ? "bg-green-600 text-white border-green-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100"}`}>
                <Plus size={10} />
                Create Person
              </button>
              <button onClick={() => { setShowAddForm(false); setNewPersonId(""); }}
                className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => addMut.mutate()} disabled={!newPersonId || addMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
                {addMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={10} />}
                Save
              </button>
            </div>
          </div>

          {/* Person not found — inline create */}
          {showNewPersonForm && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-[9px] font-bold uppercase text-gray-500 dark:text-gray-400">
                  New person {selectedCompanyId ? `(${(companyQ.data ?? []).find((c) => String(c.company_id) === selectedCompanyId)?.company_name ?? ""})` : "(Internal)"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Name *</label>
                    <Inp value={newPersonName} onChange={setNewPersonName} type="text" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Job Title</label>
                    <Inp value={newPersonJobTitle} onChange={setNewPersonJobTitle} type="text" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Email</label>
                    <Inp value={newPersonEmail} onChange={setNewPersonEmail} type="text" />
                  </div>
                </div>
                {createPersonMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">Failed to create person.</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowNewPersonForm(false); setNewPersonName(""); setNewPersonJobTitle(""); setNewPersonEmail(""); }}
                    className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => createPersonMut.mutate()} disabled={!newPersonName.trim() || createPersonMut.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white transition-colors">
                    {createPersonMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={10} />}
                    Create Person
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RACI grid */}
      {raciQ.isLoading ? (
        <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {RACI_COLS.map((col) => {
            const members = byRole(col.key);
            return (
              <div key={col.key} className={`rounded-lg border p-2.5 ${col.bg}`}>
                <p className={`text-[10px] font-bold uppercase mb-2 ${col.color}`}>{col.label}</p>
                {members.length === 0 ? (
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 italic">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div key={m.taskraci_id} className="group">
                        {editingId === m.taskraci_id ? (
                          <div className="space-y-1.5">
                            <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{m.person_name ?? `#${m.taskraci_person_id}`}</p>
                            <div className="flex flex-wrap gap-1">
                              {RACI_COLS.map((c) => (
                                <button key={c.key} onClick={() => setEditRole(c.key)}
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${editRole === c.key ? "bg-blue-600 text-white" : "border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500"}`}>
                                  {c.key}
                                </button>
                              ))}
                              <button onClick={() => { removeMut.mutate(m.taskraci_id); setEditingId(null); }}
                                disabled={removeMut.isPending}
                                className="px-2 py-0.5 text-[9px] font-bold rounded border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                Remove
                              </button>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => updateMut.mutate({ raciId: m.taskraci_id, responsibility: editRole })}
                                disabled={updateMut.isPending || editRole === (m.taskraci_responsibility ?? "R")}
                                className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-medium rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors">
                                {updateMut.isPending ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={8} />}
                                Save
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="px-2 py-0.5 text-[9px] font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="flex items-baseline gap-1 min-w-0 flex-1 text-[10px] leading-tight">
                                <span className="text-gray-700 dark:text-gray-300 shrink-0 whitespace-nowrap">
                                  {m.person_name ?? `#${m.taskraci_person_id}`}
                                </span>
                                {m.person_company_name && (
                                  <span className="text-gray-400 dark:text-gray-500 truncate" title={m.person_company_name}>
                                    ({m.person_company_name})
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                <button
                                  onClick={() => { setEditingId(m.taskraci_id); setEditRole(m.taskraci_responsibility ?? "R"); }}
                                  className="p-0.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                  title="Edit role / Remove">
                                  <Edit2 size={9} />
                                </button>
                                <button
                                  onClick={() => setInfoId(infoId === m.taskraci_id ? null : m.taskraci_id)}
                                  className={`p-0.5 rounded transition-colors ${infoId === m.taskraci_id ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                                  title="Contact info">
                                  <Info size={9} />
                                </button>
                              </div>
                            </div>
                            {infoId === m.taskraci_id && (
                              <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg text-[9px] space-y-0.5">
                                {m.person_company_name && <p className="text-gray-700 dark:text-gray-200 font-medium">{m.person_company_name}</p>}
                                {m.person_job_title && <p className="text-gray-500 dark:text-gray-400 italic">{m.person_job_title}</p>}
                                {m.person_type_label && <p className="text-gray-500 dark:text-gray-400">{m.person_type_label}</p>}
                                {m.person_email && <p className="text-blue-600 dark:text-blue-400 break-all">{m.person_email}</p>}
                                {m.person_telephone && <p className="text-gray-600 dark:text-gray-300">📞 {m.person_telephone}</p>}
                                {m.person_cellphone && <p className="text-gray-600 dark:text-gray-300">📱 {m.person_cellphone}</p>}
                                {!m.person_company_name && !m.person_email && !m.person_telephone && !m.person_cellphone && !m.person_job_title && (
                                  <p className="text-gray-400 italic">No contact info</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddActivityForm({ taskId, statusTypes, taskStart, taskEnd, onCreated, onCancel }: {
  taskId: number;
  statusTypes: StatusType[];
  taskStart?: string;
  taskEnd?: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [seq, setSeq] = useState("1");
  const [start, setStart] = useState(taskStart ?? "");
  const [end, setEnd] = useState(taskEnd ?? "");
  const [effort, setEffort] = useState("0");
  const [completedPct, setCompletedPct] = useState("0%");
  const [statusName, setStatusName] = useState("");
  const [dealId, setDealId] = useState("");
  const [ws, setWs] = useState("");
  const [value, setValue] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [approvalReqDate, setApprovalReqDate] = useState("");
  const [approved, setApproved] = useState("0");
  const [approvedValue, setApprovedValue] = useState("0");
  const [approvedCurrency, setApprovedCurrency] = useState("USD");
  const [approvalDate, setApprovalDate] = useState("");
  const [track, setTrack] = useState("");
  const [subTrack, setSubTrack] = useState("");
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState("");
  const [expectedResults, setExpectedResults] = useState("");
  const [error, setError] = useState("");

  const statusOptions = statusTypes.filter((sx) => sx.statustype_id !== 5).map((sx) => sx.statustype_name);

  const createMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const data: Record<string, unknown> = {
        activity_name: name.trim(),
        activity_seq: parseInt(seq) || 1,
        activity_start: start || null,
        activity_end: end || null,
        activity_start_performed: start || null,
        activity_end_performed: end || null,
        activity_effort: parseFloat(effort) || 0,
        activity_completed: PROGRESS_MAP[completedPct] ?? 0,
        activity_deal_id: dealId.trim() || null,
        activity_ws: ws.trim() || null,
        activity_value: parseFloat(value) || 0,
        activity_currency: currency,
        activity_approval_request_date: approvalReqDate || null,
        activity_approved: approved === "1" ? 1 : 0,
        activity_approved_value: parseFloat(approvedValue) || 0,
        activity_approved_currency: approvedCurrency,
        activity_approval_date: approvalDate || null,
        activity_track: track.trim() || null,
        activity_sub_track: subTrack.trim() || null,
        activity_objective: objective.trim() || null,
        activity_scope: scope.trim() || null,
        activity_expected_results: expectedResults.trim() || null,
      };
      if (statusName) {
        const found = statusTypes.find((sx) => sx.statustype_name === statusName);
        if (found) data.activity_status = found.statustype_id;
      }
      return tasksApi.createActivity(taskId, data).then((r) => r.data);
    },
    onSuccess: () => {
      onCreated();
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      setError(t("task.activityNameRequired"));
      return;
    }
    setError("");
    createMut.mutate();
  };

  return (
    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
      <LabelInput label={t("common.name")}>
        <Inp value={name} onChange={setName} type="text" />
      </LabelInput>
      {error && <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <LabelInput label={t("task.formSeq")}><Inp value={seq} onChange={setSeq} type="number" /></LabelInput>
        <LabelInput label={t("task.formStart")}><Inp value={start} onChange={setStart} type="date" /></LabelInput>
        <LabelInput label={t("task.formEnd")}><Inp value={end} onChange={setEnd} type="date" /></LabelInput>
        <LabelInput label={t("task.formEffortH")}><Inp value={effort} onChange={setEffort} type="number" /></LabelInput>
        <LabelInput label={t("task.formCompleted")}><Sel value={completedPct} onChange={setCompletedPct} options={PROGRESS_OPTIONS} /></LabelInput>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <LabelInput label={t("task.formStatus")}>
          <select value={statusName} onChange={(e) => setStatusName(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">—</option>
            {statusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </LabelInput>
        <LabelInput label={t("task.formDealId")}><Inp value={dealId} onChange={setDealId} type="text" /></LabelInput>
        <LabelInput label="WS"><Inp value={ws} onChange={setWs} type="text" /></LabelInput>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LabelInput label={t("task.formValueDollar")}><Inp value={value} onChange={setValue} type="number" /></LabelInput>
        <LabelInput label={t("task.formCurrency")}><Sel value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} /></LabelInput>
        <LabelInput label={t("task.formApprovalReqDate")}><Inp value={approvalReqDate} onChange={setApprovalReqDate} type="date" /></LabelInput>
        <LabelInput label={t("task.formApproved")}>
          <select value={approved} onChange={(e) => setApproved(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="0">{t("common.no")}</option>
            <option value="1">{t("common.yes")}</option>
          </select>
        </LabelInput>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput label={t("task.formApprovedValue")}><Inp value={approvedValue} onChange={setApprovedValue} type="number" /></LabelInput>
        <LabelInput label={t("task.formApprovedCurrency")}><Sel value={approvedCurrency} onChange={setApprovedCurrency} options={CURRENCY_OPTIONS} /></LabelInput>
        <LabelInput label={t("task.formApprovalDate")}><Inp value={approvalDate} onChange={setApprovalDate} type="date" /></LabelInput>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LabelInput label="Track"><Inp value={track} onChange={setTrack} type="text" /></LabelInput>
        <LabelInput label="Subtrack"><Inp value={subTrack} onChange={setSubTrack} type="text" /></LabelInput>
      </div>

      <LabelInput label={t("task.tabObjective")}>
        <Textarea value={objective} onChange={setObjective} placeholder={t("task.objectivePlaceholder")} rows={2} />
      </LabelInput>
      <LabelInput label={t("task.tabScope")}>
        <Textarea value={scope} onChange={setScope} placeholder={t("task.scopePlaceholder")} rows={2} />
      </LabelInput>
      <LabelInput label={t("task.tabExpectedResults")}>
        <Textarea value={expectedResults} onChange={setExpectedResults} placeholder={t("task.expectedResultsPlaceholder")} rows={2} />
      </LabelInput>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        {createMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">{t("task.activityCreateFailed")}</p>}
        <button onClick={onCancel} className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors">
          {t("task.cancelBtn", { defaultValue: "Cancel" })}
        </button>
        <button onClick={handleSubmit} disabled={createMut.isPending}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
          {createMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={10} />}
          {t("task.saveBtn")}
        </button>
      </div>
    </div>
  );
}

function HistorySection({ task, activities, taskId, selectedActivityId }: {
  task: TaskItem; activities: ActivityItem[]; taskId: number;
  selectedActivityId: number | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const PAGE_SIZE = 3;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("INFO");
  const [nextFU, setNextFU] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const isTask = selectedActivityId === null;
  const selectedAct = activities.find((a) => a.activity_id === selectedActivityId);

  const taskHistQ = useQuery({
    queryKey: ["task-history", taskId],
    queryFn: () => tasksApi.getHistory(taskId).then((r) => r.data),
    staleTime: 60000,
  });

  const actHistQ = useQuery({
    queryKey: ["act-hist", selectedActivityId],
    queryFn: () => tasksApi.getHistory(taskId, selectedActivityId!).then((r) => r.data),
    enabled: !isTask,
    staleTime: 60000,
  });

  // Reset pagination when context changes
  const prevTarget = isTask ? "task" : selectedActivityId;
  const [lastTarget, setLastTarget] = useState(prevTarget);
  if (lastTarget !== prevTarget) { setLastTarget(prevTarget); setVisibleCount(PAGE_SIZE); }

  const addNoteMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      if (!noteText.trim()) return Promise.resolve(null);
      const payload = isTask
        ? { taskrecord_remark: noteText.trim(), taskrecord_type: noteType, taskrecord_next_followup: nextFU || undefined }
        : { taskrecord_task_id: taskId, taskrecord_activity_id: selectedActivityId!, taskrecord_remark: noteText.trim(), taskrecord_type: noteType, taskrecord_next_followup: nextFU || undefined };
      return tasksApi.addHistory(taskId, payload).then((r) => r.data);
    },
    onSuccess: () => {
      setNoteText(""); setNextFU(""); setNoteSaved(true);
      void qc.invalidateQueries({ queryKey: ["task-history", taskId] });
      void qc.invalidateQueries({ queryKey: ["act-hist"] });
      setTimeout(() => { setNoteSaved(false); setShowAddNote(false); }, 1500);
    },
  });

  const rawItems = isTask ? (taskHistQ.data ?? []) : (actHistQ.data ?? []);
  const isLoading = isTask ? taskHistQ.isLoading : actHistQ.isLoading;
  const allItems = typeFilter ? rawItems.filter((h) => (h.taskrecord_type ?? "INFO") === typeFilter) : rawItems;
  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  const NOTE_TYPE_FILTERS: { key: string; activeClass: string; inactiveClass: string }[] = [
    { key: "INFO", activeClass: "bg-gray-600 text-white border-gray-600", inactiveClass: "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" },
    { key: "ISSUE", activeClass: "bg-orange-500 text-white border-orange-500", inactiveClass: "border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20" },
    { key: "BLOCKER", activeClass: "bg-red-600 text-white border-red-600", inactiveClass: "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" },
    { key: "LOG", activeClass: "bg-blue-600 text-white border-blue-600", inactiveClass: "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20" },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <History size={12} />
          {isTask
            ? `${t("task.taskHistory")} — Task #${task.task_id}`
            : `${t("task.activityHistory")} — ${selectedAct?.activity_name ?? ""}`}
        </p>
        <button onClick={() => { setShowAddNote(!showAddNote); }}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${showAddNote ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
          + {t("task.addNoteBtn", { defaultValue: "Add Note" })}
        </button>
      </div>

      {/* Type filter buttons */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {NOTE_TYPE_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setTypeFilter((cur) => (cur === f.key ? null : f.key))}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors ${typeFilter === f.key ? f.activeClass : f.inactiveClass}`}>
            {f.key}
          </button>
        ))}
        {typeFilter && (
          <button onClick={() => setTypeFilter(null)}
            className="px-2 py-1 text-[10px] font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {t("task.clearFilter", { defaultValue: "Clear" })}
          </button>
        )}
      </div>

      {/* Add Note form */}
      {showAddNote && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {isTask ? `Adding note to Task #${task.task_id}` : `Adding note to: ${selectedAct?.activity_name ?? "activity"}`}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <LabelInput label={t("task.formNotes")}>
                <Textarea value={noteText} onChange={setNoteText} placeholder={t("task.noteTaskPlaceholder")} rows={3} />
              </LabelInput>
            </div>
            <div className="space-y-2">
              <LabelInput label={t("task.formNoteType")}>
                <Sel value={noteType} onChange={setNoteType} options={["INFO", "ISSUE", "BLOCKER", "LOG"]} />
              </LabelInput>
              <LabelInput label={t("task.formNextFollowUp")}>
                <Inp value={nextFU} onChange={setNextFU} type="date" />
              </LabelInput>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            {noteSaved && <p className="text-[10px] text-green-600 dark:text-green-400">{t("task.savedSuccess")}</p>}
            {addNoteMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">{t("task.saveFailed")}</p>}
            <button onClick={() => { setShowAddNote(false); setNoteText(""); }} className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors">
              {t("task.cancelBtn", { defaultValue: "Cancel" })}
            </button>
            <button onClick={() => addNoteMut.mutate()} disabled={!noteText.trim() || addNoteMut.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
              {addNoteMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={10} />}
              {t("task.saveBtn")}
            </button>
          </div>
        </div>
      )}

      {/* History list with pagination */}
      {isLoading ? (
        <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-2">
            {visibleItems.map((h) => (
              <div key={h.taskrecord_id} className="text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-gray-400 dark:text-gray-500">
                    {h.taskrecord_date ? (() => {
                      const d = new Date(String(h.taskrecord_date));
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const dd = String(d.getDate()).padStart(2, "0");
                      const mmm = months[d.getMonth()];
                      const yyyy = d.getFullYear();
                      const hh = String(d.getHours()).padStart(2, "0");
                      const mi = String(d.getMinutes()).padStart(2, "0");
                      const ss = String(d.getSeconds()).padStart(2, "0");
                      return `${dd}/${mmm}/${yyyy} ${hh}:${mi}:${ss}`;
                    })() : "—"}
                  </span>
                  {h.taskrecord_type && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.taskrecord_type === "BLOCKER" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : h.taskrecord_type === "ISSUE" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{h.taskrecord_type}</span>}
                  {h.taskrecord_status && String(h.taskrecord_status) !== "0" && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h.taskrecord_status}</span>}
                  {Boolean((h as Record<string, unknown>).taskrecord_next_followup) && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      ⏰ {String((h as Record<string, unknown>).taskrecord_next_followup).slice(0, 10)}
                    </span>
                  )}
                  <span className="ml-auto text-gray-400 dark:text-gray-500">{String(h.taskrecord_updated_by ?? "")}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{String(h.taskrecord_remark ?? "")}</p>
              </div>
            ))}
            {!allItems.length && <p className="text-xs text-gray-400 py-3">{t("task.noHistory")}</p>}
          </div>
          {hasMore && (
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-3 w-full text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline py-1">
              {t("task.showMore", { defaultValue: `Show more (${allItems.length - visibleCount} remaining)` })}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const TABLE_PAGE_SIZE = 10;

function taskStatusColor(status?: string): string {
  const s = (status ?? "").toUpperCase();
  if (s.includes("OPEN")) return "text-blue-600 dark:text-blue-400";
  if (s.includes("PROGRESS") || s.includes("IN ")) return "text-yellow-600 dark:text-yellow-400";
  if (s.includes("HOLD")) return "text-orange-600 dark:text-orange-400";
  if (s.includes("DELAYED") || s.includes("ATRASAD")) return "text-red-600 dark:text-red-400";
  if (s.includes("DONE") || s.includes("CLOSED") || s.includes("COMPLETED") || s.includes("CANCEL")) return "text-green-600 dark:text-green-400";
  return "text-gray-500 dark:text-gray-400";
}

function taskPriorityColor(priority?: string): string {
  const p = (priority ?? "").toUpperCase();
  if (p === "HIGH") return "text-red-600 dark:text-red-400";
  if (p === "MEDIUM") return "text-yellow-600 dark:text-yellow-400";
  return "text-blue-600 dark:text-blue-400";
}

export default function TaskDetailPanel({ tasks, initialIndex = 0, onClose }: Props) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(Math.min(initialIndex, tasks.length - 1));
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [showCreationInfo, setShowCreationInfo] = useState(false);
  const [tablePage, setTablePage] = useState(Math.floor(Math.min(initialIndex, tasks.length - 1) / TABLE_PAGE_SIZE));
  const [showAddActivity, setShowAddActivity] = useState(false);
  const qc = useQueryClient();

  const task = tasks[idx];
  const taskId = task?.task_id;

  const activitiesQuery = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: () => tasksApi.getActivities(taskId!).then((r) => r.data),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });

  const csmQuery = useQuery({
    queryKey: ["csm-list"],
    queryFn: () => tasksApi.getCsmList().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const statusQuery = useQuery({
    queryKey: ["status-types"],
    queryFn: () => tasksApi.getStatusTypes().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  if (!task) return null;

  const activities = activitiesQuery.data ?? [];
  const csms = csmQuery.data ?? [];
  const statusTypes = statusQuery.data ?? [];

  // ── Regras 1 e 2: permissões do usuário atual ──
  const currentUser = useAuthStore.getState().user;
  const isAdmin = useAuthStore.getState().hasRole("ADMIN");
  const hasTaskEdit = useAuthStore.getState().hasPermission("task.edit");
  const currentUserId = currentUser?.id ?? 0;
  const isOwner = currentUserId === task.task_owner_id;
  const isTempOwner = currentUserId === task.task_temp_owner_id;
  // Regra 1: dono, dono temporário, admin ou permissão task.edit podem editar
  const canEdit = isOwner || isTempOwner || isAdmin || hasTaskEdit;
  // Regra 2: somente dono (não temp), admin ou permissão task.edit podem encerrar
  const canClose = isOwner || isAdmin || hasTaskEdit;

  const critColor = (lvl?: string) => lvl === "N1" ? "text-red-600 dark:text-red-400" : lvl === "N2" ? "text-orange-600 dark:text-orange-400" : "";

  const totalPages = Math.ceil(tasks.length / TABLE_PAGE_SIZE);
  const pagedTasks = tasks.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* ── Task table (replaces navigation bar) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
            {t("task.tasksFound", { count: tasks.length, defaultValue: `${tasks.length} Tasks Found` })}
          </span>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {["ID", t("task.colClient"), t("task.colType"), t("task.colOwner"), t("common.status"), t("task.priority"), t("task.colEndDate"), "WS", t("task.filterDealId")].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedTasks.map((taskRow, pageIdx) => {
                const realIdx = tablePage * TABLE_PAGE_SIZE + pageIdx;
                return (
                  <tr key={taskRow.task_id} onClick={() => { setIdx(realIdx); setSelectedActivityId(null); }}
                    className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${realIdx === idx ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500 font-mono">{taskRow.task_id}</td>
                    <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{taskRow.task_customer_name ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[100px] truncate">{taskRow.task_type_name ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 max-w-[100px] truncate">{taskRow.task_owner_name ?? "—"}</td>
                    <td className="py-1.5 px-2"><span className={`font-medium ${taskStatusColor(taskRow.task_status_reclassified ?? taskRow.task_status_name)}`}>{taskRow.task_status_reclassified ?? taskRow.task_status_name ?? "—"}</span></td>
                    <td className={`py-1.5 px-2 font-medium ${taskPriorityColor(taskRow.task_priority)}`}>{taskRow.task_priority ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500 whitespace-nowrap">{taskRow.task_end_performed ? taskRow.task_end_performed.slice(0, 10) : taskRow.task_end ? taskRow.task_end.slice(0, 10) : "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{taskRow.task_ws ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-500">{taskRow.task_deal_id ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button onClick={() => setTablePage((p) => Math.max(0, p - 1))} disabled={tablePage === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {t("task.taskOf", { current: idx + 1, total: tasks.length })} · Página {tablePage + 1}/{totalPages}
            </span>
            <button onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))} disabled={tablePage === totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* LEFT: task info or edit form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {/* Card header: title */}
          <div className="flex items-center mb-3 gap-2 min-w-0">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate flex-1">
              #{task.task_id} — <span className="font-normal text-gray-500 dark:text-gray-400">{task.task_type_name ?? "—"}</span>
            </h3>
            {task.critical_level && task.critical_level !== "NONE" && (
              <span className={`text-xs font-bold shrink-0 ${critColor(task.critical_level)}`}>CRIT {task.critical_level}</span>
            )}
            <button onClick={() => setShowCreationInfo(!showCreationInfo)}
              className={`p-1 rounded transition-colors shrink-0 ${showCreationInfo ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
              title="Informações de criação">
              <Info size={13} />
            </button>
          </div>

          <TaskEditForm
            task={task} csms={csms} statusTypes={statusTypes} activities={activities}
            canEdit={canEdit} canClose={canClose}
            showCreationInfo={showCreationInfo}
            onSaved={() => { void qc.invalidateQueries({ queryKey: ["task-activities", taskId] }); }}
          />
        </div>

        {/* RIGHT: activities */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
              {t("task.activitiesHeader", { count: activities.length })}
            </h3>
            <button onClick={() => setShowAddActivity((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${showAddActivity ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              <Plus size={12} />
              {t("task.addActivityBtn")}
            </button>
          </div>
          {showAddActivity && (
            <AddActivityForm
              taskId={taskId!}
              statusTypes={statusTypes}
              taskStart={fmtDate(task.task_start)}
              taskEnd={fmtDate(task.task_end)}
              onCancel={() => setShowAddActivity(false)}
              onCreated={() => {
                setShowAddActivity(false);
                void activitiesQuery.refetch();
                void qc.invalidateQueries({ queryKey: ["task-history", taskId] });
              }}
            />
          )}
          {activitiesQuery.isLoading ? (
            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("task.noActivities")}</p>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              {activities.map((act) => (
                <ActivityRow key={act.activity_id} act={act} statusTypes={statusTypes} taskId={taskId!} onUpdated={() => void activitiesQuery.refetch()} onSelectHistory={(id) => setSelectedActivityId(id)} isSelectedForHistory={selectedActivityId === act.activity_id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RACI Matrix ── */}
      <RACIMatrix
        task={task}
        taskId={taskId!}
        selectedActivityId={selectedActivityId}
        selectedActivityName={activities.find((a) => a.activity_id === selectedActivityId)?.activity_name}
      />

      {/* ── History section (always visible) ── */}
      <HistorySection
        task={task}
        activities={activities}
        taskId={taskId!}
        selectedActivityId={selectedActivityId}
      />
    </div>
  );
}
