import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  ChevronRight,
  Edit2,
  Package,
  Plus,
  Search,
  Users,
  X,
  Zap,
  Save,
} from "lucide-react";
import apiClient from "@/api/client";
import { tasksApi, type TaskItem } from "@/api/tasks";
import { useAuthStore } from "@/store/authStore";
import CiscoEAClientReport from "@/pages/portfolio/CiscoEAClientReport";
import CiscoSAClientReport from "@/pages/portfolio/CiscoSAClientReport";
import TaskDetailPanel from "@/pages/tasks/TaskDetailPanel";

type Section = "lci" | "overdue" | "initiatives" | "projects" | "team" | "ea" | "stakeholders" | "assets" | "sa" | null;

interface Company {
  customer_id?: number;
  company_id?: number;
  customer_name?: string;
  company_name?: string;
}

interface TeamRow {
  accountteam_company_name?: string;
  accountteam_user_name?: string;
  accountteam_person_type?: string;
  accountteam_allocated?: number | null;
}
interface TeamRowFull extends TeamRow {
  accountteam_id: number;
  accountteam_company_id?: number;
  accountteam_person_id?: number | null;
}
interface NttUser {
  person_id: number;
  person_name: string;
}
interface InitRow {
  task_customer_name?: string | null;
  task_type_name?: string | null;
  task_owner_name?: string | null;
  task_status_name?: string | null;
  task_status_id?: number | string | null;
  task_start?: string | null;
  task_end?: string | null;
  task_id?: number | string | null;
}
interface ProjectRow {
  project_id?: number | null;
  project_name?: string | null;
  project_status?: string | null;
  project_start_date?: string | null;
  project_end_date?: string | null;
  project_ov?: string | null;
}

interface ClientOverviewCompanyProfile {
  company_id: number;
  company_name?: string | null;
  company_type?: string | null;
  company_vertical?: string | null;
}

interface NpsRow {
  nps_id?: number;
  nps_survey_score?: string | null;
  nps_response_date?: string | null;
}

interface ClientLciReportRow {
  task_id: number;
  task_type_name?: string | null;
  task_ws?: string | null;
  task_value?: number | null;
  task_status_id?: number | null;
  owner_name?: string | null;
  status_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  fy?: number | null;
}

interface ClientLciReportData {
  company_id: number;
  current_fy: number;
  task_count: number;
  approved_stage_count: number;
  approved_total_usd: number;
  chart: { fy: number; label: string; approved_value_usd: number }[];
  tasks: ClientLciReportRow[];
}

interface StakeholderRow {
  stakeholder_id: number;
  stakeholder_person_id?: number | null;
  stakeholder_company_id?: number | null;
  stakeholder_essential_requirements?: string | null;
  stakeholder_internal_external?: string | null;
  stakeholder_key_expectations?: string | null;
  stakeholder_impact_potential?: string | null;
  stakeholder_potential_reactions?: string | null;
  stakeholder_power_in_the_company?: number | null;
  stakeholder_interest_level?: number | null;
  stakeholder_attitude_towards?: string | null;
  stakeholder_strategy_to_gain?: string | null;
  stakeholder_created_by?: string | null;
  stakeholder_updated_by?: string | null;
  stakeholder_updated_on?: string | null;
  stakeholder_remark?: string | null;
  stakeholder_enabled?: number | null;
  person_name?: string | null;
  person_email?: string | null;
  person_telephone?: string | null;
  person_cellphone?: string | null;
  person_job_title?: string | null;
  person_type?: string | null;
  person_enabled?: number | null;
}

const CLOSED_IDS = new Set([4, 5, 6, 10]);
const TODAY = new Date().toISOString().slice(0, 10);
const STAKEHOLDER_LEVELS = [1, 2, 3, 4, 5];
const STAKEHOLDER_ATTITUDES = ["Supporter", "Neutral", "Resistant", "Uninformed", "Champion"];
const fmt = (d: string | null | undefined) => (d ? String(d).slice(0, 10) : "—");
const fmtUSD = (v: number) =>
  Number(v || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function badge(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "overdue" || v === "delayed") return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
  if (v.includes("progress") || v.includes("started")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  if (v.includes("done") || v.includes("complet")) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  if (v.includes("hold") || v.includes("wait")) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
  if (v.includes("cancel") || v.includes("expir") || v.includes("declin")) return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
}
function Empty({ msg = "No data" }: { msg?: string }) {
  return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{msg}</p>;
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  active,
  alert = false,
  viewingLabel = "Viewing",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  active?: boolean;
  alert?: boolean;
  viewingLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left rounded-xl border p-4 flex flex-col gap-2 min-w-0 transition-all " +
        (active
          ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md"
          : alert
            ? "border-red-300 dark:border-red-700 bg-white dark:bg-gray-900 hover:border-red-400"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm")
      }
    >
      <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + color}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {active && (
        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
          <ChevronRight size={10} /> {viewingLabel}
        </div>
      )}
    </button>
  );
}

