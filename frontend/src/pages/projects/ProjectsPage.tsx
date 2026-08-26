import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, FolderOpen, X, Plus, Pencil, Save, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";

interface ProjectCustomer { project_customer_id: number; project_customer_name: string; }
interface Department { department_id: number; department_name: string; }
interface ResourceLevel { level_id: number; level_name: string; }
interface ProjectPerson { person_id: number; person_name: string; }
interface ProjectRow { project_id?: number | null; project_ov?: string | null; project_name?: string | null; project_status?: string | null; project_start_date?: string | null; project_end_date?: string | null; [k: string]: unknown; }
interface ProjectDetail { project_id?: number | null; project_ov?: string | null; project_name?: string | null; project_owner?: string | null; project_customer_id?: number | null; project_customer_name?: string | null; project_status?: string | null; project_methodology?: string | null; project_action?: string | null; project_internalization_date?: string | null; project_start_date?: string | null; project_end_date?: string | null; project_description?: string | null; project_scope?: string | null; project_objectives?: string | null; project_current_scenario?: string | null; project_key_feature_products?: string | null; project_justification?: string | null; project_remark?: string | null; project_sprint_timebox?: number | null; project_currency?: string | null; project_total_amount?: number | null; project_total_amount_brl?: number | null; project_planned_cost_subcontract_brl?: number | null; project_planned_cost_subcontract_po_brl?: number | null; project_planned_cost_pct_brl?: number | null; project_planned_cost_brl?: number | null; project_cost_final_value_brl?: number | null; [k: string]: unknown; }
interface TeamMember { projteam_id?: number | null; projteam_member_name?: string | null; projteam_level_name?: string | null; projteam_department_name?: string | null; projteam_technical_lead?: number | null; projteam_allocation_start?: string | null; projteam_allocation_end?: string | null; projteam_person_id?: number | null; projteam_department_id?: number | null; projteam_level_id?: number | null; projteam_working_time?: number | null; [k: string]: unknown; }
interface AccountTeamMember { accountteam_person_type?: string | null; [k: string]: unknown; }

const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inputCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const srchCls = "w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const fieldCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const textareaCls = `${fieldCls} resize-y min-h-[80px]`;
const PAGE_SIZES = [5, 10, 25, 50];
const STATUS_OPTIONS = ["Business Model", "In progress", "Not started", "Unidentified", "Closed", "Canceled"];
const CURRENCY_OPTIONS = ["BRL", "USD", "EUR"];
const METHODOLOGY_OPTIONS = ["", "Agile", "Scrum", "Kanban", "SAFe (Scaled Agile Framework)", "LeSS (Large-Scale Scrum)", "DAD (Disciplined Agile Delivery)", "XP (Extreme Programming)", "Crystal", "FDD (Feature Driven Development)", "ASD (Adaptive Software Development)", "Waterfall", "PMBOK (PMI)", "PRINCE2", "PRINCE2 Agile", "Critical Path Method (CPM)", "Critical Chain Project Management (CCPM)", "PERT", "Hybrid Agile-Waterfall", "ScrumBan", "Lean", "Lean Six Sigma", "Six Sigma", "DSDM", "Spiral", "RAD (Rapid Application Development)", "Prototyping", "Design Thinking", "DevOps"];
const Spin = () => <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const s = status.toLowerCase();
  let cls = "inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ";
  if (s.includes("progress") || s.includes("started")) cls += "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  else if (s.includes("business") || s.includes("model")) cls += "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
  else if (s.includes("unidentified")) cls += "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  else if (s.includes("closed") || s.includes("cancel")) cls += "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  else cls += "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
  return <span className={cls}>{status}</span>;
}

