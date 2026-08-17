/**
 * AccountTeamPage — Portfolio: Account Team
 * Migração completa do Streamlit account_team.py para React.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, Download, Plus, Edit2, SlidersHorizontal } from "lucide-react";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";

// ─── Types ───────────────────────────────────────────────
interface AccountTeamRow {
  accountteam_id: number;
  accountteam_company_id: number;
  accountteam_company_name: string;
  /** person_name returned by vwAccountTeam (join tbPerson) */
  accountteam_user_name: string;
  /** FK → tbPerson.person_id */
  accountteam_person_id?: number | null;
  accountteam_person_type: string;
  accountteam_allocated: number | null;
  accountteam_allocation_start_date: string | null;
  accountteam_allocation_end_date: string | null;
  accountteam_changed_in: string | null;
  accountteam_changed_by: number | null;
  cisco_domain?: string | null;
}
interface NttPerson { person_id: number; person_name: string; person_email?: string | null; person_job_title?: string | null; }
interface MatrixRow {
  "#": number; company: string; companyId: number; ciscoDomain: string;
  [userType: string]: string | number;
}

// ─── CSS ─────────────────────────────────────────────────
const cardCls = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inputCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const selectCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const Spinner = () => <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

// ─── Matrix helpers ───────────────────────────────────────
const PREFERRED_COLS = ["AM", "CDM", "CSM", "DIR"];
const FIXED_KEYS = new Set(["#", "company", "companyId", "ciscoDomain"]);

function buildMatrix(rows: AccountTeamRow[]): MatrixRow[] {
  const map: Record<string, { companyId: number; types: Record<string, Set<string>>; domain: string }> = {};
  for (const r of rows) {
    const n = r.accountteam_company_name ?? "";
    if (!map[n]) map[n] = { companyId: r.accountteam_company_id, types: {}, domain: r.cisco_domain ?? "" };
    else if (r.cisco_domain && !map[n].domain) map[n].domain = r.cisco_domain;
    const t = r.accountteam_person_type ?? "OTHER";
    if (!map[n].types[t]) map[n].types[t] = new Set();
    if (r.accountteam_user_name) map[n].types[t].add(r.accountteam_user_name);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([company, d], idx) => {
    const row: MatrixRow = { "#": idx + 1, company, companyId: d.companyId, ciscoDomain: d.domain };
    for (const [type, names] of Object.entries(d.types)) row[type] = [...names].sort().join(", ");
    return row;
  });
}

function getDynCols(matrix: MatrixRow[]): string[] {
  const all = new Set<string>();
  for (const row of matrix) for (const k of Object.keys(row)) if (!FIXED_KEYS.has(k)) all.add(k);
  const out = PREFERRED_COLS.filter((c) => all.has(c));
  for (const c of [...all].sort()) if (!PREFERRED_COLS.includes(c)) out.push(c);
  return out;
}

function getUniq(matrix: MatrixRow[], col: string): string[] {
  const s = new Set<string>();
  for (const row of matrix) {
    const cell = String(row[col] ?? "");
    if (!cell) continue;
    for (const p of cell.split(",")) { const v = p.trim(); if (v) s.add(v); }
  }
  return [...s].sort();
}

function hasVal(cell: string | undefined, vals: string[]): boolean {
  if (!vals.length) return true;
  if (!cell) return false;
  const parts = cell.split(",").map((s) => s.trim()).filter(Boolean);
  return vals.some((v) => parts.includes(v));
}

// colKey → label human-readable
function colLabel(key: string, clientLabel: string): string {
  if (key === "#") return "#";
  if (key === "company") return clientLabel;
  if (key === "ciscoDomain") return "Cisco Domain";
  return key;
}

