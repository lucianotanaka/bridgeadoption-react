import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Save, History, X, Edit2 } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, ActivityItem, HistoryItem, CSMItem, StatusType } from "@/api/tasks";

interface Props {
  tasks: TaskItem[];
  initialIndex?: number;
  onClose?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSED_STATUS = new Set([4, 5, 6, 10]);
const PROGRESS_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];
const PROGRESS_MAP: Record<string, number> = { "0%": 0, "25%": 0.25, "50%": 0.5, "75%": 0.75, "100%": 1 };
const REVERSE_PROGRESS: Record<string, string> = { "0": "0%", "0.25": "25%", "0.5": "50%", "0.75": "75%", "1": "100%" };
const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];
const CURRENCY_OPTIONS = ["BRL", "USD", "EUR"];
const DEADLINE_ICON: Record<string, string> = { delayed: "🚨", today: "⚠️", this_week: "⏳", next_week: "📅", future: "🕒" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Small UI atoms ───────────────────────────────────────────────────────────

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

// ─── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ items }: { items: HistoryItem[] }) {
  const { t } = useTranslation();
  if (!items.length) return <p className="text-xs text-gray-400 py-3">{t("task.noHistory")}</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {items.map((h) => (
        <div key={h.taskrecord_id} className="text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-gray-400 dark:text-gray-500">{h.taskrecord_date ? String(h.taskrecord_date).slice(0, 10) : "—"}</span>
            {h.taskrecord_type && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.taskrecord_type === "BLOCKER" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : h.taskrecord_type === "ISSUE" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{h.taskrecord_type}</span>}
            {h.taskrecord_status && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h.taskrecord_status}</span>}
            <span className="ml-auto text-gray-400 dark:text-gray-500">{String(h.taskrecord_updated_by ?? "")}</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{String(h.taskrecord_remark ?? "")}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Row (expandable edit form) ─────────────────────────────────────

function ActivityRow({ act, statusTypes, taskId, onUpdated }: { act: ActivityItem; statusTypes: StatusType[]; taskId: number; onUpdated: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"objective" | "scope" | "results" | "track">("objective");
  const [showHistory, setShowHistory] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [nextFU, setNextFU] = useState("");
  const [saved, setSaved] = useState(false);

  const pct = Math.min(100, Math.max(0, ((act.activity_completed ?? 0) <= 1 ? (act.activity_completed ?? 0) * 100 : act.activity_completed ?? 0)));
  const bucket = deadlineBucket(fmtDate(act.activity_end_performed ?? act.activity_end) || null);
  const statusId = act.activity_status ?? 0;
  const isClosed = CLOSED_STATUS.has(statusId);

  const g = (k: string, fallback: string = ""): string => k in edits ? edits[k] : String((act as Record<string, unknown>)[k] ?? fallback);
  const s = (k: string, v: string) => { setEdits((p) => ({ ...p, [k]: v })); setSaved(false); };

  const histQ = useQuery({ queryKey: ["act-hist", act.activity_id], queryFn: () => tasksApi.getHistory(taskId, act.activity_id).then((r) => r.data), enabled: showHistory, staleTime: 60000 });

  const saveMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const data: Record<string, unknown> = {};
      const changes: string[] = [];

      // seq
      const seq = parseInt(edits.activity_seq ?? "");
      if (!isNaN(seq) && seq !== act.activity_seq) data.activity_seq = seq;

      // status
      if ("activity_status_name" in edits && edits.activity_status_name !== act.activity_status_name) {
        const found = statusTypes.find((s) => s.statustype_name === edits.activity_status_name);
        if (found) { data.activity_status = found.statustype_id; changes.push(`Status → ${edits.activity_status_name}`); }
      }

      // completed
      if ("activity_completed_pct" in edits) {
        const pctNum = PROGRESS_MAP[edits.activity_completed_pct] ?? 0;
        if (pctNum !== act.activity_completed) data.activity_completed = pctNum;
      }

      // dates
      const sp = edits.activity_start_performed;
      if (sp !== undefined && sp !== fmtDate(act.activity_start_performed)) { data.activity_start_performed = sp || null; changes.push(`Start → ${sp}`); }
      const ep = edits.activity_end_performed;
      if (ep !== undefined && ep !== fmtDate(act.activity_end_performed)) { data.activity_end_performed = ep || null; changes.push(`End → ${ep}`); }

      // effort
      if ("activity_effort_performed" in edits) {
        const ef = parseFloat(edits.activity_effort_performed);
        if (!isNaN(ef) && ef !== act.activity_effort_performed) { data.activity_effort_performed = ef; changes.push(`Effort → ${ef}h`); }
      }

      // text fields
      ["activity_objective", "activity_scope", "activity_expected_results", "activity_track", "activity_sub_track", "activity_deal_id", "activity_ws", "activity_value", "activity_currency"].forEach((k) => {
        if (k in edits && edits[k] !== String((act as Record<string, unknown>)[k] ?? "")) data[k] = edits[k];
      });

      const remark = changes.length > 0 ? (note.trim() ? `${changes.join("; ")}; ${note.trim()}` : changes.join("; ")) : note.trim();
      const history = remark
        ? { taskrecord_task_id: taskId, taskrecord_activity_id: act.activity_id, taskrecord_remark: remark, taskrecord_next_followup: nextFU || undefined }
        : nextFU ? { taskrecord_task_id: taskId, taskrecord_activity_id: act.activity_id, taskrecord_remark: `Follow-up: ${nextFU}`, taskrecord_next_followup: nextFU } : undefined;

      return Promise.all([
        Object.keys(data).length > 0 ? tasksApi.updateActivity(act.activity_id, data).then((r) => r.data) : Promise.resolve(null),
        history ? tasksApi.addHistory(taskId, history).then((r) => r.data) : Promise.resolve(null),
      ]);
    },
    onSuccess: () => {
      setEdits({}); setNote(""); setNextFU(""); setSaved(true);
      void qc.invalidateQueries({ queryKey: ["task-activities", taskId] });
      void qc.invalidateQueries({ queryKey: ["act-hist", act.activity_id] });
      onUpdated();
    },
  });

  const statusOptions = statusTypes.filter((s) => s.statustype_id !== 5).map((s) => s.statustype_name);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-2">
      {/* Collapsed header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
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

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30 dark:bg-gray-800/20 space-y-3">
          {/* Row 1: dates, effort, progress, status */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <LabelInput label={t("task.formSeq")}>
              <Inp value={g("activity_seq", String(act.activity_seq ?? "1"))} onChange={(v) => s("activity_seq", v)} disabled={isClosed} type="number" />
            </LabelInput>
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
            <LabelInput label={t("task.formCompleted")}>
              <Sel value={g("activity_completed_pct", pctLabel(act.activity_completed))} onChange={(v) => s("activity_completed_pct", v)} options={PROGRESS_OPTIONS} disabled={isClosed} />
            </LabelInput>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <LabelInput label={t("task.formStatus")}>
              <Sel value={g("activity_status_name", act.activity_status_name ?? "")} onChange={(v) => s("activity_status_name", v)} options={statusOptions} disabled={isClosed} />
            </LabelInput>
            <LabelInput label={t("task.formDealId")}>
              <Inp value={g("activity_deal_id", String(act.activity_deal_id ?? ""))} onChange={(v) => s("activity_deal_id", v)} disabled={isClosed} />
            </LabelInput>
            <LabelInput label="WS">
              <Inp value={g("activity_ws", String(act.activity_ws ?? ""))} onChange={(v) => s("activity_ws", v)} disabled={isClosed} />
            </LabelInput>
          </div>

          {/* Value + currency */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LabelInput label={t("task.formValueDollar")}>
              <Inp value={g("activity_value", String(act.activity_value ?? "0"))} onChange={(v) => s("activity_value", v)} disabled={isClosed} type="number" />
            </LabelInput>
            <LabelInput label={t("task.formCurrency")}>
              <Sel value={g("activity_currency", String(act.activity_currency ?? "USD"))} onChange={(v) => s("activity_currency", v)} options={CURRENCY_OPTIONS} disabled={isClosed} />
            </LabelInput>
          </div>

          {/* Tabs: Objective / Scope / Expected Results / Track */}
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

          {/* Notes + next follow-up + save */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <LabelInput label={t("task.formNotesUpdate")}>
                <Textarea value={note} onChange={setNote} disabled={isClosed} placeholder={t("task.noteUpdatePlaceholder")} rows={3} />
              </LabelInput>
            </div>
            <div className="space-y-2">
              <LabelInput label={t("task.formNextFollowUp")}>
                <Inp value={nextFU} onChange={setNextFU} disabled={isClosed} type="date" />
              </LabelInput>
              <div className="flex gap-2">
                <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg border transition-colors ${showHistory ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                  <History size={11} /> {t("task.historyBtn")}
                </button>
                <button onClick={() => !isClosed && saveMut.mutate()} disabled={isClosed || saveMut.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white transition-colors">
                  {saveMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={11} />}
                  {saveMut.isPending ? t("task.savingIndicator") : t("task.saveBtn")}
                </button>
              </div>
              {saved && <p className="text-[10px] text-green-600 dark:text-green-400">{t("task.savedSuccess")}</p>}
              {saveMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">{t("task.saveFailed")}</p>}
            </div>
          </div>

          {/* Activity history */}
          {showHistory && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">{t("task.activityHistory")}</p>
              {histQ.isLoading ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <HistoryPanel items={histQ.data ?? []} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Task Edit Form ────────────────────────────────────────────────────────────

function TaskEditForm({ task, csms, statusTypes, onSaved }: { task: TaskItem; csms: CSMItem[]; statusTypes: StatusType[]; onSaved: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isClosed = CLOSED_STATUS.has(task.task_status_id ?? 0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("INFO");
  const [nextFU, setNextFU] = useState("");
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

      // Owner
      if ("task_owner_name" in edits && edits.task_owner_name !== (task.task_owner_name ?? "")) {
        const csm = csms.find((c) => c.csm_name === edits.task_owner_name);
        data.task_owner_id = csm ? csm.csm_id : 0;
        changes.push(`Owner → ${edits.task_owner_name || "UNASSIGNED"}`);
      }

      // Temp owner
      if ("task_temp_owner_name" in edits && edits.task_temp_owner_name !== (task.task_temp_owner_name ?? "")) {
        const csm = csms.find((c) => c.csm_name === edits.task_temp_owner_name);
        data.task_temp_owner_id = csm ? csm.csm_id : 0;
        changes.push(`Temp Owner → ${edits.task_temp_owner_name || "none"}`);
      }

      // Status
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

      const remark = changes.length > 0 ? (note.trim() ? `${changes.join("; ")}; ${note.trim()}` : changes.join("; ")) : note.trim();
      const history = remark ? { taskrecord_remark: remark, taskrecord_type: noteType, taskrecord_next_followup: nextFU || undefined } : (nextFU ? { taskrecord_remark: `Next follow-up: ${nextFU}`, taskrecord_next_followup: nextFU } : undefined);

      return tasksApi.updateTask(task.task_id, data, history).then((r) => r.data);
    },
    onSuccess: () => {
      setEdits({}); setNote(""); setNextFU(""); setSaved(true);
      void qc.invalidateQueries({ queryKey: ["task-activities", task.task_id] });
      void qc.invalidateQueries({ queryKey: ["task-history", task.task_id] });
      onSaved();
    },
  });

  return (
    <div className="space-y-3">
      {/* Row 1: ID, Type, Owner, Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LabelInput label={t("task.formTaskId")}><Inp value={String(task.task_id)} onChange={() => void 0} disabled /></LabelInput>
        <LabelInput label={t("task.formTaskType")}><Inp value={String(task.task_type_name ?? "")} onChange={() => void 0} disabled /></LabelInput>
        <LabelInput label={t("task.formOwner")}>
          <Sel value={g("task_owner_name", task.task_owner_name ?? "")} onChange={(v) => s("task_owner_name", v)} options={csmOptions} disabled={isClosed} />
        </LabelInput>
        <LabelInput label={t("task.formStatus")}>
          <Sel value={g("task_status_name", task.task_status_name ?? "")} onChange={(v) => s("task_status_name", v)} options={statusOptions} disabled={isClosed} />
        </LabelInput>
      </div>

      {/* Row 2: Client, Temp Owner, Priority */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <LabelInput label={t("task.formClient")}><Inp value={String(task.task_customer_name ?? "")} onChange={() => void 0} disabled /></LabelInput>
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
        <LabelInput label={t("task.formStart")}>
          <Inp value={g("task_start_performed", fmtDate(task.task_start_performed ?? task.task_start))} onChange={(v) => s("task_start_performed", v)} disabled={isClosed} type="date" />
        </LabelInput>
        <LabelInput label={t("task.formEnd")}>
          <Inp value={g("task_end_performed", fmtDate(task.task_end_performed ?? task.task_end))} onChange={(v) => s("task_end_performed", v)} disabled={isClosed} type="date" />
        </LabelInput>
      </div>

      {/* Notes + type + next follow-up + save */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <LabelInput label={t("task.formNotes")}>
            <Textarea value={note} onChange={setNote} placeholder={t("task.noteTaskPlaceholder")} rows={3} />
          </LabelInput>
        </div>
        <div className="space-y-2">
          <LabelInput label={t("task.formNoteType")}>
            <Sel value={noteType} onChange={setNoteType} options={["INFO", "ISSUE", "BLOCKER"]} />
          </LabelInput>
          <LabelInput label={t("task.formNextFollowUp")}>
            <Inp value={nextFU} onChange={setNextFU} disabled={isClosed} type="date" />
          </LabelInput>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
            {saveMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
            {saveMut.isPending ? t("task.savingChanges") : t("task.saveChanges")}
          </button>
          {saved && <p className="text-xs text-green-600 dark:text-green-400 text-center">{t("task.savedSuccess")}</p>}
          {saveMut.isError && <p className="text-xs text-red-600 dark:text-red-400 text-center">{t("task.saveFailed")}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main TaskDetailPanel ─────────────────────────────────────────────────────

export default function TaskDetailPanel({ tasks, initialIndex = 0, onClose }: Props) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(Math.min(initialIndex, tasks.length - 1));
  const [showHistory, setShowHistory] = useState(false);
  const [activeSection, setActiveSection] = useState<"info" | "edit">("info");
  const qc = useQueryClient();

  const task = tasks[idx];
  const taskId = task?.task_id;

  const activitiesQuery = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: () => tasksApi.getActivities(taskId!).then((r) => r.data),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ["task-history", taskId],
    queryFn: () => tasksApi.getHistory(taskId!).then((r) => r.data),
    enabled: !!taskId && showHistory,
    staleTime: 60 * 1000,
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
  const isClosed = CLOSED_STATUS.has(task.task_status_id ?? 0);

  const navigate = (dir: -1 | 1) => {
    const next = idx + dir;
    if (next >= 0 && next < tasks.length) { setIdx(next); setShowHistory(false); setActiveSection("info"); }
  };

  const critColor = (lvl?: string) => lvl === "N1" ? "text-red-600 dark:text-red-400" : lvl === "N2" ? "text-orange-600 dark:text-orange-400" : "";

  return (
    <div className="space-y-3">
      {/* Navigation header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t("task.taskOf", { current: idx + 1, total: tasks.length })}</span>
          <button onClick={() => navigate(1)} disabled={idx === tasks.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(["info", "edit"] as const).map((sec) => (
              <button key={sec} onClick={() => setActiveSection(sec)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeSection === sec ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                {sec === "info" ? t("task.viewMode") : t("task.editMode")}
              </button>
            ))}
          </div>
          <button onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showHistory ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            <History size={13} /> {t("task.historyBtn")}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* LEFT: task info or edit form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              #{task.task_id} — <span className="font-normal text-gray-500 dark:text-gray-400">{task.task_type_name ?? "—"}</span>
            </h3>
            {task.critical_level && task.critical_level !== "NONE" && (
              <span className={`text-xs font-bold ${critColor(task.critical_level)}`}>CRIT {task.critical_level}</span>
            )}
          </div>

          {activeSection === "info" ? (
            <div className="space-y-0">
              {[
                [t("task.fieldClient"), task.task_customer_name],
                [t("task.fieldOwner"), task.task_owner_name + (task.task_temp_owner_name ? ` (temp: ${task.task_temp_owner_name})` : "")],
                [t("task.fieldStatus"), task.task_status_reclassified ?? task.task_status_name],
                [t("task.fieldPriority"), task.task_priority],
                [t("task.fieldReference"), task.task_reference],
                [t("task.fieldWsSub"), task.task_ws],
                [t("task.fieldDealId"), task.task_deal_id],
                [t("task.fieldTrack"), task.task_track + (task.task_subtrack ? ` / ${task.task_subtrack}` : "")],
                [t("task.fieldValue"), task.task_value != null ? String(task.task_value) : null],
                [t("task.fieldStart"), fmtDate(task.task_start_performed ?? task.task_start) || "—"],
                [t("task.fieldEnd"), fmtDate(task.task_end_performed ?? task.task_end) || "—"],
                [t("task.fieldProject"), task.task_project_name],
                [t("task.fieldEaTelemetry"), task.task_ea_flag != null ? `${task.task_ea_flag ? "✅" : "❌"} EA • ${task.task_telemetry_flag ? "✅" : "❌"} Telemetry` : null],
                [t("task.fieldSpiStage"), task.spi_lifecycle_stage],
              ].map(([label, value]) => value ? (
                <div key={String(label)} className="flex items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0">{label}</span>
                  <span className="text-xs text-gray-800 dark:text-gray-200 flex-1">{value}</span>
                </div>
              ) : null)}
            </div>
          ) : (
            <TaskEditForm task={task} csms={csms} statusTypes={statusTypes} onSaved={() => { setActiveSection("info"); void qc.invalidateQueries({ queryKey: ["task-activities", taskId] }); }} />
          )}
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
                <ActivityRow key={act.activity_id} act={act} statusTypes={statusTypes} taskId={taskId!} onUpdated={() => void activitiesQuery.refetch()} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("task.taskHistory")}</h3>
          {historyQuery.isLoading ? (
            <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : <HistoryPanel items={historyQuery.data ?? []} />}
        </div>
      )}
    </div>
  );
}
