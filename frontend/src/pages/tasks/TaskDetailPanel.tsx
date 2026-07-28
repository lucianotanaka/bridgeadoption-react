import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Save, History, X, Edit2, Users, Info } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, ActivityItem, HistoryItem, CSMItem, StatusType, RACIItem, PersonItem, CompanyItem } from "@/api/tasks";

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
const DEADLINE_ICON: Record<string, string> = { delayed: "🚨", today: "⚠️", this_week: "⏳", next_week: "📅", future: "🕒" };

function fmtDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
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
                  {h.taskrecord_status && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h.taskrecord_status}</span>}
                  {(h as Record<string, unknown>).taskrecord_next_followup && (
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
  const bucket = deadlineBucket(fmtDate(act.activity_end_performed ?? act.activity_end) || null);
  const statusId = act.activity_status ?? 0;
  const isClosed = CLOSED_STATUS.has(statusId);

  const g = (k: string, fallback: string = ""): string => k in edits ? edits[k] : String((act as Record<string, unknown>)[k] ?? fallback);
  const s = (k: string, v: string) => { setEdits((p) => ({ ...p, [k]: v })); setSaved(false); };

  const saveMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const data: Record<string, unknown> = {};
      const changes: string[] = [];
      const seq = parseInt(edits.activity_seq ?? "");
      if (!isNaN(seq) && seq !== act.activity_seq) data.activity_seq = seq;
      if ("activity_status_name" in edits && edits.activity_status_name !== act.activity_status_name) {
        const found = statusTypes.find((sx) => sx.statustype_name === edits.activity_status_name);
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
      ["activity_objective", "activity_scope", "activity_expected_results", "activity_track", "activity_sub_track", "activity_deal_id", "activity_ws", "activity_value", "activity_currency"].forEach((k) => {
        if (k in edits && edits[k] !== String((act as Record<string, unknown>)[k] ?? "")) data[k] = edits[k];
      });
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
      <button onClick={() => { const next = !expanded; setExpanded(next); onSelectHistory?.(next ? act.activity_id : null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-4">{act.activity_seq}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{act.activity_name ?? "—"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
          </div>
        </div>
        <span className="text-sm">{DEADLINE_ICON[bucket]}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isClosed ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"}`}>{act.activity_status_name ?? "—"}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">{fmtDate(act.activity_end_performed ?? act.activity_end) || "—"}</span>
        <Edit2 size={11} className="text-gray-400 shrink-0" />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30 dark:bg-gray-800/20 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <LabelInput label={t("task.formSeq")}><Inp value={g("activity_seq", String(act.activity_seq ?? "1"))} onChange={(v) => s("activity_seq", v)} disabled={isClosed} type="number" /></LabelInput>
            <LabelInput label={`${t("task.formStart")}${bucket === "delayed" ? " 🚨" : ""}`}>
              <Inp value={g("activity_start_performed", fmtDate(act.activity_start_performed))} onChange={(v) => s("activity_start_performed", v)} disabled={isClosed} type="date" />
              <p className="text-[10px] text-gray-400 mt-0.5">{t("task.formExpected")} {fmtDate(act.activity_start) || "—"}</p>
            </LabelInput>
            <LabelInput label={`${t("task.formEnd")}${bucket === "delayed" ? " 🚨" : bucket === "today" ? " ⚠️" : ""}`}>
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
            <LabelInput label={t("task.formStatus")}><Sel value={g("activity_status_name", act.activity_status_name ?? "")} onChange={(v) => s("activity_status_name", v)} options={statusOptions} disabled={isClosed} /></LabelInput>
            <LabelInput label={t("task.formDealId")}><Inp value={g("activity_deal_id", String(act.activity_deal_id ?? ""))} onChange={(v) => s("activity_deal_id", v)} disabled={isClosed} /></LabelInput>
            <LabelInput label="WS"><Inp value={g("activity_ws", String(act.activity_ws ?? ""))} onChange={(v) => s("activity_ws", v)} disabled={isClosed} /></LabelInput>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LabelInput label={t("task.formValueDollar")}><Inp value={g("activity_value", String(act.activity_value ?? "0"))} onChange={(v) => s("activity_value", v)} disabled={isClosed} type="number" /></LabelInput>
            <LabelInput label={t("task.formCurrency")}><Sel value={g("activity_currency", String(act.activity_currency ?? "USD"))} onChange={(v) => s("activity_currency", v)} options={CURRENCY_OPTIONS} disabled={isClosed} /></LabelInput>
          </div>
          <div>
            <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-gray-700">
              {(["objective", "scope", "results", "track"] as const).map((tabKey) => (
                <button key={tabKey} onClick={() => setTab(tabKey)} className={`text-[10px] px-3 py-1.5 font-medium transition-colors capitalize ${tab === tabKey ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  {tabKey === "results" ? t("task.tabExpectedResults") : tabKey === "track" ? t("task.tabTrackSubtrack") : tabKey === "objective" ? t("task.tabObjective") : t("task.tabScope")}
                </button>
              ))}
            </div>
            {tab === "objective" && <Textarea value={g("activity_objective", String(act.activity_objective ?? ""))} onChange={(v) => s("activity_objective", v)} disabled={isClosed} placeholder="Activity objective..." rows={4} />}
            {tab === "scope" && <Textarea value={g("activity_scope", String(act.activity_scope ?? ""))} onChange={(v) => s("activity_scope", v)} disabled={isClosed} placeholder="Activity scope..." rows={4} />}
            {tab === "results" && <Textarea value={g("activity_expected_results", String(act.activity_expected_results ?? ""))} onChange={(v) => s("activity_expected_results", v)} disabled={isClosed} placeholder="Expected results..." rows={4} />}
            {tab === "track" && (
              <div className="grid grid-cols-2 gap-3">
                <LabelInput label="Track"><Inp value={g("activity_track", String(act.activity_track ?? ""))} onChange={(v) => s("activity_track", v)} disabled={isClosed} /></LabelInput>
                <LabelInput label="Subtrack"><Inp value={g("activity_sub_track", String(act.activity_sub_track ?? ""))} onChange={(v) => s("activity_sub_track", v)} disabled={isClosed} /></LabelInput>
              </div>
            )}
          </div>
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

function TaskEditForm({ task, csms, statusTypes, onSaved }: { task: TaskItem; csms: CSMItem[]; statusTypes: StatusType[]; onSaved: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isClosed = CLOSED_STATUS.has(task.task_status_id ?? 0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const g = (k: string, fallback: string = ""): string => k in edits ? edits[k] : String((task as Record<string, unknown>)[k] ?? fallback);
  const s = (k: string, v: string) => { setEdits((p) => ({ ...p, [k]: v })); setSaved(false); };

  const csmOptions = ["", ...csms.map((c) => c.csm_name)];
  const statusOptions = statusTypes.filter((st) => st.statustype_id !== 5).map((st) => st.statustype_name);

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
      mapField("task_priority", "Priority");
      mapField("task_reference", "Reference");
      mapField("task_ws", "WS");
      mapField("task_deal_id", "Deal ID");
      mapField("task_value", "Value", (v) => parseFloat(v) || 0);
      mapField("task_start_performed", "Start");
      mapField("task_end_performed", "End");
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
      {/* Row 1: Owner, Status */}
      <div className="grid grid-cols-2 gap-3">
        <LabelInput label={t("task.formOwner")}>
          <Sel value={g("task_owner_name", task.task_owner_name ?? "")} onChange={(v) => s("task_owner_name", v)} options={csmOptions} disabled={isClosed} />
        </LabelInput>
        <LabelInput label={t("task.formStatus")}>
          <Sel value={g("task_status_name", task.task_status_name ?? "")} onChange={(v) => s("task_status_name", v)} options={statusOptions} disabled={isClosed} />
        </LabelInput>
      </div>
      {/* Row 2: Temp Owner, Priority */}
      <div className="grid grid-cols-2 gap-3">
        <LabelInput label={t("task.formTempOwner")}>
          <Sel value={g("task_temp_owner_name", task.task_temp_owner_name ?? "")} onChange={(v) => s("task_temp_owner_name", v)} options={csmOptions} disabled={isClosed} />
        </LabelInput>
        <LabelInput label={t("task.formPriority")}>
          <Sel value={g("task_priority", task.task_priority ?? "LOW")} onChange={(v) => s("task_priority", v)} options={PRIORITY_OPTIONS} disabled={isClosed} />
        </LabelInput>
      </div>
      {/* Row 3: Reference, WS, Deal ID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabelInput label={t("task.formReference")}><Inp value={g("task_reference", task.task_reference ?? "")} onChange={(v) => s("task_reference", v)} disabled={isClosed} /></LabelInput>
        <LabelInput label={t("task.formWsSub")}><Inp value={g("task_ws", task.task_ws ?? "")} onChange={(v) => s("task_ws", v)} disabled={isClosed} /></LabelInput>
        <LabelInput label={t("task.formDealId")}><Inp value={g("task_deal_id", task.task_deal_id ?? "")} onChange={(v) => s("task_deal_id", v)} disabled={isClosed} /></LabelInput>
      </div>
      {/* Row 4: Track (read-only), Value, Start, End */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LabelInput label={t("task.formTrack")}><Inp value={String(task.task_track ?? "")} onChange={() => void 0} disabled /></LabelInput>
        <LabelInput label={t("task.formValue")}><Inp value={g("task_value", String(task.task_value ?? "0"))} onChange={(v) => s("task_value", v)} disabled={isClosed} type="number" /></LabelInput>
        <LabelInput label={t("task.formStart")}><Inp value={g("task_start_performed", fmtDate(task.task_start_performed ?? task.task_start))} onChange={(v) => s("task_start_performed", v)} disabled={isClosed} type="date" /></LabelInput>
        <LabelInput label={t("task.formEnd")}><Inp value={g("task_end_performed", fmtDate(task.task_end_performed ?? task.task_end))} onChange={(v) => s("task_end_performed", v)} disabled={isClosed} type="date" /></LabelInput>
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && <p className="text-xs text-green-600 dark:text-green-400">{t("task.savedSuccess")}</p>}
        {saveMut.isError && <p className="text-xs text-red-600 dark:text-red-400">{t("task.saveFailed")}</p>}
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
          {saveMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
          {saveMut.isPending ? t("task.savingChanges") : t("task.saveChanges")}
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
    queryFn: () => tasksApi.getPersonList(selectedCompanyId ? parseInt(selectedCompanyId) : undefined).then((r) => r.data),
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
                <option value="">All companies</option>
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
                              <span className="text-[10px] text-gray-700 dark:text-gray-300 leading-tight truncate flex-1">
                                {m.person_name ?? `#${m.taskraci_person_id}`}
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

  const allItems = isTask ? (taskHistQ.data ?? []) : (actHistQ.data ?? []);
  const isLoading = isTask ? taskHistQ.isLoading : actHistQ.isLoading;
  const visibleItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

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
                <Sel value={noteType} onChange={setNoteType} options={["INFO", "ISSUE", "BLOCKER"]} />
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
                  {h.taskrecord_status && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h.taskrecord_status}</span>}
                  {(h as Record<string, unknown>).taskrecord_next_followup && (
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

export default function TaskDetailPanel({ tasks, initialIndex = 0, onClose }: Props) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(Math.min(initialIndex, tasks.length - 1));
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
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

  const navigate = (dir: -1 | 1) => {
    const next = idx + dir;
    if (next >= 0 && next < tasks.length) { setIdx(next); setSelectedActivityId(null); }
  };

  const critColor = (lvl?: string) => lvl === "N1" ? "text-red-600 dark:text-red-400" : lvl === "N2" ? "text-orange-600 dark:text-orange-400" : "";

  return (
    <div className="space-y-3">
      {/* ── Navigation bar ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        {/* Prev / counter / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            disabled={idx === 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 select-none px-1">
            {t("task.taskOf", { current: idx + 1, total: tasks.length })}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={idx === tasks.length - 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* LEFT: task info or edit form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {/* Card header: title */}
          <div className="flex items-center mb-3 gap-2 min-w-0">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">
              #{task.task_id} — <span className="font-normal text-gray-500 dark:text-gray-400">{task.task_type_name ?? "—"}</span>
            </h3>
            {task.critical_level && task.critical_level !== "NONE" && (
              <span className={`text-xs font-bold shrink-0 ${critColor(task.critical_level)}`}>CRIT {task.critical_level}</span>
            )}
          </div>

          <TaskEditForm task={task} csms={csms} statusTypes={statusTypes} onSaved={() => { void qc.invalidateQueries({ queryKey: ["task-activities", taskId] }); }} />
        </div>

        {/* RIGHT: activities */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">
            {t("task.activitiesHeader", { count: activities.length })}
          </h3>
          {activitiesQuery.isLoading ? (
            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("task.noActivities")}</p>
          ) : (
            <div className="space-y-0 max-h-[480px] overflow-y-auto">
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