function exportTSV(matrix: MatrixRow[], visibleExtra: string[], clientLabel: string) {
  // visibleExtra = toggleable columns currently visible (ciscoDomain + dynCols filtered)
  const headers = ["#", clientLabel, ...visibleExtra.map((c) => colLabel(c, clientLabel))];
  const tsv = [headers.join("\t"), ...matrix.map((r) =>
    [r["#"], r.company, ...visibleExtra.map((c) => {
      if (c === "ciscoDomain") return r.ciscoDomain ?? "";
      return r[c] ?? "";
    })].join("\t")
  )].join("\n");
  const blob = new Blob([tsv], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_account_team.tsv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MultiSelect ──────────────────────────────────────────
function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${inputCls} text-left flex items-center justify-between gap-1 min-w-[130px]`}>
        <span className="truncate">{value.length === 0 ? "All" : value.length === 1 ? value[0] : `${value.length} sel.`}</span>
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 z-30 w-max min-w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
            {options.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No options</p>}
            {value.length > 0 && <button type="button" onClick={() => { onChange([]); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-gray-100 dark:border-gray-700">Clear all</button>}
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} className="rounded" />{opt}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pagination bar ───────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface PaginationBarProps {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
}

function PaginationBar({ total, page, pageSize, onPage, onPageSize }: PaginationBarProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page window: up to 5 pages centred on current
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btnBase = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const btnActive = `${btnBase} bg-blue-600 text-white`;
  const btnInactive = `${btnBase} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      {/* Left: showing info + per-page */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("common.showing")} <strong>{from}</strong>–<strong>{to}</strong> {t("common.of")} <strong>{total}</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{t("common.perPage")}</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((ps) => <option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnInactive} title="First">«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={btnInactive} title="Previous">‹</button>
        {start > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
        {pages.map((p) => (
          <button key={p} onClick={() => onPage(p)} className={p === page ? btnActive : btnInactive}>{p}</button>
        ))}
        {end < totalPages && <span className="text-xs text-gray-400 px-1">…</span>}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={btnInactive} title="Next">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} className={btnInactive} title="Last">»</button>
      </div>
    </div>
  );
}

