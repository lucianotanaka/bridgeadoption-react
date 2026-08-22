/**
 * ProjectsPage — Projects Module
 * Full migration from MS Access PROJECT form pattern.
 *
 * Layout (mirroring MS Access):
 *   - CUSTOMER single-select (searchable) — only customers with projects
 *   - STATUS single-select — all statuses for the selected customer
 *   - ACCOUNT TEAM panel — all account team members for the customer
 *   - PROJECT DETAIL table (left): OV | PROJECT NAME | STATUS | START | END
 *   - PROJECT TEAM table (right): NAME | TYPE — shows team of the selected project
 *
 * Data flow:
 *   GET /api/projects/customers          → populate CUSTOMER dropdown
 *   GET /api/projects?customer_id=X      → all statuses for customer → PROJECT DETAIL + STATUS options
 *   GET /api/portfolio/account-team?customer_id=X → ACCOUNT TEAM panel
 *   GET /api/projects/{id}/team          → PROJECT TEAM (on row click)
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, FolderOpen, X } from "lucide-react";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────
interface ProjectCustomer {
  project_customer_id: number;
  project_customer_name: string;
}

interface ProjectRow {
  project_id?: number | null;
  project_ov?: string | null;
  project_name?: string | null;
  project_status?: string | null;
  project_start_date?: string | null;
  project_end_date?: string | null;
  project_ov_name?: string | null;
  [k: string]: unknown;
}

interface TeamMember {
  projteam_id?: number | null;
  projteam_member_name?: string | null;
  projteam_level_name?: string | null;
  projteam_department_name?: string | null;
  projteam_technical_lead?: number | null;
  projteam_allocation_start?: string | null;
  projteam_allocation_end?: string | null;
  [k: string]: unknown;
}

interface AccountTeamMember {
  accountteam_person_type?: string | null;
  accountteam_person_name?: string | null;
  [k: string]: unknown;
}

// ─── CSS helpers ──────────────────────────────────────────
const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inputCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const srchCls = "w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";

const Spin = () => <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

// ─── Status badge ─────────────────────────────────────────
function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const s = status.toLowerCase();
  let cls = "inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ";
  if (s.includes("progress") || s.includes("started")) cls += "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  else if (s.includes("business") || s.includes("model")) cls += "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
  else if (s.includes("unidentified")) cls += "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  else if (s.includes("closed") || s.includes("cancel")) cls += "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  else if (s.includes("complete") || s.includes("done")) cls += "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  else cls += "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
  return <span className={cls}>{status}</span>;
}

// ─── Customer searchable single-select ───────────────────
function CustomerSelect({
  customers, value, onChange, loading,
}: {
  customers: ProjectCustomer[];
  value: ProjectCustomer | null;
  onChange: (v: ProjectCustomer | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => q.trim() ? customers.filter(c => c.project_customer_name.toLowerCase().includes(q.toLowerCase())) : customers,
    [customers, q]
  );
  return (
    <div className="relative flex-1 min-w-[280px] max-w-md">
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
        {/* label text is passed from parent via useTranslation */}
        Customer
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={() => { setOpen(o => !o); setQ(""); }}
        className={`${inputCls} text-left flex items-center justify-between gap-1 disabled:opacity-40`}
      >
        <span className={`truncate ${value ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
          {loading ? "Loading customers…" : value ? value.project_customer_name : "Select a customer..."}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span onClick={e => { e.stopPropagation(); onChange(null); }}
              className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]">✕</span>
          )}
          <span className="text-gray-400 text-[10px]">▾</span>
        </div>
      </button>
      {open && !loading && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setQ(""); }} />
          <div className="absolute top-full mt-1 z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: 320 }}>
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search…" onClick={e => e.stopPropagation()} className={srchCls} />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
              {filtered.map(c => (
                <button key={c.project_customer_id} type="button"
                  onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value?.project_customer_id === c.project_customer_id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {c.project_customer_name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function ProjectsPage() {
  const { t } = useTranslation();

  // ─── State ────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<ProjectCustomer | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // ─── Load customer list (all statuses) ───────────────
  const customersQ = useQuery({
    queryKey: ["project-customers"],
    queryFn: () => apiClient.get<ProjectCustomer[]>("/projects/customers").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // ─── Load projects for selected customer (all statuses) ─
  const projectsQ = useQuery({
    queryKey: ["projects-by-customer", selectedCustomer?.project_customer_id],
    queryFn: () => apiClient
      .get<ProjectRow[]>("/projects", { params: { customer_id: selectedCustomer!.project_customer_id } })
      .then(r => r.data),
    enabled: !!selectedCustomer,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Load account team for selected customer ──────────
  // Uses /projects/account-team which filters accountteam_allocated != 0
  // (same logic as AccountTeamPage matrix) — /portfolio/account-team doesn't apply this filter
  const accountTeamQ = useQuery({
    queryKey: ["account-team-for-projects", selectedCustomer?.project_customer_id],
    queryFn: () => apiClient
      .get<AccountTeamMember[]>("/projects/account-team", { params: { customer_id: selectedCustomer!.project_customer_id } })
      .then(r => r.data),
    enabled: !!selectedCustomer,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Load project team for selected project ───────────
  const teamQ = useQuery({
    queryKey: ["project-team", selectedProjectId],
    queryFn: () => apiClient
      .get<TeamMember[]>(`/projects/${selectedProjectId}/team`)
      .then(r => r.data),
    enabled: selectedProjectId !== null,
    staleTime: 5 * 60 * 1000,
  });

  const customers = customersQ.data ?? [];
  const allProjects = projectsQ.data ?? [];
  const accountTeam = accountTeamQ.data ?? [];
  const projectTeam = teamQ.data ?? [];

  // ─── Status options derived from customer's projects ──
  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of allProjects) {
      if (p.project_status) s.add(p.project_status);
    }
    return [...s].sort();
  }, [allProjects]);

  // ─── Filter projects by status ────────────────────────
  const filteredProjects = useMemo(() => {
    if (!selectedStatus) return allProjects;
    return allProjects.filter(p => p.project_status === selectedStatus);
  }, [allProjects, selectedStatus]);

  // ─── Paginate PROJECT DETAIL ─────────────────────────
  useMemo(() => { setPage(1); }, [filteredProjects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const paginated = useMemo(
    () => filteredProjects.slice((page - 1) * pageSize, page * pageSize),
    [filteredProjects, page, pageSize]
  );

  // ─── Has active filters ───────────────────────────────
  const hasFilters = selectedCustomer !== null || selectedStatus !== "";

  // ─── Reset state on customer change ──────────────────
  function handleCustomerChange(c: ProjectCustomer | null) {
    setSelectedCustomer(c);
    setSelectedStatus("");
    setSelectedProjectId(null);
    setPage(1);
  }

  function clearFilters() {
    setSelectedCustomer(null);
    setSelectedStatus("");
    setSelectedProjectId(null);
    setPage(1);
  }

  // ─── Reset project team on row click ──────────────────
  function handleProjectClick(projectId: number) {
    setSelectedProjectId(prev => (prev === projectId ? null : projectId));
  }

  // ─── Account team helpers ─────────────────────────────
  function getPersonName(member: AccountTeamMember): string {
    for (const k of Object.keys(member)) {
      if (k.includes("person_name") || k.includes("member_name") || k.includes("user_name")) {
        const v = member[k];
        if (v && typeof v === "string") return v;
      }
    }
    return "—";
  }

  function getPersonType(member: AccountTeamMember): string {
    const v = member.accountteam_person_type ?? (member as Record<string, unknown>).accountteam_user_type;
    return v ? String(v) : "—";
  }

  // ─── Format date ──────────────────────────────────────
  function fmtDate(d: string | null | undefined): string {
    if (!d) return "—";
    return String(d).slice(0, 10);
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("projects.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("projects.subtitle")}</p>
        </div>
      </div>

      {/* ── Filters: CUSTOMER + STATUS ── */}
      <div className={card}>
        <div className="flex flex-wrap gap-6 items-end">
          {/* CUSTOMER */}
          <CustomerSelect
            customers={customers}
            value={selectedCustomer}
            onChange={handleCustomerChange}
            loading={customersQ.isLoading}
          />

          {/* STATUS */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("common.status")}
            </label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setSelectedProjectId(null); }}
              disabled={!selectedCustomer || statusOptions.length === 0}
              className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{t("projects.allStatuses")}</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* CLEAR FILTERS */}
          {hasFilters && (
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <X size={12} /> {t("common.clearFilters")}
              </button>
            </div>
          )}
        </div>
        {customersQ.isError && (
          <p className="text-xs text-red-500 mt-2">{t("errors.generic")}</p>
        )}
      </div>

      {/* ── Account Team ── (only when customer selected) */}
      {selectedCustomer && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-blue-500" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {t("projects.accountTeamTitle")} — {selectedCustomer.project_customer_name}
            </p>
            {accountTeamQ.isLoading && <Spin />}
          </div>
          {!accountTeamQ.isLoading && accountTeam.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("projects.noAccountTeam")}</p>
          )}
          {accountTeam.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {accountTeam.map((m, i) => {
                const name = getPersonName(m);
                const type = getPersonType(m);
                return (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">{type}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Placeholder before customer selection ── */}
      {!selectedCustomer && (
        <div className={card}>
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 dark:text-gray-500">
            <FolderOpen size={36} className="opacity-40" />
            <p className="text-sm">{t("projects.selectCustomerHint")}</p>
          </div>
        </div>
      )}

      {/* ── Loading projects ── */}
      {selectedCustomer && projectsQ.isLoading && (
        <div className={`${card} flex items-center justify-center gap-3 py-10`}>
          <Spin />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</span>
        </div>
      )}

      {/* ── PROJECT DETAIL + PROJECT TEAM side by side ── */}
      {selectedCustomer && !projectsQ.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">

          {/* ── PROJECT DETAIL ── */}
          <div className={card}>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen size={14} className="text-blue-500" />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("projects.projectDetail")}
                {filteredProjects.length > 0 && (
                  <span className="ml-2 font-normal text-gray-400">({filteredProjects.length})</span>
                )}
              </p>
            </div>
            {projectsQ.isError && (
              <p className="text-xs text-red-500 py-4">{t("errors.generic")}</p>
            )}
            {!projectsQ.isError && filteredProjects.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                {selectedStatus
                  ? t("projects.noProjectsWithStatus", { status: selectedStatus })
                  : t("projects.noProjects")}
              </p>
            )}
            {filteredProjects.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colOv")}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colProjectName")}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("common.status")}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colStart")}</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colEnd")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">{t("common.noData")}</td></tr>
                      )}
                      {paginated.map((proj, i) => {
                        const pid = Number(proj.project_id ?? 0);
                        const isSelected = selectedProjectId === pid;
                        return (
                          <tr
                            key={i}
                            onClick={() => pid > 0 ? handleProjectClick(pid) : undefined}
                            className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${pid > 0 ? "cursor-pointer" : ""} ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                          >
                            <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-[11px]">
                              {proj.project_ov ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[220px]" title={proj.project_name ?? ""}>
                              <span className="block truncate">{proj.project_name ?? "—"}</span>
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <StatusBadge status={proj.project_status} />
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {fmtDate(proj.project_start_date)}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {fmtDate(proj.project_end_date)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 mt-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.showing")} <strong>{filteredProjects.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong>–<strong>{Math.min(page * pageSize, filteredProjects.length)}</strong> {t("common.of")} <strong>{filteredProjects.length}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{t("common.perPage")}</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                      >
                        {[5, 10, 25, 50].map(ps => <option key={ps} value={ps}>{ps}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
                      const btnBase = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
                      const btnA = `${btnBase} bg-blue-600 text-white`;
                      const btnI = `${btnBase} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed`;
                      const ws = 5; let start = Math.max(1, page - 2);
                      const end = Math.min(totalPages, start + ws - 1);
                      if (end - start < ws - 1) start = Math.max(1, end - ws + 1);
                      const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                      return (<>
                        <button onClick={() => setPage(1)} disabled={page === 1} className={btnI}>«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={btnI}>‹</button>
                        {start > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
                        {pages.map(p => <button key={p} onClick={() => setPage(p)} className={p === page ? btnA : btnI}>{p}</button>)}
                        {end < totalPages && <span className="text-xs text-gray-400 px-1">…</span>}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className={btnI}>›</button>
                        <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className={btnI}>»</button>
                      </>);
                    })()}
                  </div>
                </div>
              </>
            )}
            {filteredProjects.length > 0 && selectedProjectId === null && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                {t("projects.clickRowHint")}
              </p>
            )}
          </div>

          {/* ── PROJECT TEAM ── */}
          <div className={card}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-green-500" />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("projects.projectTeam")}
              </p>
              {teamQ.isLoading && <Spin />}
            </div>

            {selectedProjectId === null && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500">
                <Users size={28} className="opacity-30" />
                <p className="text-xs text-center">{t("projects.selectProjectHint")}</p>
              </div>
            )}

            {selectedProjectId !== null && teamQ.isLoading && (
              <div className="flex justify-center py-10"><Spin /></div>
            )}

            {selectedProjectId !== null && teamQ.isError && (
              <p className="text-xs text-red-500 text-center py-6">{t("errors.generic")}</p>
            )}

            {selectedProjectId !== null && !teamQ.isLoading && !teamQ.isError && projectTeam.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                {t("projects.noTeamMembers")}
              </p>
            )}

            {selectedProjectId !== null && !teamQ.isLoading && projectTeam.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{t("projects.colName")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colType")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colDept")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colStart")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{t("projects.colEnd")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTeam.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">
                          {m.projteam_member_name ?? "—"}
                          {m.projteam_technical_lead === 1 && (
                            <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-bold uppercase">Lead</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {m.projteam_level_name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {m.projteam_department_name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(m.projteam_allocation_start)}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(m.projteam_allocation_end)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