function CustomerSelect({ customers, value, onChange, loading }: { customers: ProjectCustomer[]; value: ProjectCustomer | null; onChange: (v: ProjectCustomer | null) => void; loading: boolean; }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => q.trim() ? customers.filter(c => c.project_customer_name.toLowerCase().includes(q.toLowerCase())) : customers, [customers, q]);
  return (
    <div className="relative flex-1 min-w-[280px] max-w-md">
      <label className={`${labelCls} mb-1 block`}>Customer</label>
      <button type="button" disabled={loading} onClick={() => { setOpen(o => !o); setQ(""); }} className={`${inputCls} text-left flex items-center justify-between gap-1 disabled:opacity-40`}>
        <span className={`truncate ${value ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>{loading ? t("common.loading") : value ? value.project_customer_name : t("projects.selectCustomer")}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && <span onClick={e => { e.stopPropagation(); onChange(null); }} className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]">✕</span>}
          <span className="text-gray-400 text-[10px]">▾</span>
        </div>
      </button>
      {open && !loading && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setQ(""); }} />
          <div className="absolute top-full mt-1 z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: 320 }}>
            <div className="p-2 border-b border-gray-100 dark:border-gray-700"><input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" onClick={e => e.stopPropagation()} className={srchCls} /></div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
              {filtered.map(c => (<button key={c.project_customer_id} type="button" onClick={() => { onChange(c); setOpen(false); setQ(""); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value?.project_customer_id === c.project_customer_id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{c.project_customer_name}</button>))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (<button type="button" onClick={onToggle} className="flex items-center justify-between w-full text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide py-2 border-b border-gray-200 dark:border-gray-700 mb-3">{label}{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>);
}

// ─── Project Form ─────────────────────────────────────────
function ProjectForm({ initial, customerId, customerName, departments, onSave, onCancel, saving }: { initial: Partial<ProjectDetail> | null; customerId: number; customerName: string; departments: Department[]; onSave: (data: Partial<ProjectDetail>) => void; onCancel: () => void; saving: boolean; }) {
  const { t } = useTranslation();
  const isNew = !initial?.project_id;
  const [form, setForm] = useState<Partial<ProjectDetail>>({ project_ov: "", project_name: "", project_owner: "PMO", project_status: "Not started", project_methodology: "", project_action: "", project_internalization_date: "", project_start_date: "", project_end_date: "", project_description: "", project_scope: "", project_objectives: "", project_current_scenario: "", project_key_feature_products: "", project_justification: "", project_remark: "", project_sprint_timebox: 0, project_currency: "BRL", project_total_amount: 0, project_total_amount_brl: 0, project_planned_cost_subcontract_brl: 0, project_planned_cost_subcontract_po_brl: 0, project_planned_cost_pct_brl: 0, project_planned_cost_brl: 0, project_cost_final_value_brl: 0, ...initial });
  const [openDates, setOpenDates] = useState(true);
  const [openDetails, setOpenDetails] = useState(false);
  const [openFinancial, setOpenFinancial] = useState(false);
  const f = (k: keyof ProjectDetail) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const fNum = (k: keyof ProjectDetail) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value === "" ? null : Number(e.target.value) }));
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{isNew ? t("projects.addProject") : t("projects.editProject")}{!isNew && <span className="ml-2 text-xs font-normal text-gray-400">ID: {initial?.project_id}</span>}</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-4 mb-3">
        <div><label className={labelCls}>{t("projects.formLabelOv")}</label><input value={form.project_ov ?? ""} onChange={f("project_ov")} className={fieldCls} placeholder={t("projects.formOvPlaceholder") ?? "Ex: 52757"} /></div>
        <div><label className={labelCls}>{t("projects.formLabelProjectName")}</label><input value={form.project_name ?? ""} onChange={f("project_name")} className={fieldCls} /></div>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-4 mb-3">
        <div><label className={labelCls}>{t("projects.formLabelOwner")}</label><select value={form.project_owner ?? "PMO"} onChange={f("project_owner")} className={fieldCls}><option value="PMO">PMO</option>{departments.filter(d => d.department_name !== "PMO").map(d => <option key={d.department_id} value={d.department_name}>{d.department_name}</option>)}</select></div>
        <div><label className={labelCls}>{t("projects.formLabelCustomer")}</label><input value={customerName} readOnly className={`${fieldCls} bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed`} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div><label className={labelCls}>{t("common.status")}</label><select value={form.project_status ?? "Not started"} onChange={f("project_status")} className={fieldCls}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className={labelCls}>{t("projects.formLabelMethodology")}</label><select value={form.project_methodology ?? ""} onChange={f("project_methodology")} className={fieldCls}>{METHODOLOGY_OPTIONS.map(m => <option key={m} value={m}>{m === "" ? t("projects.formSelectMethodology") : m}</option>)}</select></div>
        <div><label className={labelCls}>{t("projects.formLabelAction")}</label><input value={form.project_action ?? ""} onChange={f("project_action")} className={fieldCls} /></div>
      </div>
      <SectionHeader label={t("projects.formLabelDates")} open={openDates} onToggle={() => setOpenDates(o => !o)} />
      {openDates && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div><label className={labelCls}>{t("projects.formLabelInternalizationDate")}</label><input type="date" value={form.project_internalization_date ?? ""} onChange={f("project_internalization_date")} className={fieldCls} /></div>
          <div><label className={labelCls}>{t("projects.formLabelStartDate")}</label><input type="date" value={form.project_start_date ?? ""} onChange={f("project_start_date")} className={fieldCls} /></div>
          <div><label className={labelCls}>{t("projects.formLabelEndDate")}</label><input type="date" value={form.project_end_date ?? ""} onChange={f("project_end_date")} className={fieldCls} /></div>
        </div>
      )}
      <SectionHeader label={t("projects.formLabelDetails")} open={openDetails} onToggle={() => setOpenDetails(o => !o)} />
      {openDetails && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {([ ["project_description","Description"],["project_scope","Scope"],["project_objectives","Objectives"],["project_current_scenario","Current Scenario"],["project_key_feature_products","Key Feature / Products"],["project_justification","Justification"],["project_remark","Remarks"] ] as [keyof ProjectDetail, string][]).map(([k, lbl]) => (<div key={k}><label className={labelCls}>{lbl}</label><textarea value={(form[k] as string) ?? ""} onChange={f(k)} className={textareaCls} /></div>))}
        </div>
      )}
      <SectionHeader label={t("projects.formLabelFinancial")} open={openFinancial} onToggle={() => setOpenFinancial(o => !o)} />
      {openFinancial && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div><label className={labelCls}>Currency</label><select value={form.project_currency ?? "BRL"} onChange={f("project_currency")} className={fieldCls}>{CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className={labelCls}>Sprint Timebox</label><input type="number" min={0} value={form.project_sprint_timebox ?? 0} onChange={fNum("project_sprint_timebox")} className={fieldCls} /></div>
          {([ ["project_total_amount","Total Amount"],["project_total_amount_brl","Total Amt (BRL)"],["project_planned_cost_subcontract_brl","Subcontract (BRL)"],["project_planned_cost_subcontract_po_brl","Subcontract PO (BRL)"],["project_planned_cost_pct_brl","PCT (BRL)"],["project_planned_cost_brl","Planned Cost (BRL)"],["project_cost_final_value_brl","Final Cost (BRL)"] ] as [keyof ProjectDetail, string][]).map(([k, lbl]) => (<div key={k}><label className={labelCls}>{lbl}</label><input type="number" step="0.01" min={0} value={(form[k] as number) ?? 0} onChange={fNum(k)} className={fieldCls} /></div>))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button type="button" disabled={saving || !form.project_ov?.trim()} onClick={() => onSave({ ...form, project_customer_id: customerId, project_customer_name: customerName })} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">{saving ? <Spin /> : <Save size={13} />}{saving ? "Saving…" : t("common.save")}</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors">{t("common.cancel")}</button>
        {!form.project_ov?.trim() && <span className="text-[11px] text-red-500">OV is required</span>}
      </div>
    </div>
  );
}

// ─── Team Member Form ─────────────────────────────────────
function TeamMemberForm({ initial, projectId, departments, levels, persons, personSearch, onPersonSearch, onSave, onCancel, saving }: { initial: Partial<TeamMember> | null; projectId: number; departments: Department[]; levels: ResourceLevel[]; persons: ProjectPerson[]; personSearch: string; onPersonSearch: (s: string) => void; onSave: (data: Record<string, unknown>) => void; onCancel: () => void; saving: boolean; }) {
  const { t } = useTranslation();
  const isNew = !initial?.projteam_id;
  const [form, setForm] = useState({ projteam_person_id: initial?.projteam_person_id ?? null as number | null, projteam_department_id: initial?.projteam_department_id ?? null as number | null, projteam_level_id: initial?.projteam_level_id ?? null as number | null, projteam_technical_lead: initial?.projteam_technical_lead ?? 0, projteam_working_time: initial?.projteam_working_time ?? null as number | null, projteam_allocation_start: initial?.projteam_allocation_start ? String(initial.projteam_allocation_start).slice(0, 10) : "", projteam_allocation_end: initial?.projteam_allocation_end ? String(initial.projteam_allocation_end).slice(0, 10) : "" });
  return (
    <div className="mt-3 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">{isNew ? t("projects.addTeamMember") : t("projects.editTeamMember")}{!isNew && <span className="ml-2 font-normal text-gray-400">ID: {initial?.projteam_id}</span>}</p>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelCls}>Person {isNew && "*"}</label>
          {isNew ? (
            <>
              <input type="text" value={personSearch} onChange={e => onPersonSearch(e.target.value)} placeholder="Search person… (min 2 chars)" className={fieldCls} />
              {persons.length > 0 && (
                <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-32 overflow-y-auto">
                  {persons.map(p => (<button key={p.person_id} type="button" onClick={() => { setForm(f => ({ ...f, projteam_person_id: p.person_id })); onPersonSearch(p.person_name); }} className={["w-full text-left px-2 py-1 text-xs transition-colors", form.projteam_person_id === p.person_id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"].join(" ")}>{p.person_name}</button>))}
                </div>
              )}
            </>
          ) : (
            <input type="text" value={personSearch} readOnly className={fieldCls + " bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed font-medium"} />
          )}
        </div>
        <div><label className={labelCls}>Department</label><select value={form.projteam_department_id ?? ""} onChange={e => setForm(f => ({ ...f, projteam_department_id: e.target.value ? Number(e.target.value) : null }))} className={fieldCls}><option value="">—</option>{departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div><label className={labelCls}>Level</label><select value={form.projteam_level_id ?? ""} onChange={e => setForm(f => ({ ...f, projteam_level_id: e.target.value ? Number(e.target.value) : null }))} className={fieldCls}><option value="">—</option>{levels.map(l => <option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}</select></div>
        <div><label className={labelCls}>Working Time (%)</label><input type="number" min={0} max={100} value={form.projteam_working_time ?? ""} onChange={e => setForm(f => ({ ...f, projteam_working_time: e.target.value ? Number(e.target.value) : null }))} className={fieldCls} /></div>
        <div className="flex items-center gap-2 pt-4"><input type="checkbox" id="tech-lead" checked={form.projteam_technical_lead === 1} onChange={e => setForm(f => ({ ...f, projteam_technical_lead: e.target.checked ? 1 : 0 }))} className="rounded" /><label htmlFor="tech-lead" className={labelCls}>Technical Lead</label></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className={labelCls}>Allocation Start</label><input type="date" value={form.projteam_allocation_start} onChange={e => setForm(f => ({ ...f, projteam_allocation_start: e.target.value }))} className={fieldCls} /></div>
        <div><label className={labelCls}>Allocation End</label><input type="date" value={form.projteam_allocation_end} onChange={e => setForm(f => ({ ...f, projteam_allocation_end: e.target.value }))} className={fieldCls} /></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={saving || !form.projteam_person_id} onClick={() => onSave({ ...form })} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">{saving ? <Spin /> : <Save size={12} />}{saving ? "Saving…" : t("common.save")}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">{t("common.cancel")}</button>
        {!form.projteam_person_id && <span className="text-[11px] text-red-500">Person is required</span>}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────
function PaginationBar({ total, page, pageSize, onPage, onPageSize }: { total: number; page: number; pageSize: number; onPage: (p: number) => void; onPageSize: (ps: number) => void; }) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const ws = 5; let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + ws - 1);
  if (end - start < ws - 1) start = Math.max(1, end - ws + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const btnBase = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const btnA = btnBase + " bg-blue-600 text-white";
  const btnI = btnBase + " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t("common.showing")} <strong>{from}</strong>–<strong>{to}</strong> {t("common.of")} <strong>{total}</strong></span>
        <div className="flex items-center gap-1.5"><span className="text-xs text-gray-400">{t("common.perPage")}</span><select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }} className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">{PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps}</option>)}</select></div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnI}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={btnI}>‹</button>
        {start > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
        {pages.map(p => <button key={p} onClick={() => onPage(p)} className={p === page ? btnA : btnI}>{p}</button>)}
        {end < totalPages && <span className="text-xs text-gray-400 px-1">…</span>}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={btnI}>›</button>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} className={btnI}>»</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function ProjectsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canEdit = user?.roles?.includes("ADMIN") ?? false;

  const [selectedCustomer, setSelectedCustomer] = useState<ProjectCustomer | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [formMode, setFormMode] = useState<"none" | "edit" | "add">("none");
  const [formInitial, setFormInitial] = useState<Partial<ProjectDetail> | null>(null);
  const [teamFormMode, setTeamFormMode] = useState<"none" | "edit" | "add">("none");
  const [teamFormInitial, setTeamFormInitial] = useState<Partial<TeamMember> | null>(null);
  const [personSearch, setPersonSearch] = useState("");

  const rawCompaniesQ = useQuery({ queryKey: ["project-all-companies"], queryFn: () => apiClient.get<{ company_id: number; company_name: string }[]>("/portfolio/account-team/companies").then(r => r.data), staleTime: 10 * 60 * 1000 });
  const customersQ = { ...rawCompaniesQ, data: rawCompaniesQ.data?.map(c => ({ project_customer_id: c.company_id, project_customer_name: c.company_name })) };
  const departmentsQ = useQuery({ queryKey: ["project-departments"], queryFn: () => apiClient.get<Department[]>("/projects/departments").then(r => r.data), staleTime: 30 * 60 * 1000, enabled: canEdit });
  const levelsQ = useQuery({ queryKey: ["project-levels"], queryFn: () => apiClient.get<ResourceLevel[]>("/projects/levels").then(r => r.data), staleTime: 60 * 60 * 1000, enabled: canEdit });
  const personsQ = useQuery({ queryKey: ["project-persons", personSearch], queryFn: () => apiClient.get<ProjectPerson[]>("/projects/persons", { params: { search: personSearch } }).then(r => r.data), staleTime: 2 * 60 * 1000, enabled: canEdit && personSearch.length >= 2 });
  const projectsQ = useQuery({ queryKey: ["projects-by-customer", selectedCustomer?.project_customer_id], queryFn: () => apiClient.get<ProjectRow[]>("/projects", { params: { customer_id: selectedCustomer!.project_customer_id } }).then(r => r.data), enabled: !!selectedCustomer, staleTime: 5 * 60 * 1000 });
  const accountTeamQ = useQuery({ queryKey: ["account-team-for-projects", selectedCustomer?.project_customer_id], queryFn: () => apiClient.get<AccountTeamMember[]>("/projects/account-team", { params: { customer_id: selectedCustomer!.project_customer_id } }).then(r => r.data), enabled: !!selectedCustomer, staleTime: 5 * 60 * 1000 });
  const teamQ = useQuery({ queryKey: ["project-team", selectedProjectId], queryFn: () => apiClient.get<TeamMember[]>("/projects/" + selectedProjectId + "/team").then(r => r.data), enabled: selectedProjectId !== null, staleTime: 5 * 60 * 1000 });

  const saveMut = useMutation({
    mutationFn: (payload: { id: number | null; data: Partial<ProjectDetail> }) => payload.id ? apiClient.put("/projects/" + payload.id, payload.data).then(r => r.data) : apiClient.post("/projects", payload.data).then(r => r.data),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["projects-by-customer", selectedCustomer?.project_customer_id] }); setFormMode("none"); setFormInitial(null); },
  });

  const saveTeamMut = useMutation({
    mutationFn: (payload: { projteamId: number | null; projectId: number; data: Record<string, unknown> }) => payload.projteamId ? apiClient.put("/projects/team-member/" + payload.projteamId, payload.data).then(r => r.data) : apiClient.post("/projects/" + payload.projectId + "/team-member", payload.data).then(r => r.data),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["project-team", selectedProjectId] }); setTeamFormMode("none"); setTeamFormInitial(null); setPersonSearch(""); },
  });

  const deleteTeamMut = useMutation({
    mutationFn: (projteamId: number) => apiClient.delete("/projects/team-member/" + projteamId).then(r => r.data),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["project-team", selectedProjectId] }); },
  });

  const allProjects = projectsQ.data ?? [];
  const accountTeam = accountTeamQ.data ?? [];
  const projectTeam = teamQ.data ?? [];
  const departments = useMemo(() => { const api = departmentsQ.data ?? []; if (api.length > 0) return api; const names = new Set<string>(["PMO"]); for (const p of allProjects) { const ow = (p as Record<string, unknown>).project_owner; if (ow && typeof ow === "string" && ow.trim()) names.add(ow.trim()); } return [...names].sort().map((n, i) => ({ department_id: i, department_name: n })); }, [departmentsQ.data, allProjects]);
  const levels = levelsQ.data ?? [];
  const persons = personsQ.data ?? [];
  const statusOptions = useMemo(() => [...new Set(allProjects.map(p => p.project_status).filter(Boolean) as string[])].sort(), [allProjects]);
  const filteredProjects = useMemo(() => !selectedStatus ? allProjects : allProjects.filter(p => p.project_status === selectedStatus), [allProjects, selectedStatus]);
  useMemo(() => { setPage(1); }, [filteredProjects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const paginated = useMemo(() => filteredProjects.slice((page - 1) * pageSize, page * pageSize), [filteredProjects, page, pageSize]);
  const hasFilters = selectedCustomer !== null || selectedStatus !== "";

  function handleCustomerChange(c: ProjectCustomer | null) { setSelectedCustomer(c); setSelectedStatus(""); setSelectedProjectId(null); setPage(1); setFormMode("none"); setFormInitial(null); setTeamFormMode("none"); setTeamFormInitial(null); setPersonSearch(""); }
  function clearFilters() { handleCustomerChange(null); }

  async function handleEditClick(pid: number) {
    setSelectedProjectId(null); setFormMode("none");
    const fromCache = allProjects.find(p => Number(p.project_id) === pid);
    if (fromCache && fromCache.project_ov !== undefined) { setFormInitial(fromCache as unknown as Partial<ProjectDetail>); setFormMode("edit"); return; }
    try { const res = await apiClient.get<ProjectDetail>("/projects/" + pid + "/detail"); if (res.data && res.data.project_id) { setFormInitial(res.data); setFormMode("edit"); } else { setFormInitial({ project_id: pid }); setFormMode("edit"); } } catch { setFormInitial({ project_id: pid }); setFormMode("edit"); }
  }

  function handleAddClick() { setFormInitial(null); setFormMode("add"); }
  function handleAddTeamMember() { setTeamFormMode("add"); setTeamFormInitial(null); setPersonSearch(""); }
  function handleEditTeamMember(m: TeamMember) { setTeamFormMode("edit"); setTeamFormInitial(m); setPersonSearch(m.projteam_member_name ? String(m.projteam_member_name) : ""); }

  function getPersonName(m: AccountTeamMember): string { for (const k of Object.keys(m)) { if (k.includes("person_name") || k.includes("member_name")) { const v = m[k]; if (v && typeof v === "string") return v; } } return "—"; }
  function getPersonType(m: AccountTeamMember): string { const v = m.accountteam_person_type ?? (m as Record<string, unknown>).accountteam_user_type; return v ? String(v) : "—"; }
  function fmtDate(d: string | null | undefined) { return d ? String(d).slice(0, 10) : "—"; }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("projects.title")}</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("projects.subtitle")}</p></div>

      <div className={card}>
        <div className="flex flex-wrap gap-6 items-end">
          <CustomerSelect customers={customersQ.data ?? []} value={selectedCustomer} onChange={handleCustomerChange} loading={customersQ.isLoading} />
          {hasFilters && (<div className="flex flex-col justify-end"><button type="button" onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"><X size={12} /> {t("common.clearFilters")}</button></div>)}
        </div>
        {customersQ.isError && <p className="text-xs text-red-500 mt-2">{t("errors.generic")}</p>}
      </div>

      {selectedCustomer && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-3"><Users size={14} className="text-blue-500" /><p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t("projects.accountTeamTitle")} — {selectedCustomer.project_customer_name}</p>{accountTeamQ.isLoading && <Spin />}</div>
          {!accountTeamQ.isLoading && accountTeam.length === 0 && <p className="text-xs text-gray-400">{t("projects.noAccountTeam")}</p>}
          {accountTeam.length > 0 && (<div className="flex flex-wrap gap-2">{accountTeam.map((m, i) => (<div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"><span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">{getPersonType(m)}</span><span className="text-xs text-gray-700 dark:text-gray-300">{getPersonName(m)}</span></div>))}</div>)}
        </div>
      )}

      {!selectedCustomer && (<div className={card}><div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 dark:text-gray-500"><FolderOpen size={36} className="opacity-40" /><p className="text-sm">{t("projects.selectCustomerHint")}</p></div></div>)}
      {selectedCustomer && projectsQ.isLoading && (<div className={card + " flex items-center justify-center gap-3 py-10"}><Spin /><span className="text-sm text-gray-500">{t("common.loading")}</span></div>)}

      {selectedCustomer && !projectsQ.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><FolderOpen size={14} className="text-blue-500" /><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("projects.projectDetail")} {filteredProjects.length > 0 && <span className="font-normal ml-1">({filteredProjects.length})</span>}</p></div>
              <div className="flex items-center gap-2">
                <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setSelectedProjectId(null); }} disabled={!selectedCustomer || statusOptions.length === 0} className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed min-w-[140px]"><option value="">{t("projects.allStatuses")}</option>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
                {canEdit && selectedCustomer && (<button onClick={handleAddClick} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"><Plus size={12} /> {t("projects.addProject")}</button>)}
              </div>
            </div>
            {projectsQ.isError && <p className="text-xs text-red-500 py-4">{t("errors.generic")}</p>}
            {!projectsQ.isError && filteredProjects.length === 0 && (<p className="text-xs text-gray-400 text-center py-8">{selectedStatus ? t("projects.noProjectsWithStatus", { status: selectedStatus }) : t("projects.noProjects")}</p>)}
            {filteredProjects.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{canEdit && <th className="px-2 py-2 w-8"></th>}<th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colOv")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colProjectName")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("common.status")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colStart")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colEnd")}</th></tr></thead>
                    <tbody>
                      {paginated.map((proj, i) => { const pid = Number(proj.project_id ?? 0); const isSel = selectedProjectId === pid; return (<tr key={i} onClick={() => pid > 0 ? setSelectedProjectId(p => p === pid ? null : pid) : undefined} className={"border-b border-gray-100 dark:border-gray-800 transition-colors " + (pid > 0 ? "cursor-pointer " : "") + (isSel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50")}>{canEdit && (<td className="px-2 py-1.5" onClick={e => e.stopPropagation()}><button onClick={() => handleEditClick(pid)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit"><Pencil size={11} /></button></td>)}<td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-[11px]">{proj.project_ov ?? "—"}</td><td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[200px]"><span className="block truncate" title={proj.project_name ?? ""}>{proj.project_name ?? "—"}</span></td><td className="px-3 py-1.5 whitespace-nowrap"><StatusBadge status={proj.project_status} /></td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(proj.project_start_date)}</td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(proj.project_end_date)}</td></tr>); })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar total={filteredProjects.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
                {selectedProjectId === null && <p className="text-[10px] text-gray-400 mt-2 text-center">{t("projects.clickRowHint")}</p>}
              </>
            )}
          </div>

          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Users size={14} className="text-green-500" /><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("projects.projectTeam")}</p>{teamQ.isLoading && <Spin />}</div>
              {canEdit && selectedProjectId !== null && teamFormMode === "none" && (<button onClick={handleAddTeamMember} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"><Plus size={11} /> {t("projects.addTeamMember")}</button>)}
            </div>
            {selectedProjectId === null && (<div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500"><Users size={28} className="opacity-30" /><p className="text-xs text-center">{t("projects.selectProjectHint")}</p></div>)}
            {selectedProjectId !== null && teamQ.isLoading && <div className="flex justify-center py-10"><Spin /></div>}
            {selectedProjectId !== null && teamQ.isError && <p className="text-xs text-red-500 text-center py-6">{t("errors.generic")}</p>}
            {selectedProjectId !== null && !teamQ.isLoading && !teamQ.isError && projectTeam.length === 0 && teamFormMode === "none" && <p className="text-xs text-gray-400 text-center py-8">{t("projects.noTeamMembers")}</p>}
            {selectedProjectId !== null && !teamQ.isLoading && projectTeam.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{canEdit && <th className="px-2 py-2 w-16"></th>}<th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colName")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colType")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colDept")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colStart")}</th><th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colEnd")}</th></tr></thead>
                  <tbody>
                    {projectTeam.map((m, i) => (<tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">{canEdit && (<td className="px-2 py-1.5" onClick={e => e.stopPropagation()}><div className="flex items-center gap-1"><button onClick={() => handleEditTeamMember(m)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Edit"><Pencil size={10} /></button><button onClick={() => { if (m.projteam_id && confirm("Remove this team member?")) deleteTeamMut.mutate(Number(m.projteam_id)); }} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors" title="Remove"><Trash2 size={10} /></button></div></td>)}<td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{m.projteam_member_name ?? "—"}{m.projteam_technical_lead === 1 && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-bold uppercase">Lead</span>}</td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.projteam_level_name ?? "—"}</td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.projteam_department_name ?? "—"}</td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(m.projteam_allocation_start)}</td><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(m.projteam_allocation_end)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}
            {canEdit && selectedProjectId !== null && teamFormMode !== "none" && (
              <TeamMemberForm
                initial={teamFormMode === "edit" ? teamFormInitial : null}
                projectId={selectedProjectId}
                departments={departments}
                levels={levels}
                persons={persons}
                personSearch={personSearch}
                onPersonSearch={setPersonSearch}
                saving={saveTeamMut.isPending}
                onCancel={() => { setTeamFormMode("none"); setTeamFormInitial(null); setPersonSearch(""); }}
                onSave={data => saveTeamMut.mutate({ projteamId: teamFormMode === "edit" ? (teamFormInitial?.projteam_id as number ?? null) : null, projectId: selectedProjectId, data })}
              />
            )}
          </div>
        </div>
      )}

      {canEdit && formMode !== "none" && selectedCustomer && (
        <ProjectForm
          initial={formMode === "edit" ? formInitial : null}
          customerId={selectedCustomer.project_customer_id}
          customerName={selectedCustomer.project_customer_name}
          departments={departments}
          saving={saveMut.isPending}
          onCancel={() => { setFormMode("none"); setFormInitial(null); }}
          onSave={data => saveMut.mutate({ id: formMode === "edit" ? (formInitial?.project_id as number ?? null) : null, data })}
        />
      )}
      {saveMut.isError && (<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"><p className="text-xs text-red-600 dark:text-red-400">{t("errors.generic")}: {String((saveMut.error as Error)?.message ?? "")}</p></div>)}
    </div>
  );
}
