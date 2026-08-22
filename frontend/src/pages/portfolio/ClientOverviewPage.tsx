import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Building2, Users, AlertTriangle,
  Activity, Zap, BarChart3, Briefcase, Search,
  X, ChevronRight, Package, Edit2, Plus,
} from "lucide-react";
import apiClient from "@/api/client";
import { tasksApi, type TaskItem } from "@/api/tasks";
import { useAuthStore } from "@/store/authStore";
import CiscoEAClientReport from "@/pages/portfolio/CiscoEAClientReport";
import CiscoSAClientReport from "@/pages/portfolio/CiscoSAClientReport";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "lci" | "overdue" | "initiatives" | "projects" | "team" | "ea" | "sa" | null;

interface Company { customer_id?: number; company_id?: number; customer_name?: string; company_name?: string; }
interface TeamRow { accountteam_company_name?: string; accountteam_user_name?: string; accountteam_person_type?: string; accountteam_allocated?: number | null; }
interface TeamRowFull extends TeamRow { accountteam_id: number; accountteam_company_id?: number; accountteam_person_id?: number | null; }
interface NttUser { person_id: number; person_name: string; }
interface InitRow { task_customer_name?: string | null; task_type_name?: string | null; task_owner_name?: string | null; task_status_name?: string | null; task_status_id?: number | string | null; task_start?: string | null; task_end?: string | null; task_id?: number | string | null; }
interface ProjectRow { project_id?: number | null; project_name?: string | null; project_status?: string | null; project_start_date?: string | null; project_end_date?: string | null; project_ov?: string | null; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLOSED_IDS = new Set([4, 5, 6, 10]);
const TODAY = new Date().toISOString().slice(0, 10);
const fmt = (d: string | null | undefined) => d ? String(d).slice(0, 10) : "—";

function badge(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "overdue" || v === "delayed") return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
  if (v.includes("progress") || v.includes("started")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  if (v.includes("done") || v.includes("complet")) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  if (v.includes("hold") || v.includes("wait")) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
  if (v.includes("cancel") || v.includes("expir") || v.includes("declin")) return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
}

function Spinner() { return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />; }
function Empty({ msg = "No data" }: { msg?: string }) { return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{msg}</p>; }

// ─── Clickable KPI Card ────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, active, alert = false, viewingLabel = "Viewing", onClick }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: string; active?: boolean; alert?: boolean; viewingLabel?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={"w-full text-left rounded-xl border p-4 flex flex-col gap-2 min-w-0 transition-all " + (active
      ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md"
      : alert
        ? "border-red-300 dark:border-red-700 bg-white dark:bg-gray-900 hover:border-red-400"
        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm"
    )}>
      <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + color}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {active && <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium"><ChevronRight size={10} /> {viewingLabel}</div>}
    </button>
  );
}

// ─── Detail Panel Wrapper ──────────────────────────────────────────────────────