// ─── ColumnToggle ─────────────────────────────────────────
function ColumnToggle({ allCols, hiddenCols, onToggle, clientLabel }: {
  allCols: string[]; hiddenCols: Set<string>; onToggle: (col: string) => void; clientLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const hiddenCount = allCols.filter((c) => hiddenCols.has(c)).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
          hiddenCount > 0
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
        title="Show/hide columns"
      >
        <SlidersHorizontal size={13} />
        Columns{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
            <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 mb-1">
              Toggle Columns
            </p>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => { allCols.forEach((c) => { if (hiddenCols.has(c)) onToggle(c); }); }}
                className="w-full text-left px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 mb-1"
              >
                Show all
              </button>
            )}
            {allCols.map((col) => (
              <label key={col} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenCols.has(col)}
                  onChange={() => onToggle(col)}
                  className="rounded accent-blue-600"
                />
                {colLabel(col, clientLabel)}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MatrixTable ──────────────────────────────────────────
function MatrixTable({ rows, visibleExtra, clientLabel }: { rows: MatrixRow[]; visibleExtra: string[]; clientLabel: string }) {
  const { t } = useTranslation();
  // Fixed columns always visible: # and company; then user-controlled extras
  const cols = ["#", "company", ...visibleExtra];
  const label = (c: string) => c === "#" ? "#" : c === "company" ? clientLabel : c === "ciscoDomain" ? "Cisco Domain" : c;
  if (rows.length === 0) return <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">{t("common.noData")}</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {cols.map((c) => <th key={c} className={`px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap ${c === "#" ? "w-10" : c === "company" ? "min-w-[240px]" : "min-w-[160px]"}`}>{label(c)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.companyId}-${i}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {cols.map((c) => {
                const v = c === "ciscoDomain" ? row.ciscoDomain : row[c];
                const d = v === undefined || v === null || v === "" ? null : String(v);
                return (
                  <td key={c} className={`px-3 py-2 text-gray-700 dark:text-gray-300 align-top ${c === "company" ? "font-medium" : ""}`}>
                    {c === "#" ? <span className="text-gray-400">{d}</span> : d ? <span className="whitespace-pre-wrap break-words">{d}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── EditPanel ────────────────────────────────────────────
function EditPanel({ allRows, filterCompanies, filterDir, filterAm, filterCdm, filterCsm, userTypeOptions, onRefresh }: {
  allRows: AccountTeamRow[]; filterCompanies: string[]; filterDir: string[]; filterAm: string[]; filterCdm: string[]; filterCsm: string[]; userTypeOptions: string[]; onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  const usersQ = useQuery({
    queryKey: ["account-team-ntt-users"],
    queryFn: () => apiClient.get<NttPerson[]>("/portfolio/account-team/users").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.put(`/portfolio/account-team/${id}`, data).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["account-team-matrix"] }); void qc.invalidateQueries({ queryKey: ["account-team-rows"] }); onRefresh(); },
  });

  const insertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/portfolio/account-team", data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-team-matrix"] });
      void qc.invalidateQueries({ queryKey: ["account-team-rows"] });
      setNewUser(""); setNewType(""); setWarn(false); onRefresh();
    },
  });

  // Filter companies for navigation (mirrors apply_account_team_row_filters)
  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (filterCompanies.length) rows = rows.filter((r) => filterCompanies.includes(r.accountteam_company_name));
    const pf = [...filterDir, ...filterAm, ...filterCdm, ...filterCsm];
    if (pf.length) rows = rows.filter((r) => pf.includes(r.accountteam_user_name));
    return rows;
  }, [allRows, filterCompanies, filterDir, filterAm, filterCdm, filterCsm]);

  const companies = useMemo(() => [...new Set(filteredRows.map((r) => r.accountteam_company_name))].sort(), [filteredRows]);

  const [navIdx, setNavIdx] = useState(0);

  // Reset navigation index when the companies list changes (mirrors Streamlit st.rerun() behavior)
  const companiesKey = companies.join("|");
  useMemo(() => { setNavIdx(0); }, [companiesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeIdx = Math.min(navIdx, Math.max(companies.length - 1, 0));
  const currentCompany = companies[safeIdx] ?? "";
  const companyRows = useMemo(() => allRows.filter((r) => r.accountteam_company_name === currentCompany), [allRows, currentCompany]);
  const currentCompanyId = companyRows.length > 0 ? companyRows[0].accountteam_company_id : 0;

  const [newUser, setNewUser] = useState("");
  const [newType, setNewType] = useState("");
  const [warn, setWarn] = useState(false);

  // Optimistic state: immediately reflect checkbox changes in the UI
  // before the server responds and the query refetches.
  // Key: accountteam_id → true/false (new desired allocated state)
  const [optimisticAlloc, setOptimisticAlloc] = useState<Record<number, boolean>>({});

  // Persons already linked to this company (by accountteam_person_id)
  const existingPersonIds = useMemo(
    () => new Set(companyRows.map((r) => r.accountteam_person_id).filter((id): id is number => id != null)),
    [companyRows]
  );

  // Available NTT persons for add form (not already linked to this company)
  const availableUsers = useMemo(() => {
    const all = usersQ.data ?? [];
    return all
      .filter((u) => !existingPersonIds.has(u.person_id))
      .sort((a, b) => a.person_name.localeCompare(b.person_name));
  }, [usersQ.data, existingPersonIds]);

  const handleToggleAllocated = (row: AccountTeamRow, checked: boolean) => {
    // Optimistic update: show new state immediately
    setOptimisticAlloc((prev) => ({ ...prev, [row.accountteam_id]: checked }));

    const data: Record<string, unknown> = {
      accountteam_allocated: checked ? 1 : 0,
      accountteam_changed_in: today,
      accountteam_changed_by: userId,
    };
    if (!checked) data.accountteam_allocation_end_date = today;

    updateMut.mutate(
      { id: row.accountteam_id, data },
      {
        onSuccess: () => {
          // Remove optimistic entry — the refetch will provide the real value
          setOptimisticAlloc((prev) => { const n = { ...prev }; delete n[row.accountteam_id]; return n; });
        },
        onError: () => {
          // Revert optimistic entry on failure
          setOptimisticAlloc((prev) => { const n = { ...prev }; delete n[row.accountteam_id]; return n; });
        },
      }
    );
  };

  const handleAddMember = () => {
    if (!newUser || !newType) { setWarn(true); return; }
    setWarn(false);
    const selUser = availableUsers.find((u) => u.person_name === newUser);
    if (!selUser) return;
    insertMut.mutate({
      accountteam_company_id: currentCompanyId,
      accountteam_person_id: selUser.person_id,
      accountteam_person_type: newType,
      accountteam_allocation_start_date: today,
      accountteam_allocated: 1,
      accountteam_changed_in: today,
      accountteam_changed_by: userId,
    });
  };

  if (companies.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Company navigator */}
      <div className={`${cardCls} space-y-3`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setNavIdx(Math.max(safeIdx - 1, 0))} disabled={safeIdx === 0 || companies.length <= 1}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{currentCompany}</p>
            <p className="text-[10px] text-gray-400">{safeIdx + 1} / {companies.length}</p>
          </div>
          <button onClick={() => setNavIdx(Math.min(safeIdx + 1, companies.length - 1))} disabled={safeIdx >= companies.length - 1 || companies.length <= 1}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Member list with allocated toggle */}
        <div className={`${cardCls} !p-3 space-y-1`}>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Edit2 size={11} />{t("portfolio.accountTeam.titleEdit")}</p>
          <div className="grid grid-cols-[3fr_2fr_1fr] gap-x-2 pb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">{t("portfolio.accountTeam.member")}</span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">{t("portfolio.accountTeam.type")}</span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">{t("portfolio.accountTeam.allocated")}</span>
          </div>
          {companyRows.length === 0 && <p className="text-xs text-gray-400 py-2">{t("common.noData")}</p>}
          {companyRows.map((row) => {
            // Use optimistic value if available, otherwise use the server value
            const isAlloc = row.accountteam_id in optimisticAlloc
              ? optimisticAlloc[row.accountteam_id]
              : (row.accountteam_allocated ?? 0) !== 0;
            const isPending = updateMut.isPending && (updateMut.variables as { id: number })?.id === row.accountteam_id;
            return (
              <div key={row.accountteam_id} className="grid grid-cols-[3fr_2fr_1fr] gap-x-2 items-center py-1 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{row.accountteam_user_name}</span>
                <span className="text-xs text-gray-500">{row.accountteam_person_type}</span>
                <div className="flex items-center gap-1">
                  {isPending ? <Spinner /> : (
                    <input type="checkbox" checked={isAlloc} onChange={(e) => handleToggleAllocated(row, e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                  )}
                </div>
              </div>
            );
          })}
          {updateMut.isError && <p className="text-xs text-red-500 mt-1">{t("errors.generic")}</p>}
        </div>

        {/* Add member form */}
        <div className={`${cardCls} !p-3 space-y-2`}>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Plus size={11} />{t("portfolio.accountTeam.titleAdd")}</p>
          {usersQ.isLoading ? (
            <div className="flex justify-center py-2"><Spinner /></div>
          ) : availableUsers.length === 0 ? (
            <p className="text-xs text-gray-400">{t("portfolio.accountTeam.info1")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{t("portfolio.accountTeam.member")}</label>
                  <select value={newUser} onChange={(e) => setNewUser(e.target.value)} className={selectCls + " w-full"}>
                    <option value="">{t("common.selectOption")}</option>
                    {availableUsers.map((u) => <option key={u.person_id} value={u.person_name}>{u.person_name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{t("portfolio.accountTeam.type")}</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className={selectCls + " w-full"}>
                    <option value="">{t("common.selectOption")}</option>
                    {userTypeOptions.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
              </div>
              {warn && <p className="text-xs text-amber-500">{t("portfolio.accountTeam.warning1")}</p>}
              <div className="flex justify-end">
                <button onClick={handleAddMember} disabled={insertMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                  {insertMut.isPending ? <Spinner /> : <Plus size={12} />}{t("portfolio.accountTeam.btnSave")}
                </button>
              </div>
              {insertMut.isError && <p className="text-xs text-red-500">{t("errors.generic")}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function AccountTeamPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;
  const canEdit = isAdmin || (() => {
    const role = (user?.role ?? "").toUpperCase();
    return role.includes("ADMIN") || role.includes("MANAGER") || role.includes("FULL");
  })();

  const clientLabel = t("portfolio.accountTeam.client");

  // ─── Queries ───────────────────────────────────────────
  const matrixQ = useQuery({
    queryKey: ["account-team-matrix"],
    queryFn: () => apiClient.get<AccountTeamRow[]>("/portfolio/account-team/matrix").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const rowsQ = useQuery({
    queryKey: ["account-team-rows"],
    queryFn: () => apiClient.get<AccountTeamRow[]>("/portfolio/account-team/rows").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: canEdit,
  });

  const matrixRows = matrixQ.data ?? [];
  const allRows = rowsQ.data ?? [];

  // ─── Build matrix ──────────────────────────────────────
  const matrix = useMemo(() => buildMatrix(matrixRows), [matrixRows]);
  const dynCols = useMemo(() => getDynCols(matrix), [matrix]);

  // ─── Distinct values for filters ───────────────────────
  const companyOptions = useMemo(() => matrix.map((r) => r.company).sort(), [matrix]);
  const amOptions = useMemo(() => getUniq(matrix, "AM"), [matrix]);
  const cdmOptions = useMemo(() => getUniq(matrix, "CDM"), [matrix]);
  const csmOptions = useMemo(() => getUniq(matrix, "CSM"), [matrix]);
  const dirOptions = useMemo(() => getUniq(matrix, "DIR"), [matrix]);
  const userTypeOptions = useMemo(() => [...new Set(allRows.map((r) => r.accountteam_person_type).filter(Boolean))].sort(), [allRows]);

  // ─── Filter state ──────────────────────────────────────
  const [fCompany, setFCompany] = useState<string[]>([]);
  const [fDir, setFDir] = useState<string[]>([]);
  const [fAm, setFAm] = useState<string[]>([]);
  const [fCdm, setFCdm] = useState<string[]>([]);
  const [fCsm, setFCsm] = useState<string[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  // ─── Column visibility state ───────────────────────────
  // allToggleable: Cisco Domain + all dynamic user-type cols (fixed cols # and Client always visible)
  const allToggleable = useMemo(() => ["ciscoDomain", ...dynCols], [dynCols]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const toggleCol = (col: string) =>
    setHiddenCols((prev) => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  // Only keep hidden cols that are still in allToggleable (handles dynCols changing)
  const visibleExtra = useMemo(
    () => allToggleable.filter((c) => !hiddenCols.has(c)),
    [allToggleable, hiddenCols]
  );

  // ─── Pagination state ──────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ─── Apply filters ─────────────────────────────────────
  const filtered = useMemo(() => {
    const result = matrix.filter((row) => {
      if (fCompany.length && !fCompany.includes(row.company)) return false;
      if (!hasVal(row["DIR"] as string | undefined, fDir)) return false;
      if (!hasVal(row["AM"] as string | undefined, fAm)) return false;
      if (!hasVal(row["CDM"] as string | undefined, fCdm)) return false;
      if (!hasVal(row["CSM"] as string | undefined, fCsm)) return false;
      return true;
    }).map((row, idx) => ({ ...row, "#": idx + 1 }));
    // Reset to page 1 when filters change (can't call setState in useMemo, done via effect below)
    return result;
  }, [matrix, fCompany, fDir, fAm, fCdm, fCsm]);

  // Reset to page 1 when filtered result set changes
  useMemo(() => { setPage(1); }, [filtered.length, fCompany.join(), fDir.join(), fAm.join(), fCdm.join(), fCsm.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paginated slice
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const refetchAll = () => { void matrixQ.refetch(); if (canEdit) void rowsQ.refetch(); };
  const isLoading = matrixQ.isLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("portfolio.accountTeam.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("portfolio.accountTeam.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button onClick={() => setShowEdit((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${showEdit ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
              <Edit2 size={13} /> {t("portfolio.accountTeam.editMode")}
            </button>
          )}
          <ColumnToggle
            allCols={allToggleable}
            hiddenCols={hiddenCols}
            onToggle={toggleCol}
            clientLabel={clientLabel}
          />
          <button onClick={() => exportTSV(filtered, visibleExtra, clientLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={13} /> {t("common.export")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-3 items-end">
          <MultiSelect label={clientLabel} options={companyOptions} value={fCompany} onChange={setFCompany} />
          <MultiSelect label="DIR" options={dirOptions} value={fDir} onChange={setFDir} />
          <MultiSelect label="AM" options={amOptions} value={fAm} onChange={setFAm} />
          <MultiSelect label="CDM" options={cdmOptions} value={fCdm} onChange={setFCdm} />
          <MultiSelect label="CSM" options={csmOptions} value={fCsm} onChange={setFCsm} />
          {(fCompany.length > 0 || fDir.length > 0 || fAm.length > 0 || fCdm.length > 0 || fCsm.length > 0) && (
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => { setFCompany([]); setFDir([]); setFAm([]); setFCdm([]); setFCsm([]); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <X size={12} /> {t("common.clearFilters")}
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className={`${cardCls} flex justify-center py-8`}><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

      {!isLoading && (
        <div className={cardCls}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portfolio.accountTeam.recordsFound", { count: filtered.length })}
          </p>
          <MatrixTable rows={paginated} visibleExtra={visibleExtra} clientLabel={clientLabel} />
          <PaginationBar
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </div>
      )}

      {canEdit && !isLoading && rowsQ.data && showEdit && (
        <EditPanel
          allRows={allRows}
          filterCompanies={fCompany}
          filterDir={fDir}
          filterAm={fAm}
          filterCdm={fCdm}
          filterCsm={fCsm}
          userTypeOptions={userTypeOptions}
          onRefresh={refetchAll}
        />
      )}
    </div>
  );
}