function DetailPanel({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">{icon}</span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function UnderConstructionCard({ title }: { title: string }) {
  return (
    <InfoCard title={title}>
      <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-4 text-center">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Under construction</p>
      </div>
    </InfoCard>
  );
}

export default function ClientOverviewPage() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [detailTasks, setDetailTasks] = useState<TaskItem[] | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);

  const [companyTypeDraft, setCompanyTypeDraft] = useState("");
  const [companyVerticalDraft, setCompanyVerticalDraft] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [editingVertical, setEditingVertical] = useState(false);
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<number | null>(null);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [stakeholderForm, setStakeholderForm] = useState<Record<string, unknown>>({});
  const [newPersonForm, setNewPersonForm] = useState<Record<string, unknown>>({});

  const toggle = (s: Section) => {
    setDetailTasks(null);
    setDetailIndex(0);
    setActiveSection((prev) => (prev === s ? null : s));
  };

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

  const companyOverviewQ = useQuery({
    queryKey: ["co-company-overview", numericId],
    queryFn: () => apiClient.get<ClientOverviewCompanyProfile>(`/portfolio/client-overview/company/${numericId}`).then((r) => r.data),
    enabled: loaded && !!numericId,
  });

  const npsQ = useQuery({
    queryKey: ["co-nps", numericId],
    queryFn: () => apiClient.get<NpsRow>(`/portfolio/client-overview/nps/${numericId}`).then((r) => r.data),
    enabled: loaded && !!numericId,
  });

  const stakeholdersQ = useQuery({
    queryKey: ["co-stakeholders", numericId],
    queryFn: () => apiClient.get<StakeholderRow[]>(`/portfolio/client-overview/stakeholders/${numericId}`).then((r) => r.data),
    enabled: loaded && !!numericId,
  });

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
  const initiatives = useMemo(() => {
    const normalizedClientName = clientName.trim().toLowerCase();
    return (initiativesQ.data ?? []).filter(
      (r) => String(r.task_customer_name ?? "").trim().toLowerCase() === normalizedClientName
    );
  }, [initiativesQ.data, clientName]);

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
    queryFn: () =>
      apiClient.get<Record<string, unknown>[]>(`/portfolio/cisco-sa/usage?customer_id=${numericId}`, {
        timeout: 120000,
      }).then((r) => r.data),
    enabled: loaded && !!numericId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const saRows = saQ.data ?? [];

  const rebateReportQ = useQuery({
    queryKey: ["co-rebate-report", numericId, clientName],
    queryFn: () =>
      apiClient
        .get<ClientLciReportData>(`/adoption/cisco-lci/client-report/${numericId}`, {
          params: { client_name: clientName || undefined },
        })
        .then((r) => r.data),
    enabled: loaded && !!numericId && activeSection === "lci",
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (companyOverviewQ.data) {
      setCompanyTypeDraft(String(companyOverviewQ.data.company_type ?? ""));
      setCompanyVerticalDraft(String(companyOverviewQ.data.company_vertical ?? ""));
    }
  }, [companyOverviewQ.data]);

  useEffect(() => {
    const rows = stakeholdersQ.data ?? [];
    if (rows.length > 0 && selectedStakeholderId == null) {
      setSelectedStakeholderId(rows[0].stakeholder_id);
    }
    if (rows.length === 0) {
      setSelectedStakeholderId(null);
    }
  }, [stakeholdersQ.data, selectedStakeholderId]);

  useEffect(() => {
    if (activeSection === "sa" && saQ.isError) {
      void saQ.refetch();
    }
  }, [activeSection, saQ]);

  const activeTasks = useMemo(() => tasks.filter((t) => !CLOSED_IDS.has(Number(t.task_status_id ?? 0))), [tasks]);
  const criticalAlerts = useMemo(() => {
    return activeTasks
      .filter((t) => {
        const isN1 = String(t.critical_level ?? "").toUpperCase() === "N1";
        const isExpense = String(t.task_finance_type ?? "").toUpperCase() === "EXPENSE";
        const isServiceImpact = Number(t.is_service_impacting ?? 0) === 1;
        return isN1 && (isExpense || isServiceImpact);
      })
      .sort((a, b) => {
        const aExpense = String(a.task_finance_type ?? "").toUpperCase() === "EXPENSE";
        const bExpense = String(b.task_finance_type ?? "").toUpperCase() === "EXPENSE";
        if (aExpense !== bExpense) return aExpense ? -1 : 1;
        const aDate = String(a.next_followup_any_effective ?? a.task_end ?? "9999-12-31");
        const bDate = String(b.next_followup_any_effective ?? b.task_end ?? "9999-12-31");
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return Number(b.task_value_brl ?? b.task_value_usd ?? 0) - Number(a.task_value_brl ?? a.task_value_usd ?? 0);
      });
  }, [activeTasks]);
  const financeCriticalAlerts = useMemo(
    () => criticalAlerts.filter((t) => String(t.task_finance_type ?? "").toUpperCase() === "EXPENSE"),
    [criticalAlerts]
  );
  const serviceCriticalAlerts = useMemo(
    () => criticalAlerts.filter((t) => Number(t.is_service_impacting ?? 0) === 1),
    [criticalAlerts]
  );
  const lciTasks = useMemo(() => tasks.filter((t) => [21, 22].includes(Number(t.task_tasktype_id ?? 0))), [tasks]);
  const lciActive = useMemo(() => lciTasks.filter((t) => !CLOSED_IDS.has(Number(t.task_status_id ?? 0))), [lciTasks]);
  const activeInitiatives = useMemo(() => initiatives.filter((r) => !CLOSED_IDS.has(Number(r.task_status_id ?? 0))), [initiatives]);
  const activeProjects = useMemo(
    () => projects.filter((p) => {
      const s = (p.project_status ?? "").toLowerCase();
      return !s.includes("cancel") && !s.includes("closed") && !s.includes("complet");
    }),
    [projects]
  );
  const csmTasks = useMemo(() => activeTasks.filter((t) => ![21, 22].includes(Number(t.task_tasktype_id ?? 0))), [activeTasks]);
  const isLoading = tasksQ.isLoading || initiativesQ.isLoading || teamQ.isLoading || projectsQ.isLoading;

  const eaMetrics = useMemo(() => {
    if (!eaRows.length) return { pct: null, hasTF: false, tfCount: 0 };
    let purchased = 0;
    let generated = 0;
    let tfCount = 0;
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

  const authUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const actorName = authUser?.email ?? "react";
  const isAdmin = authUser?.roles?.includes("ADMIN") ?? false;
  const canOpenTaskDetail = hasPermission("task.task");
  const canEditTeam = isAdmin || (() => {
    const role = (authUser?.role ?? "").toUpperCase();
    return role.includes("ADMIN") || role.includes("MANAGER") || role.includes("FULL") || role.includes("EDIT");
  })();

  const [initStatusFilter, setInitStatusFilter] = useState<string | null>(null);
  const [initPage, setInitPage] = useState(1);
  const INIT_PAGE_SIZE = 15;

  const [projectStatusFilter, setProjectStatusFilter] = useState<string | null>(null);
  const [projectPage, setProjectPage] = useState(1);
  const PROJECT_PAGE_SIZE = 15;

  const [lciStatusFilter, setLciStatusFilter] = useState<string | null>(null);
  const [lciPage, setLciPage] = useState(1);
  const LCI_PAGE_SIZE = 10;

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

  const companyMut = useMutation({
    mutationFn: (data: { company_type: string; company_vertical: string }) =>
      apiClient.put(`/portfolio/client-overview/company/${numericId}`, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-company-overview", numericId] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.put(`/portfolio/account-team/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-account-team"] });
      void qc.invalidateQueries({ queryKey: ["co-team-all-rows"] });
    },
  });

  const insertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/portfolio/account-team", data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-account-team"] });
      void qc.invalidateQueries({ queryKey: ["co-team-all-rows"] });
      setNewMemberName("");
      setNewMemberType("");
      setAddWarn(false);
    },
  });

  const createPersonMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/portfolio/client-overview/person", data).then((r) => r.data),
  });

  const createStakeholderMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/portfolio/client-overview/stakeholders", data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-stakeholders", numericId] });
    },
  });

  const updateStakeholderMut = useMutation({
    mutationFn: ({ stakeholderId, data }: { stakeholderId: number; data: Record<string, unknown> }) =>
      apiClient.put(`/portfolio/client-overview/stakeholders/${stakeholderId}`, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["co-stakeholders", numericId] });
    },
  });

  const stakeholders = stakeholdersQ.data ?? [];
  const selectedStakeholder = stakeholders.find((s) => s.stakeholder_id === selectedStakeholderId) ?? null;

  const handleToggleAlloc = (row: TeamRowFull, checked: boolean) => {
    setOptimisticAlloc((prev) => ({ ...prev, [row.accountteam_id]: checked }));
    updateMut.mutate(
      { id: row.accountteam_id, data: { accountteam_allocated: checked ? 1 : 0, accountteam_changed_in: todayStr } },
      {
        onSettled: () =>
          setOptimisticAlloc((prev) => {
            const n = { ...prev };
            delete n[row.accountteam_id];
            return n;
          }),
      }
    );
  };

  const handleAddMember = () => {
    if (!newMemberName || !newMemberType) {
      setAddWarn(true);
      return;
    }
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

  const openTaskDetail = (taskList: TaskItem[], taskId?: number | string | null) => {
    if (!canOpenTaskDetail || !taskList.length) return;
    const normalizedTaskId = Number(taskId ?? 0);
    const filteredTasks = taskList.filter((task) => Number(task.task_id ?? 0) === normalizedTaskId);
    if (!filteredTasks.length) return;
    setDetailTasks(filteredTasks);
    setDetailIndex(0);
  };

  const closeTaskDetail = () => {
    setDetailTasks(null);
    setDetailIndex(0);
  };

  const saveCompanyProfile = () => {
    companyMut.mutate({
      company_type: companyTypeDraft,
      company_vertical: companyVerticalDraft,
    });
  };

  const startNewStakeholder = () => {
    setShowStakeholderForm(true);
    setSelectedStakeholderId(null);
    setNewPersonForm({
      person_name: "",
      person_email: "",
      person_telephone: "",
      person_cellphone: "",
      person_job_title: "",
      person_company_id: numericId,
      person_enabled: 1,
    });
    setStakeholderForm({
      stakeholder_company_id: numericId,
      stakeholder_project_id: 0,
      stakeholder_internal_external: "EXTERNAL",
      stakeholder_power_in_the_company: 3,
      stakeholder_interest_level: 3,
      stakeholder_attitude_towards: "Neutral",
      stakeholder_enabled: 1,
      stakeholder_remark: "",
      stakeholder_essential_requirements: "",
      stakeholder_key_expectations: "",
      stakeholder_impact_potential: "",
      stakeholder_potential_reactions: "",
      stakeholder_strategy_to_gain: "",
    });
  };

  const startEditStakeholder = (row: StakeholderRow) => {
    setShowStakeholderForm(true);
    setSelectedStakeholderId(row.stakeholder_id);
    setStakeholderForm({
      stakeholder_company_id: row.stakeholder_company_id ?? numericId,
      stakeholder_project_id: 0,
      stakeholder_person_id: row.stakeholder_person_id ?? undefined,
      stakeholder_internal_external: row.stakeholder_internal_external ?? "EXTERNAL",
      stakeholder_power_in_the_company: row.stakeholder_power_in_the_company ?? 3,
      stakeholder_interest_level: row.stakeholder_interest_level ?? 3,
      stakeholder_attitude_towards: row.stakeholder_attitude_towards ?? "Neutral",
      stakeholder_enabled: row.stakeholder_enabled ?? 1,
      stakeholder_remark: row.stakeholder_remark ?? "",
      stakeholder_essential_requirements: row.stakeholder_essential_requirements ?? "",
      stakeholder_key_expectations: row.stakeholder_key_expectations ?? "",
      stakeholder_impact_potential: row.stakeholder_impact_potential ?? "",
      stakeholder_potential_reactions: row.stakeholder_potential_reactions ?? "",
      stakeholder_strategy_to_gain: row.stakeholder_strategy_to_gain ?? "",
    });
    setNewPersonForm({
      person_name: row.person_name ?? "",
      person_email: row.person_email ?? "",
      person_telephone: row.person_telephone ?? "",
      person_cellphone: row.person_cellphone ?? "",
      person_job_title: row.person_job_title ?? "",
      person_company_id: numericId,
      person_enabled: row.person_enabled ?? 1,
    });
  };

  const saveStakeholder = async () => {
    if (!numericId) return;
    let personId = Number(stakeholderForm.stakeholder_person_id ?? 0);

    if (!personId) {
      const created = await createPersonMut.mutateAsync({
        ...newPersonForm,
        person_company_id: numericId,
      });
      personId = Number(created.person_id ?? 0);
    }

    const payload = {
      ...stakeholderForm,
      stakeholder_company_id: numericId,
      stakeholder_person_id: personId,
      stakeholder_updated_on: todayStr,
      stakeholder_updated_by: actorName,
    };

    if (selectedStakeholderId) {
      await updateStakeholderMut.mutateAsync({ stakeholderId: selectedStakeholderId, data: payload });
    } else {
      const createdStakeholder = await createStakeholderMut.mutateAsync({
        ...payload,
        stakeholder_created_by: actorName,
      });
      setSelectedStakeholderId(Number(createdStakeholder.stakeholder_id ?? 0));
    }
    setShowStakeholderForm(false);
  };

  const rebateTasks = rebateReportQ.data?.tasks ?? [];
  const lciClosedTasks = useMemo(
    () => rebateTasks.filter((row) => Number(row.task_status_id ?? 0) === 10),
    [rebateTasks]
  );
  const lciActiveTasks = useMemo(
    () => rebateTasks.filter((row) => ![4, 5, 6, 10].includes(Number(row.task_status_id ?? 0))),
    [rebateTasks]
  );
  const lciLostTasks = useMemo(
    () => rebateTasks.filter((row) => Number(row.task_status_id ?? 0) === 6),
    [rebateTasks]
  );
  const lciIneligibleTasks = useMemo(
    () => rebateTasks.filter((row) => [4, 5].includes(Number(row.task_status_id ?? 0))),
    [rebateTasks]
  );
  const filteredLciTasks = useMemo(() => {
    switch (lciStatusFilter) {
      case "active":
        return lciActiveTasks;
      case "closed":
        return lciClosedTasks;
      case "lost":
        return lciLostTasks;
      case "ineligible":
        return lciIneligibleTasks;
      default:
        return rebateTasks;
    }
  }, [lciStatusFilter, lciActiveTasks, lciClosedTasks, lciLostTasks, lciIneligibleTasks, rebateTasks]);
  const lciPages = Math.max(1, Math.ceil(filteredLciTasks.length / LCI_PAGE_SIZE));
  const paginatedLciTasks = filteredLciTasks.slice((lciPage - 1) * LCI_PAGE_SIZE, lciPage * LCI_PAGE_SIZE);

  return (
    <div className="space-y-4">
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
            <div className="relative flex-1">
              <input
                type="text"
                autoComplete="off"
                value={showDropdown ? searchQuery : clientName}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  setSearchQuery("");
                  setShowDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={t("portfolio.clientOverview.searchClient")}
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                        <button
                          key={id}
                          type="button"
                          onMouseDown={() => {
                            setClientId(id);
                            setLoaded(false);
                            setActiveSection(null);
                            setDetailTasks(null);
                            setDetailIndex(0);
                            setShowDropdown(false);
                            setSearchQuery("");
                            setShowStakeholderForm(false);
                            setSelectedStakeholderId(null);
                          }}
                          className={
                            "w-full text-left px-3 py-1.5 text-xs transition-colors " +
                            (id === clientId
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")
                          }
                        >
                          {name}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <button
              disabled={!clientId}
              onClick={() => {
                setLoaded(true);
                setActiveSection(null);
                setDetailTasks(null);
                setDetailIndex(0);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Search size={13} /> {t("portfolio.clientOverview.loadBtn")}
            </button>
          </div>
        </div>

        {loaded && clientName && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
              <div className="xl:col-span-4 flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{clientName}</p>
              </div>

              <div className="xl:col-span-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</label>
                  <button
                    type="button"
                    onClick={() => setEditingType((v) => !v)}
                    className="rounded p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Edit type"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                {editingType ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={companyTypeDraft}
                      onChange={(e) => setCompanyTypeDraft(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        saveCompanyProfile();
                        setEditingType(false);
                      }}
                      disabled={companyMut.isPending}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2.5 py-2 text-white disabled:opacity-50"
                      title="Save type"
                    >
                      {companyMut.isPending ? <Spinner /> : <Save size={12} />}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 px-3 py-2 min-h-[42px] flex items-center text-sm text-gray-700 dark:text-gray-300">
                    {companyTypeDraft || "—"}
                  </div>
                )}
              </div>

              <div className="xl:col-span-3">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vertical</label>
                  <button
                    type="button"
                    onClick={() => setEditingVertical((v) => !v)}
                    className="rounded p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Edit vertical"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                {editingVertical ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={companyVerticalDraft}
                      onChange={(e) => setCompanyVerticalDraft(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        saveCompanyProfile();
                        setEditingVertical(false);
                      }}
                      disabled={companyMut.isPending}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2.5 py-2 text-white disabled:opacity-50"
                      title="Save vertical"
                    >
                      {companyMut.isPending ? <Spinner /> : <Save size={12} />}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 px-3 py-2 min-h-[42px] flex items-center text-sm text-gray-700 dark:text-gray-300">
                    {companyVerticalDraft || "—"}
                  </div>
                )}
              </div>

              <div className="xl:col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Latest NPS</label>
                <div className="mt-1 px-3 py-2 min-h-[42px] flex flex-col justify-center">
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 leading-tight">{npsQ.data?.nps_survey_score ?? "—"}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                    Last response date: {fmt(npsQ.data?.nps_response_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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

      {loaded && !isLoading && (
        <>
          <div className="py-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              <KpiCard
                icon={<Activity size={16} />}
                label="REBATES"
                value={lciActive.length}
                sub={t("portfolio.clientOverview.kpiSubTotal", { n: lciTasks.length })}
                color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                active={activeSection === "lci"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("lci")}
              />
              <KpiCard
                icon={<AlertTriangle size={16} />}
                label={t("portfolio.clientOverview.kpiOverdue")}
                value={criticalAlerts.length}
                sub={t("portfolio.clientOverview.kpiSubPastDue")}
                color="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                active={activeSection === "overdue"}
                alert={criticalAlerts.length > 0}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("overdue")}
              />
              <KpiCard
                icon={<Zap size={16} />}
                label={t("portfolio.clientOverview.kpiInitiatives")}
                value={activeInitiatives.length}
                sub={t("portfolio.clientOverview.kpiSubTotal", { n: initiatives.length })}
                color="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                active={activeSection === "initiatives"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("initiatives")}
              />
              <KpiCard
                icon={<Briefcase size={16} />}
                label={t("portfolio.clientOverview.kpiProjects")}
                value={activeProjects.length}
                sub={t("portfolio.clientOverview.kpiSubTotal", { n: projects.length })}
                color="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                active={activeSection === "projects"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("projects")}
              />
              <KpiCard
                icon={<Users size={16} />}
                label={t("portfolio.clientOverview.kpiTeam")}
                value={team.length}
                sub={t("portfolio.clientOverview.kpiSubAllocated")}
                color="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                active={activeSection === "team"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("team")}
              />
              <KpiCard
                icon={<Users size={16} />}
                label="Stakeholders"
                value={stakeholders.length}
                sub="registered stakeholders"
                color="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                active={activeSection === "stakeholders"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("stakeholders")}
              />
              <KpiCard
                icon={<Package size={16} />}
                label="Assets"
                value={0}
                sub="NTT, Vendor and LDoS"
                color="text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/20"
                active={activeSection === "assets"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("assets")}
              />
              <KpiCard
                icon={<Package size={16} />}
                label={t("portfolio.clientOverview.kpiEa")}
                value={eaMetrics.pct !== null ? eaMetrics.pct + "%" : eaRows.length > 0 ? "—" : "0%"}
                sub={eaRows.length === 0 ? "no data" : eaMetrics.hasTF ? `⚠ True Forward (${eaMetrics.tfCount})` : `✓ no True Forward`}
                color={eaMetrics.hasTF ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20" : "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"}
                active={activeSection === "ea"}
                alert={eaMetrics.hasTF}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("ea")}
              />
              <KpiCard
                icon={<Package size={16} />}
                label={t("portfolio.clientOverview.kpiSa")}
                value={saRows.length}
                sub={t("portfolio.clientOverview.kpiSubSaRecords")}
                color="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20"
                active={activeSection === "sa"}
                viewingLabel={t("portfolio.clientOverview.viewing")}
                onClick={() => toggle("sa")}
              />
            </div>
          </div>

          {!activeSection && (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("portfolio.clientOverview.clickHint")}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("portfolio.clientOverview.clickHintSub")}</p>
            </div>
          )}

          {activeSection === "lci" && (
            <DetailPanel
              title="Adoption Cisco LCI"
              icon={<Activity size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {rebateReportQ.isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : rebateReportQ.isError ? (
                <Empty msg="Failed to load rebate report" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <InfoCard title="Current FY">
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        FY {rebateReportQ.data?.current_fy ?? "—"}
                      </p>
                    </InfoCard>
                    <InfoCard title="Approved stages">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {rebateReportQ.data?.approved_stage_count ?? 0}
                      </p>
                    </InfoCard>
                    <InfoCard title="Approved value (USD)">
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmtUSD(rebateReportQ.data?.approved_total_usd ?? 0)}
                      </p>
                    </InfoCard>
                  </div>

                  <InfoCard title="Approved stages by fiscal year">
                    {rebateReportQ.data?.chart?.length ? (
                      <Plot
                        data={[
                          {
                            type: "bar",
                            x: rebateReportQ.data.chart.map((row) => row.label),
                            y: rebateReportQ.data.chart.map((row) => row.approved_value_usd),
                            marker: { color: "#2563eb" },
                            text: rebateReportQ.data.chart.map((row) => fmtUSD(row.approved_value_usd)),
                            textposition: "outside",
                            hovertemplate: "%{x}<br>%{text}<extra></extra>",
                          },
                        ]}
                        layout={{
                          paper_bgcolor: document.documentElement.classList.contains("dark") ? "#111827" : "white",
                          plot_bgcolor: document.documentElement.classList.contains("dark") ? "#111827" : "white",
                          font: { color: document.documentElement.classList.contains("dark") ? "#d1d5db" : "#374151", size: 11 },
                          margin: { t: 20, b: 40, l: 60, r: 20 },
                          height: 320,
                          yaxis: { title: "Approved Value (USD)" },
                        }}
                        useResizeHandler
                        style={{ width: "100%" }}
                        config={{ displayModeBar: false }}
                      />
                    ) : (
                      <Empty msg="No approved activities found for this client" />
                    )}
                  </InfoCard>

                  <InfoCard title={`LCI tasks in FY ${rebateReportQ.data?.current_fy ?? "—"}`}>
                    {rebateTasks.length ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLciStatusFilter(null);
                              setLciPage(1);
                            }}
                            className={
                              "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                              (lciStatusFilter == null
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                            }
                          >
                            All ({rebateTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLciStatusFilter("active");
                              setLciPage(1);
                            }}
                            className={
                              "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                              (lciStatusFilter === "active"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                            }
                          >
                            Active ({lciActiveTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLciStatusFilter("closed");
                              setLciPage(1);
                            }}
                            className={
                              "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                              (lciStatusFilter === "closed"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                            }
                          >
                            Closed ({lciClosedTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLciStatusFilter("lost");
                              setLciPage(1);
                            }}
                            className={
                              "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                              (lciStatusFilter === "lost"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                            }
                          >
                            Lost ({lciLostTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLciStatusFilter("ineligible");
                              setLciPage(1);
                            }}
                            className={
                              "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                              (lciStatusFilter === "ineligible"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                            }
                          >
                            Ineligible ({lciIneligibleTasks.length})
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                {["Task", "Task WS", "Type", "Value (USD)", "Owner", "Start", "End", "FY", "Status"].map((h) => (
                                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedLciTasks.map((row) => (
                                <tr
                                  key={row.task_id}
                                  onClick={() => openTaskDetail(tasks, row.task_id)}
                                  className={
                                    "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 " +
                                    (canOpenTaskDetail ? "cursor-pointer" : "")
                                  }
                                >
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{row.task_id}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.task_ws ?? "—"}</td>
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.task_type_name ?? "—"}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtUSD(Number(row.task_value ?? 0))}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.owner_name ?? "—"}</td>
                                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.start_date)}</td>
                                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.end_date)}</td>
                                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.fy ? `FY ${row.fy}` : "—"}</td>
                                  <td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(row.status_name)}>{row.status_name ?? "—"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {lciPages > 1 ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setLciPage((p) => Math.max(1, p - 1))}
                              disabled={lciPage <= 1}
                              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Page {lciPage} / {lciPages}
                            </span>
                            <button
                              type="button"
                              onClick={() => setLciPage((p) => Math.min(lciPages, p + 1))}
                              disabled={lciPage >= lciPages}
                              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Empty msg="No LCI tasks found for the selected client in the current FY" />
                    )}
                  </InfoCard>
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === "overdue" && (
            <DetailPanel
              title={`Critical Alerts (${criticalAlerts.length})`}
              icon={<AlertTriangle size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {criticalAlerts.length === 0 ? <Empty msg="No critical alerts for this client" /> : <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700"><table className="w-full text-xs"><thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{["Type", "Category", "Owner", "Status", "Follow-up", "Value / Exposure"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{criticalAlerts.map((t, i) => { const isExpense = String(t.task_finance_type ?? "").toUpperCase() === "EXPENSE"; const isService = Number(t.is_service_impacting ?? 0) === 1; return <tr key={t.task_id ?? i} onClick={() => openTaskDetail(criticalAlerts, t.task_id)} className={"border-b border-gray-100 dark:border-gray-800 hover:bg-red-50/30 dark:hover:bg-red-900/10 " + (canOpenTaskDetail ? "cursor-pointer" : "")}><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{t.task_type_name ?? "—"}</td><td className="px-3 py-2"><div className="flex gap-1.5 flex-wrap">{isExpense && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">Finance</span>}{isService && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700">Service</span>}</div></td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.task_owner_name ?? "—"}</td><td className="px-3 py-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(t.task_status_reclassified ?? t.task_status_name ?? "")}>{t.task_status_reclassified ?? t.task_status_name ?? "—"}</span></td><td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(t.next_followup_any_effective ?? t.task_end)}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.task_value_usd ? `USD ${Number(t.task_value_usd).toLocaleString("en-US")}` : t.task_value_brl ? `BRL ${Number(t.task_value_brl).toLocaleString("pt-BR")}` : "—"}</td></tr>; })}</tbody></table></div>}
            </DetailPanel>
          )}

          {activeSection === "initiatives" && (
            <DetailPanel
              title={`Adoption Initiatives (${initiatives.length})`}
              icon={<Zap size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {initiatives.length === 0 ? (
                <Empty msg="No initiatives for this client" />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInitStatusFilter(null);
                        setInitPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (initStatusFilter == null
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      All ({initiatives.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInitStatusFilter("active");
                        setInitPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (initStatusFilter === "active"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      Active ({activeInitiatives.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInitStatusFilter("closed");
                        setInitPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (initStatusFilter === "closed"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      Closed ({initiatives.length - activeInitiatives.length})
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {["Type", "Owner", "Start", "End", "Status"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(initStatusFilter === "active"
                          ? activeInitiatives
                          : initStatusFilter === "closed"
                            ? initiatives.filter((r) => CLOSED_IDS.has(Number(r.task_status_id ?? 0)))
                            : initiatives
                        )
                          .slice((initPage - 1) * INIT_PAGE_SIZE, initPage * INIT_PAGE_SIZE)
                          .map((row, i) => (
                            <tr
                              key={`${row.task_id ?? i}`}
                              onClick={() => openTaskDetail(tasks, row.task_id)}
                              className={
                                "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 " +
                                (canOpenTaskDetail ? "cursor-pointer" : "")
                              }
                            >
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{row.task_type_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.task_owner_name ?? "—"}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.task_start)}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.task_end)}</td>
                              <td className="px-3 py-2">
                                <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(row.task_status_name)}>
                                  {row.task_status_name ?? "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const filtered =
                      initStatusFilter === "active"
                        ? activeInitiatives
                        : initStatusFilter === "closed"
                          ? initiatives.filter((r) => CLOSED_IDS.has(Number(r.task_status_id ?? 0)))
                          : initiatives;
                    const pages = Math.max(1, Math.ceil(filtered.length / INIT_PAGE_SIZE));
                    return pages > 1 ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInitPage((p) => Math.max(1, p - 1))}
                          disabled={initPage <= 1}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Page {initPage} / {pages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInitPage((p) => Math.min(pages, p + 1))}
                          disabled={initPage >= pages}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === "projects" && (
            <DetailPanel
              title={`Projects (${projects.length})`}
              icon={<Briefcase size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {projects.length === 0 ? (
                <Empty msg="No projects for this client" />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectStatusFilter(null);
                        setProjectPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (projectStatusFilter == null
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      All ({projects.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectStatusFilter("active");
                        setProjectPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (projectStatusFilter === "active"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      Active ({activeProjects.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectStatusFilter("closed");
                        setProjectPage(1);
                      }}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-medium border " +
                        (projectStatusFilter === "closed"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")
                      }
                    >
                      Closed ({projects.length - activeProjects.length})
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {["Project", "Status", "Start", "End", "OV"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(projectStatusFilter === "active"
                          ? activeProjects
                          : projectStatusFilter === "closed"
                            ? projects.filter((p) => {
                                const s = (p.project_status ?? "").toLowerCase();
                                return s.includes("cancel") || s.includes("closed") || s.includes("complet");
                              })
                            : projects
                        )
                          .slice((projectPage - 1) * PROJECT_PAGE_SIZE, projectPage * PROJECT_PAGE_SIZE)
                          .map((row, i) => (
                            <tr key={`${row.project_id ?? i}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{row.project_name ?? "—"}</td>
                              <td className="px-3 py-2">
                                <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + badge(row.project_status)}>
                                  {row.project_status ?? "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.project_start_date)}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(row.project_end_date)}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.project_ov ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const filtered =
                      projectStatusFilter === "active"
                        ? activeProjects
                        : projectStatusFilter === "closed"
                          ? projects.filter((p) => {
                              const s = (p.project_status ?? "").toLowerCase();
                              return s.includes("cancel") || s.includes("closed") || s.includes("complet");
                            })
                          : projects;
                    const pages = Math.max(1, Math.ceil(filtered.length / PROJECT_PAGE_SIZE));
                    return pages > 1 ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                          disabled={projectPage <= 1}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Page {projectPage} / {pages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setProjectPage((p) => Math.min(pages, p + 1))}
                          disabled={projectPage >= pages}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </DetailPanel>
          )}

          {activeSection === "assets" && (
            <DetailPanel
              title="Assets"
              icon={<Package size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-4">
                  <UnderConstructionCard title="NTT Contract" />
                </div>
                <div className="xl:col-span-4">
                  <UnderConstructionCard title="Vendor Contract" />
                </div>
                <div className="xl:col-span-4">
                  <UnderConstructionCard title="Product / Services LDoS" />
                </div>
              </div>
            </DetailPanel>
          )}

          {activeSection === "stakeholders" && (
            <DetailPanel
              title="Stakeholder Management"
              icon={<Users size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stakeholder Management</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stakeholders for the selected client, including inactive members.</p>
                  </div>
                  <button
                    onClick={startNewStakeholder}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <Plus size={12} /> New stakeholder
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12">
                  <div className="xl:col-span-4 border-r border-gray-100 dark:border-gray-800">
                    {stakeholders.length === 0 ? (
                      <Empty msg="No stakeholders for this client" />
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {stakeholders.map((row) => (
                          <button
                            key={row.stakeholder_id}
                            onClick={() => {
                              setSelectedStakeholderId(row.stakeholder_id);
                              setShowStakeholderForm(false);
                            }}
                            className={
                              "w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 " +
                              (row.stakeholder_id === selectedStakeholderId && !showStakeholderForm
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "")
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.person_name ?? `Stakeholder #${row.stakeholder_id}`}</p>
                              {Number(row.stakeholder_enabled ?? 1) === 0 && (
                                <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.person_job_title ?? row.stakeholder_internal_external ?? "—"}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-8 p-4">
                    {!showStakeholderForm && selectedStakeholder ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedStakeholder.person_name ?? "—"}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedStakeholder.person_job_title ?? "—"}</p>
                          </div>
                          <button
                            onClick={() => startEditStakeholder(selectedStakeholder)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <InfoCard title="Contact">
                            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                              <p>Email: {selectedStakeholder.person_email ?? "—"}</p>
                              <p>Telephone: {selectedStakeholder.person_telephone ?? "—"}</p>
                              <p>Cellphone: {selectedStakeholder.person_cellphone ?? "—"}</p>
                            </div>
                          </InfoCard>
                          <InfoCard title="Assessment">
                            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                              <p>Power: {selectedStakeholder.stakeholder_power_in_the_company ?? "—"}</p>
                              <p>Interest: {selectedStakeholder.stakeholder_interest_level ?? "—"}</p>
                              <p>Attitude: {selectedStakeholder.stakeholder_attitude_towards ?? "—"}</p>
                            </div>
                          </InfoCard>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <InfoCard title="Essential requirements">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_essential_requirements || "—"}</p>
                          </InfoCard>
                          <InfoCard title="Key expectations">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_key_expectations || "—"}</p>
                          </InfoCard>
                          <InfoCard title="Impact potential">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_impact_potential || "—"}</p>
                          </InfoCard>
                          <InfoCard title="Potential reactions">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_potential_reactions || "—"}</p>
                          </InfoCard>
                          <InfoCard title="Strategy to gain">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_strategy_to_gain || "—"}</p>
                          </InfoCard>
                          <InfoCard title="Remarks">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedStakeholder.stakeholder_remark || "—"}</p>
                          </InfoCard>
                        </div>
                      </div>
                    ) : showStakeholderForm ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {selectedStakeholderId ? "Edit stakeholder" : "New stakeholder"}
                          </h4>
                          <button
                            onClick={() => setShowStakeholderForm(false)}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            Cancel
                          </button>
                        </div>

                        {!selectedStakeholderId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</label>
                              <input
                                value={String(newPersonForm.person_name ?? "")}
                                onChange={(e) => setNewPersonForm((prev) => ({ ...prev, person_name: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Job title</label>
                              <input
                                value={String(newPersonForm.person_job_title ?? "")}
                                onChange={(e) => setNewPersonForm((prev) => ({ ...prev, person_job_title: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</label>
                              <input
                                value={String(newPersonForm.person_email ?? "")}
                                onChange={(e) => setNewPersonForm((prev) => ({ ...prev, person_email: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Telephone</label>
                              <input
                                value={String(newPersonForm.person_telephone ?? "")}
                                onChange={(e) => setNewPersonForm((prev) => ({ ...prev, person_telephone: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Internal / External</label>
                            <select
                              value={String(stakeholderForm.stakeholder_internal_external ?? "EXTERNAL")}
                              onChange={(e) => setStakeholderForm((prev) => ({ ...prev, stakeholder_internal_external: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                            >
                              <option value="INTERNAL">INTERNAL</option>
                              <option value="EXTERNAL">EXTERNAL</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Attitude</label>
                            <select
                              value={String(stakeholderForm.stakeholder_attitude_towards ?? "Neutral")}
                              onChange={(e) => setStakeholderForm((prev) => ({ ...prev, stakeholder_attitude_towards: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                            >
                              {STAKEHOLDER_ATTITUDES.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Power</label>
                            <select
                              value={String(stakeholderForm.stakeholder_power_in_the_company ?? 3)}
                              onChange={(e) => setStakeholderForm((prev) => ({ ...prev, stakeholder_power_in_the_company: Number(e.target.value) }))}
                              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                            >
                              {STAKEHOLDER_LEVELS.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Interest</label>
                            <select
                              value={String(stakeholderForm.stakeholder_interest_level ?? 3)}
                              onChange={(e) => setStakeholderForm((prev) => ({ ...prev, stakeholder_interest_level: Number(e.target.value) }))}
                              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                            >
                              {STAKEHOLDER_LEVELS.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={Number(stakeholderForm.stakeholder_enabled ?? 1) === 1}
                                onChange={(e) => setStakeholderForm((prev) => ({ ...prev, stakeholder_enabled: e.target.checked ? 1 : 0 }))}
                              />
                              Active stakeholder
                            </label>
                          </div>
                        </div>

                        {[
                          ["stakeholder_essential_requirements", "Essential requirements"],
                          ["stakeholder_key_expectations", "Key expectations"],
                          ["stakeholder_impact_potential", "Impact potential"],
                          ["stakeholder_potential_reactions", "Potential reactions"],
                          ["stakeholder_strategy_to_gain", "Strategy to gain"],
                          ["stakeholder_remark", "Remarks"],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</label>
                            <textarea
                              rows={3}
                              value={String(stakeholderForm[key] ?? "")}
                              onChange={(e) => setStakeholderForm((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                            />
                          </div>
                        ))}

                        <div className="flex justify-end">
                          <button
                            onClick={() => void saveStakeholder()}
                            disabled={createPersonMut.isPending || createStakeholderMut.isPending || updateStakeholderMut.isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          >
                            <Save size={12} /> Save stakeholder
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Empty msg="Select a stakeholder or create a new one" />
                    )}
                  </div>
                </div>
              </div>
            </DetailPanel>
          )}

          {activeSection === "team" && (
            <DetailPanel
              title={`Account Team (${team.length})`}
              icon={<Users size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              <div className="space-y-4">
                {canEditTeam && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowTeamEdit((v) => !v)}
                      className={
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors " +
                        (showTeamEdit
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800")
                      }
                    >
                      <Edit2 size={12} /> Edit Mode
                    </button>
                  </div>
                )}

                {!showTeamEdit &&
                  (team.length === 0 ? (
                    <Empty msg="No account team assigned for this client" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {team.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{(m.accountteam_person_type ?? "?").slice(0, 3).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{m.accountteam_user_name ?? "—"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{m.accountteam_person_type ?? "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                {showTeamEdit && canEditTeam && (
                  <div className="space-y-4">
                    {allTeamRowsQ.isLoading ? (
                      <div className="flex justify-center py-4"><Spinner /></div>
                    ) : (
                      <>
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
                                  {isPending ? <div className="w-3.5 h-3.5 border border-blue-600 border-t-transparent rounded-full animate-spin" /> : <input type="checkbox" checked={isAlloc} onChange={(e) => handleToggleAlloc(row, e.target.checked)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>

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
                                  <select value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Select user…</option>
                                    {availableUsers.map((u) => <option key={u.person_id} value={u.person_name}>{u.person_name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Type</label>
                                  <select value={newMemberType} onChange={(e) => setNewMemberType(e.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="">Select type…</option>
                                    {allTypeOptions.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                                  </select>
                                </div>
                              </div>
                              {addWarn && <p className="text-xs text-amber-500">Please select a user and a type.</p>}
                              {insertMut.isError && <p className="text-xs text-red-500">Error adding member. Try again.</p>}
                              <div className="flex justify-end">
                                <button onClick={handleAddMember} disabled={insertMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
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

          {activeSection === "sa" && (
            <DetailPanel
              title={`Cisco Smart Accout License Usage — ${clientName}`}
              icon={<Package size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {saQ.isLoading ? <div className="flex flex-col items-center justify-center gap-3 py-10"><Spinner /><p className="text-xs text-gray-500 dark:text-gray-400">Loading Cisco SA usage data…</p></div> : saQ.isError ? <div className="py-8 text-center"><p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load Cisco SA usage data.</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{saQ.error instanceof Error ? saQ.error.message : "Unexpected error while loading Cisco SA usage."}</p><button onClick={() => void saQ.refetch()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"><Search size={12} /> Retry</button></div> : saRows.length === 0 ? <Empty msg="No Cisco SA data for this client" /> : <CiscoSAClientReport rows={saRows} isDark={document.documentElement.classList.contains("dark")} />}
            </DetailPanel>
          )}

          {activeSection === "ea" && (
            <DetailPanel
              title={`Cisco EA License Usage — ${clientName}`}
              icon={<Package size={16} />}
              onClose={() => {
                closeTaskDetail();
                setActiveSection(null);
              }}
            >
              {eaQ.isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : eaRows.length === 0 ? <Empty msg="No EA data for this client" /> : <CiscoEAClientReport rows={eaRows} isDark={document.documentElement.classList.contains("dark")} />}
            </DetailPanel>
          )}

          {detailTasks && canOpenTaskDetail && (
            <TaskDetailPanel tasks={detailTasks} initialIndex={detailIndex} onClose={() => setDetailTasks(null)} />
          )}
        </>
      )}
    </div>
  );
}