function DetailPanel({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">{icon}</span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors" title="Close">
          <X size={14} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientOverviewPage() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const toggle = (s: Section) => setActiveSection((prev) => (prev === s ? null : s));

  // ── Data queries ──────────────────────────────────────────────────────────
  const companiesQ = useQuery({
    queryKey: ["co-overview-companies"],
    queryFn: () => apiClient.get<Company[]>("/portfolio/account-team/companies").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const companies = (companiesQ.data ?? []).sort((a, b) =>
    String(a.company_name ?? "").localeCompare(String(b.company_name ?? ""))
  );
  const sel = companies.find((c) => String(c.company_id ?? c.customer_id ?? "") === clientId);
  const clientName = sel ? String(sel.company_name ?? sel.customer_name ?? "") : "";
  const numericId = Number(clientId) || null;

  const tasksQ = useQuery({
    queryKey: ["co-tasks", clientName],
    queryFn: () => tasksApi.filterTasks({ client_names: [clientName] }).then((r) => r.data),
    enabled: loaded && !!clientName,
    staleTime: 3 * 60 * 1000,
  });
  const tasks: TaskItem[] = tasksQ.data ?? [];

  const initiativesQ = useQuery({
    queryKey: ["co-initiatives"],
    queryFn: () => apiClient.get<InitRow[]>("/portfolio/adoption-tasks").then((r) => r.data),
    enabled: loaded,
    staleTime: 5 * 60 * 1000,
  });
  const initiatives = useMemo(
    () => (initiativesQ.data ?? []).filter((r) => r.task_customer_name === clientName),
    [initiativesQ.data, clientName]
  );

  const teamQ = useQuery({
    queryKey: ["co-account-team"],
    queryFn: () => apiClient.get<TeamRow[]>("/portfolio/account-team/matrix").then((r) => r.data),
    enabled: loaded,
    staleTime: 5 * 60 * 1000,
  });
  const team = useMemo(
    () => (teamQ.data ?? []).filter((r) => r.accountteam_company_name === clientName && (r.accountteam_allocated ?? 1) !== 0),
    [teamQ.data, clientName]
  );

  const projectsQ = useQuery({
    queryKey: ["co-projects", numericId],
    queryFn: () => apiClient.get<ProjectRow[]>("/projects", { params: { customer_id: numericId } }).then((r) => r.data),
    enabled: loaded && !!numericId,
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsQ.data ?? [];

  const eaQ = useQuery({
    queryKey: ["co-ea", numericId],
    queryFn: () => apiClient.get<Record<string, unknown>[]>(`/portfolio/cisco-ea/metering?customer_id=${numericId}`).then((r) => r.data),
    enabled: loaded && !!numericId,
    staleTime: 5 * 60 * 1000,
  });
  const eaRows = eaQ.data ?? [];

  const saQ = useQuery({
    queryKey: ["co-sa", numericId],
    queryFn: () => apiClient.get<Record<string, unknown>[]>(`/portfolio/cisco-sa/usage?customer_id=${numericId}`).then((r) => r.data),
    enabled: loaded && !!numericId,
    staleTime: 5 * 60 * 1000,
  });
  const saRows = saQ.data ?? [];

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeTasks = useMemo(() => tasks.filter((t) => !CLOSED_IDS.has(Number(t.task_status_id ?? 0))), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter((t) => t.task_end && String(t.task_end).slice(0, 10) < TODAY), [activeTasks]);
  const lciTasks = useMemo(() => tasks.filter((t) => [21, 22].includes(Number(t.task_tasktype_id ?? 0))), [tasks]);
  const lciActive = useMemo(() => lciTasks.filter((t) => !CLOSED_IDS.has(Number(t.task_status_id ?? 0))), [lciTasks]);
  const activeInitiatives = useMemo(() => initiatives.filter((r) => !CLOSED_IDS.has(Number(r.task_status_id ?? 0))), [initiatives]);
  const activeProjects = useMemo(() => projects.filter((p) => { const s = (p.project_status ?? "").toLowerCase(); return !s.includes("cancel") && !s.includes("closed") && !s.includes("complet"); }), [projects]);
  const csmTasks = useMemo(() => activeTasks.filter((t) => ![21, 22].includes(Number(t.task_tasktype_id ?? 0))), [activeTasks]);

  const isLoading = tasksQ.isLoading || initiativesQ.isLoading || teamQ.isLoading || projectsQ.isLoading;
  // ── EA metrics: % generated + True Forward detection ──────────────────
  const eaMetrics = useMemo(() => {
    if (!eaRows.length) return { pct: null, hasTF: false, tfCount: 0 };
    let purchased = 0, generated = 0, tfCount = 0;
    for (const r of eaRows) {
      const p = Number(r.mcea_purchased ?? 0);
      const g = Number(r.mcea_generated ?? 0);
      purchased += p;
      generated += g;
      if (p > 0 && g > p) tfCount++;
    }
    const hasTF = tfCount > 0;
    const pct = purchased > 0 ? Math.round((Math.min(generated, purchased) / purchased) * 100) : 0;
    return { pct, hasTF, tfCount };
  }, [eaRows]);

  // ── Account Team Edit Mode ─────────────────────────────────────────────
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.roles?.includes("ADMIN") ?? false;
  const canEditTeam = isAdmin || (() => {
    const role = (authUser?.role ?? "").toUpperCase();
    return role.includes("ADMIN") || role.includes("MANAGER") || role.includes("FULL") || role.includes("EDIT");
  })();

  // ── Initiatives filter & pagination ───────────────────────────────────
  const [initStatusFilter, setInitStatusFilter] = useState<string | null>(null);
  const [initPage, setInitPage] = useState(1);
  const INIT_PAGE_SIZE = 15;

  // ── Projects filter & pagination ──────────────────────────────────────
  const [projectStatusFilter, setProjectStatusFilter] = useState<string | null>(null);
  const [projectPage, setProjectPage] = useState(1);
  const PROJECT_PAGE_SIZE = 15;

  const [showTeamEdit, setShowTeamEdit] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberType, setNewMemberType] = useState("");
  const [addWarn, setAddWarn] = useState(false);
  const [optimisticAlloc, setOptimisticAlloc] = useState<Record<number, boolean>>({});
  const qc = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const allTeamRowsQ = useQuery({
    queryKey: ["co-team-all-rows"],
    queryFn: () => apiClient.get<TeamRowFull[]>("/portfolio/account-team/rows").then((r) => r.data),
    enabled: activeSection === "team" && showTeamEdit && canEditTeam,
    staleTime: 2 * 60 * 1000,
  });
  const companyRows = useMemo(
    () => (allTeamRowsQ.data ?? []).filter((r) => r.accountteam_company_name === clientName),
    [allTeamRowsQ.data, clientName]
  );

  const nttUsersQ = useQuery({
    queryKey: ["co-team-ntt-users"],
    queryFn: () => apiClient.get<NttUser[]>("/portfolio/account-team/users").then((r) => r.data),
    enabled: activeSection === "team" && showTeamEdit && canEditTeam,
    staleTime: 5 * 60 * 1000,
  });
  const existingPersonIds = useMemo(
    () => new Set(companyRows.map((r) => r.accountteam_person_id).filter((id): id is number => id != null)),
    [companyRows]
  );
  const availableUsers = useMemo(
    () => (nttUsersQ.data ?? []).filter((u) => !existingPersonIds.has(u.person_id)).sort((a, b) => a.person_name.localeCompare(b.person_name)),
    [nttUsersQ.data, existingPersonIds]
  );
  const typeOptions = useMemo(
    () => [...new Set(companyRows.map((r) => r.accountteam_person_type).filter(Boolean))].sort() as string[],
    [companyRows]
  );
  const allTypeOptions = typeOptions.length > 0 ? typeOptions : ["AM", "CDM", "CSM", "DIR", "RSA", "SE"];

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.put(`/portfolio/account-team/${id}`, data).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["co-account-team"] }); void qc.invalidateQueries({ queryKey: ["co-team-all-rows"] }); },
  });

  const insertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/portfolio/account-team", data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-account-team"] });
      void qc.invalidateQueries({ queryKey: ["co-team-all-rows"] });
      setNewMemberName(""); setNewMemberType(""); setAddWarn(false);
    },
  });

  const handleToggleAlloc = (row: TeamRowFull, checked: boolean) => {
    setOptimisticAlloc((prev) => ({ ...prev, [row.accountteam_id]: checked }));
    updateMut.mutate(
      { id: row.accountteam_id, data: { accountteam_allocated: checked ? 1 : 0, accountteam_changed_in: todayStr } },
      { onSettled: () => setOptimisticAlloc((prev) => { const n = { ...prev }; delete n[row.accountteam_id]; return n; }) }
    );
  };

  const handleAddMember = () => {
    if (!newMemberName || !newMemberType) { setAddWarn(true); return; }
    const user = availableUsers.find((u) => u.person_name === newMemberName);
    if (!user || !numericId) return;
    setAddWarn(false);
    insertMut.mutate({
      accountteam_company_id: numericId,
      accountteam_person_id: user.person_id,
      accountteam_person_type: newMemberType,
      accountteam_allocation_start_date: todayStr,
      accountteam_allocated: 1,
      accountteam_changed_in: todayStr,
    });
  };

  return (
    <div className="space-y-4">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
              {t("portfolio.clientOverview.title")}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("portfolio.clientOverview.subtitle")}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:min-w-[380px]">
            {/* Searchable combobox */}
            <div className="relative flex-1">
              <input type="text" autoComplete="off"
                value={showDropdown ? searchQuery : clientName}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setSearchQuery(""); setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={t("portfolio.clientOverview.searchClient")}
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {showDropdown && (
                <div className="absolute top-full mt-1 z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {(() => {
                    const q = searchQuery.toLowerCase();
                    const filtered = q ? companies.filter((c) => String(c.company_name ?? "").toLowerCase().includes(q)) : companies;
                    if (!filtered.length) return <p className="px-3 py-2 text-xs text-gray-400">{t("common.noData")}</p>;
                    return filtered.map((c) => {
                      const id = String(c.company_id ?? c.customer_id ?? "");
                      const name = String(c.company_name ?? c.customer_name ?? id);
                      return (
                        <button key={id} type="button"
                          onMouseDown={() => { setClientId(id); setLoaded(false); setActiveSection(null); setShowDropdown(false); setSearchQuery(""); }}
                          className={"w-full text-left px-3 py-1.5 text-xs transition-colors " + (id === clientId ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>
                          {name}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <button disabled={!clientId} onClick={() => { setLoaded(true); setActiveSection(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors">
              <Search size={13} /> {t("portfolio.clientOverview.loadBtn")}
            </button>
          </div>
        </div>

      {/* Client hero strip — no Open full profile button */}
        {loaded && clientName && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{clientName}</p>
          </div>
        )}
      </div>

      {/* ── Empty / pre-load ──────────────────────────────────────────────── */}
      {!loaded && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <BarChart3 size={32} className="text-blue-400 dark:text-blue-500" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("portfolio.clientOverview.hintTitle")}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("portfolio.clientOverview.hintSub")}</p>
        </div>
      )}

      {loaded && isLoading && (
        <div className="flex items-center justify-center gap-3 py-16">
          <Spinner />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("portfolio.clientOverview.loadingData")}</span>
        </div>
      )}

      {/* ── KPI strip — sticky below header, 7 cards ───────────────────── */}
      {loaded && !isLoading && (
        <div className="sticky top-[var(--co-header-h,80px)] z-10 bg-gray-50 dark:bg-gray-950 py-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard icon={<Activity size={16} />} label={t("portfolio.clientOverview.kpiLci")} value={lciActive.length}
              sub={t("portfolio.clientOverview.kpiSubTotal", { n: lciTasks.length })} color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
              active={activeSection === "lci"} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("lci")} />
            <KpiCard icon={<AlertTriangle size={16} />} label={t("portfolio.clientOverview.kpiOverdue")} value={overdueTasks.length}
              sub={t("portfolio.clientOverview.kpiSubPastDue")} color="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
              active={activeSection === "overdue"} alert={overdueTasks.length > 0} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("overdue")} />
            <KpiCard icon={<Zap size={16} />} label={t("portfolio.clientOverview.kpiInitiatives")} value={activeInitiatives.length}
              sub={t("portfolio.clientOverview.kpiSubTotal", { n: initiatives.length })} color="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
              active={activeSection === "initiatives"} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("initiatives")} />
            <KpiCard icon={<Briefcase size={16} />} label={t("portfolio.clientOverview.kpiProjects")} value={activeProjects.length}
              sub={t("portfolio.clientOverview.kpiSubTotal", { n: projects.length })} color="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
              active={activeSection === "projects"} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("projects")} />
            <KpiCard icon={<Users size={16} />} label={t("portfolio.clientOverview.kpiTeam")} value={team.length}
              sub={t("portfolio.clientOverview.kpiSubAllocated")} color="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
              active={activeSection === "team"} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("team")} />
            <KpiCard icon={<Package size={16} />} label={t("portfolio.clientOverview.kpiEa")}
              value={eaMetrics.pct !== null ? eaMetrics.pct + "%" : (eaRows.length > 0 ? "—" : "0%")}
              sub={eaRows.length === 0 ? "no data" : eaMetrics.hasTF ? `⚠ True Forward (${eaMetrics.tfCount})` : `✓ no True Forward`}
              color={eaMetrics.hasTF ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20" : "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"}
              active={activeSection === "ea"} alert={eaMetrics.hasTF} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("ea")} />
            <KpiCard icon={<Package size={16} />} label={t("portfolio.clientOverview.kpiSa")} value={saRows.length}
              sub={t("portfolio.clientOverview.kpiSubSaRecords")} color="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20"
              active={activeSection === "sa"} viewingLabel={t("portfolio.clientOverview.viewing")} onClick={() => toggle("sa")} />
          </div>
        </div>
      )}

      {loaded && !isLoading && (
        <>
          {/* (KPI strip rendered above as sticky) */}
          <div className="hidden" />

          {/* ── Hint when no section selected ───────────────────────────────── */}
          {!activeSection && (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("portfolio.clientOverview.clickHint")}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("portfolio.clientOverview.clickHintSub")}</p>
            </div>
          )}

          {/* ── Detail Panels ────────────────────────────────────────────────── */}

          {/* LCI — License Compliance */}
          {activeSection === "lci" && (
            <DetailPanel title="LCI — License Compliance (tasktype 21·22)" icon={<Activity size={16} />} onClose={() => setActiveSection(null)}>
              {lciTasks.length === 0 ? <Empty msg="No LCI tasks for this client" /> : (
                <>
                  {/* Status summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Open (active)", value: lciActive.length, cls: "text-blue-600 dark:text-blue-400" },
                      { label: "Overdue", value: lciTasks.filter((t) => !CLOSED_IDS.has(Number(t.task_status_id)) && !!t.task_end && String(t.task_end).slice(0, 10) < TODAY).length, cls: "text-red-600 dark:text-red-400" },
                      { label: "Completed", value: lciTasks.filter((t) => Number(t.task_status_id) === 10).length, cls: "text-green-600 dark:text-green-400" },
                      { label: "Total", value: lciTasks.length, cls: "text-gray-600 dark:text-gray-400" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <p className={"text-2xl font-bold " + s.cls}>{s.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* LCI table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        {["Type", "Owner", "Start", "End", "Status", "%"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {lciTasks.map((t, i) => {
                          const isOverdue = !CLOSED_IDS.has(Number(t.task_status_id)) && !!t.task_end && String(t.task_end).slice(0, 10) < TODAY;
                          const statusLabel = isOverdue ? "Overdue" : (t.task_status_name ?? "—");
                          return (
                            <tr key={t.task_id ?? i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{t.task_type_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.task_owner_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(t.task_start)}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(t.task_end)}</td>
                              <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(statusLabel)}>{statusLabel}</span></td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{Number(t.task_completed ?? 0)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Also show non-LCI CSM actions */}
                  {csmTasks.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">CSM Actions (non-LCI open) — {csmTasks.length}</p>
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            {["Type", "Owner", "Start", "End", "Status", "%"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {csmTasks.map((t, i) => {
                              const isOverdue = !!t.task_end && String(t.task_end).slice(0, 10) < TODAY;
                              const statusLabel = isOverdue ? "Overdue" : (t.task_status_name ?? "—");
                              return (
                                <tr key={t.task_id ?? i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{t.task_type_name ?? "—"}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.task_owner_name ?? "—"}</td>
                                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(t.task_start)}</td>
                                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(t.task_end)}</td>
                                  <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(statusLabel)}>{statusLabel}</span></td>
                                  <td className="px-3 py-2 text-gray-500">{Number(t.task_completed ?? 0)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </DetailPanel>
          )}

          {/* Overdue Items */}
          {activeSection === "overdue" && (
            <DetailPanel title={`Overdue Items (${overdueTasks.length})`} icon={<AlertTriangle size={16} />} onClose={() => setActiveSection(null)}>
              {overdueTasks.length === 0 ? <Empty msg="No overdue items — great!" /> : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      {["Type", "Owner", "Due Date", "Days Late", "Status", "%"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {overdueTasks.sort((a, b) => String(a.task_end ?? "").localeCompare(String(b.task_end ?? ""))).map((t, i) => {
                        const daysLate = t.task_end ? Math.floor((new Date(TODAY).getTime() - new Date(String(t.task_end).slice(0, 10)).getTime()) / 86400000) : 0;
                        return (
                          <tr key={t.task_id ?? i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/10">
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{t.task_type_name ?? "—"}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.task_owner_name ?? "—"}</td>
                            <td className="px-3 py-2 text-red-600 dark:text-red-400 whitespace-nowrap font-medium">{fmt(t.task_end)}</td>
                            <td className="px-3 py-2"><span className="font-bold text-red-600 dark:text-red-400">{daysLate}d</span></td>
                            <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(t.task_status_name ?? "")}>{t.task_status_name ?? "—"}</span></td>
                            <td className="px-3 py-2 text-gray-500">{Number(t.task_completed ?? 0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailPanel>
          )}

          {/* Adoption Initiatives */}
          {activeSection === "initiatives" && (
            <DetailPanel title={`Adoption Initiatives (${initiatives.length})`} icon={<Zap size={16} />} onClose={() => setActiveSection(null)}>
              {initiatives.length === 0 ? <Empty msg="No initiatives for this client" /> : (() => {
                // Compute effective status per row (Delayed overrides)
                const withStatus = initiatives.map((ini) => {
                  const statusId = Number(ini.task_status_id ?? 0);
                  const isDelayed = !CLOSED_IDS.has(statusId) && !!ini.task_end && String(ini.task_end).slice(0, 10) < TODAY;
                  return { ...ini, _effectiveStatus: isDelayed ? "Delayed" : (ini.task_status_name ?? "—") };
                });
                // Unique statuses
                const initStatuses = [...new Set(withStatus.map((r) => r._effectiveStatus))].sort();
                // Filter
                const filtered = initStatusFilter
                  ? withStatus.filter((r) => r._effectiveStatus === initStatusFilter)
                  : withStatus;
                // Pagination
                const totalPages = Math.max(1, Math.ceil(filtered.length / INIT_PAGE_SIZE));
                const safePage = Math.min(initPage, totalPages);
                const paginated = filtered.slice((safePage - 1) * INIT_PAGE_SIZE, safePage * INIT_PAGE_SIZE);

                return (
                  <div className="space-y-3">
                    {/* Status filter buttons */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button
                        onClick={() => { setInitStatusFilter(null); setInitPage(1); }}
                        className={"px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors " + (!initStatusFilter ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700")}>
                        All ({initiatives.length})
                      </button>
                      {initStatuses.map((s) => {
                        const count = withStatus.filter((r) => r._effectiveStatus === s).length;
                        const isActive = initStatusFilter === s;
                        return (
                          <button key={s}
                            onClick={() => { setInitStatusFilter(s); setInitPage(1); }}
                            className={"px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors " + (isActive ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700")}>
                            {s} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {["Solution", "CSM", "Start", "End", "Status"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {paginated.map((ini, i) => (
                            <tr key={Number(ini.task_id ?? i)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{ini.task_type_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ini.task_owner_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(ini.task_start)}</td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(ini.task_end)}</td>
                              <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(ini._effectiveStatus)}>{ini._effectiveStatus}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(safePage - 1) * INIT_PAGE_SIZE + 1}–{Math.min(safePage * INIT_PAGE_SIZE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1">
                          {["«", "‹"].map((lbl, idx) => (
                            <button key={lbl} onClick={() => setInitPage(idx === 0 ? 1 : Math.max(1, safePage - 1))}
                              disabled={safePage === 1}
                              className="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                              {lbl}
                            </button>
                          ))}
                          {(() => {
                            const ws = 5; let start = Math.max(1, safePage - 2);
                            const end = Math.min(totalPages, start + ws - 1);
                            if (end - start < ws - 1) start = Math.max(1, end - ws + 1);
                            return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((pg) => (
                              <button key={pg} onClick={() => setInitPage(pg)}
                                className={"flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors " + (pg === safePage ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                {pg}
                              </button>
                            ));
                          })()}
                          {["›", "»"].map((lbl, idx) => (
                            <button key={lbl} onClick={() => setInitPage(idx === 0 ? Math.min(totalPages, safePage + 1) : totalPages)}
                              disabled={safePage >= totalPages}
                              className="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </DetailPanel>
          )}

          {/* Projects */}
          {activeSection === "projects" && (
            <DetailPanel title={`Projects (${projects.length})`} icon={<Briefcase size={16} />} onClose={() => setActiveSection(null)}>
              {projects.length === 0 ? <Empty msg="No projects for this client" /> : (() => {
                // Derive unique statuses
                const statuses = [...new Set(projects.map((p) => p.project_status ?? "—").filter(Boolean))].sort();
                // Apply filter
                const filtered = projectStatusFilter
                  ? projects.filter((p) => (p.project_status ?? "—") === projectStatusFilter)
                  : projects;
                // Pagination
                const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECT_PAGE_SIZE));
                const safePage = Math.min(projectPage, totalPages);
                const paginated = filtered.slice((safePage - 1) * PROJECT_PAGE_SIZE, safePage * PROJECT_PAGE_SIZE);

                return (
                  <div className="space-y-3">
                    {/* Status filter buttons */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button
                        onClick={() => { setProjectStatusFilter(null); setProjectPage(1); }}
                        className={"px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors " + (!projectStatusFilter ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700")}>
                        All ({projects.length})
                      </button>
                      {statuses.map((s) => {
                        const count = projects.filter((p) => (p.project_status ?? "—") === s).length;
                        const isActive = projectStatusFilter === s;
                        return (
                          <button key={s}
                            onClick={() => { setProjectStatusFilter(s); setProjectPage(1); }}
                            className={"px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors " + (isActive ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700")}>
                            {s} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {["OV", "Project Name", "Status", "Start", "End"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {paginated.map((p, i) => (
                            <tr key={Number(p.project_id ?? i)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.project_ov ?? "—"}</td>
                              <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 max-w-xs">{p.project_name ?? "—"}</td>
                              <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(p.project_status ?? "")}>{p.project_status ?? "—"}</span></td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(p.project_start_date)}</td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(p.project_end_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(safePage - 1) * PROJECT_PAGE_SIZE + 1}–{Math.min(safePage * PROJECT_PAGE_SIZE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1">
                          {["«", "‹"].map((lbl, idx) => (
                            <button key={lbl} onClick={() => setProjectPage(idx === 0 ? 1 : Math.max(1, safePage - 1))}
                              disabled={safePage === 1}
                              className="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                              {lbl}
                            </button>
                          ))}
                          {(() => {
                            const ws = 5; let start = Math.max(1, safePage - 2);
                            const end = Math.min(totalPages, start + ws - 1);
                            if (end - start < ws - 1) start = Math.max(1, end - ws + 1);
                            return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((pg) => (
                              <button key={pg} onClick={() => setProjectPage(pg)}
                                className={"flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors " + (pg === safePage ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                {pg}
                              </button>
                            ));
                          })()}
                          {["›", "»"].map((lbl, idx) => (
                            <button key={lbl} onClick={() => setProjectPage(idx === 0 ? Math.min(totalPages, safePage + 1) : totalPages)}
                              disabled={safePage >= totalPages}
                              className="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </DetailPanel>
          )}

          {/* Account Team */}
          {activeSection === "team" && (
            <DetailPanel title={`Account Team (${team.length})`} icon={<Users size={16} />} onClose={() => setActiveSection(null)}>
              <div className="space-y-4">
                {/* Edit Mode toggle */}
                {canEditTeam && (
                  <div className="flex justify-end">
                    <button onClick={() => setShowTeamEdit((v) => !v)}
                      className={"flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors " + (showTeamEdit ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                      <Edit2 size={12} /> Edit Mode
                    </button>
                  </div>
                )}

                {/* View mode: member cards */}
                {!showTeamEdit && (
                  team.length === 0 ? <Empty msg="No account team assigned for this client" /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {team.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {(m.accountteam_person_type ?? "?").slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{m.accountteam_user_name ?? "—"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{m.accountteam_person_type ?? "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Edit mode */}
                {showTeamEdit && canEditTeam && (
                  <div className="space-y-4">
                    {allTeamRowsQ.isLoading ? (
                      <div className="flex justify-center py-4"><Spinner /></div>
                    ) : (
                      <>
                        {/* Member list with allocated checkboxes */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 grid grid-cols-[3fr_2fr_1fr] gap-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Member</span>
                            <span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Type</span>
                            <span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Allocated</span>
                          </div>
                          {companyRows.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-3">No members for this company.</p>}
                          {companyRows.map((row) => {
                            const isAlloc = row.accountteam_id in optimisticAlloc ? optimisticAlloc[row.accountteam_id] : (row.accountteam_allocated ?? 0) !== 0;
                            const isPending = updateMut.isPending && (updateMut.variables as { id: number })?.id === row.accountteam_id;
                            return (
                              <div key={row.accountteam_id} className="grid grid-cols-[3fr_2fr_1fr] gap-2 items-center px-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{row.accountteam_user_name ?? "—"}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{row.accountteam_person_type ?? "—"}</span>
                                <div className="flex items-center">
                                  {isPending ? <div className="w-3.5 h-3.5 border border-blue-600 border-t-transparent rounded-full animate-spin" /> : (
                                    <input type="checkbox" checked={isAlloc}
                                      onChange={(e) => handleToggleAlloc(row, e.target.checked)}
                                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add member form */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Plus size={11} /> Add Member</p>
                          {nttUsersQ.isLoading ? (
                            <div className="flex justify-center py-2"><Spinner /></div>
                          ) : availableUsers.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">All NTT users are already linked to this company.</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Member</label>
                                  <select value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Select user…</option>
                                    {availableUsers.map((u) => <option key={u.person_id} value={u.person_name}>{u.person_name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Type</label>
                                  <select value={newMemberType} onChange={(e) => setNewMemberType(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Select type…</option>
                                    {allTypeOptions.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                                  </select>
                                </div>
                              </div>
                              {addWarn && <p className="text-xs text-amber-500">Please select a user and a type.</p>}
                              {insertMut.isError && <p className="text-xs text-red-500">Error adding member. Try again.</p>}
                              <div className="flex justify-end">
                                <button onClick={handleAddMember} disabled={insertMut.isPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                                  {insertMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={12} />} Save
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </DetailPanel>
          )}

          {/* Cisco Smart Account — full SA report (migrated from Streamlit) */}
          {activeSection === "sa" && (
            <DetailPanel title={`Cisco SA License Usage — ${clientName}`} icon={<Package size={16} />} onClose={() => setActiveSection(null)}>
              {saQ.isLoading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : saRows.length === 0 ? (
                <Empty msg="No Cisco SA data for this client" />
              ) : (
                <CiscoSAClientReport
                  rows={saRows}
                  isDark={document.documentElement.classList.contains("dark")}
                />
              )}
            </DetailPanel>
          )}

          {/* EA Usage — full Cisco EA report (migrated from Streamlit) */}
          {activeSection === "ea" && (
            <DetailPanel title={`Cisco EA License Usage — ${clientName}`} icon={<Package size={16} />} onClose={() => setActiveSection(null)}>
              {eaQ.isLoading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : eaRows.length === 0 ? (
                <Empty msg="No EA data for this client" />
              ) : (
                <CiscoEAClientReport
                  rows={eaRows}
                  isDark={document.documentElement.classList.contains("dark")}
                />
              )}
            </DetailPanel>
          )}

        </>
      )}
    </div>
  );
}
