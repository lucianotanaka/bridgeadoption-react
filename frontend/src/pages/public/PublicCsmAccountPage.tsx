import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown as ChevronDownIcon, X } from "lucide-react";
import apiClient from "@/api/client";

interface Row { CSM?: string; CLIENT?: string; AM?: string; EA?: string; TYPE?: string; [key: string]: unknown; }

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
type SortDir = "asc" | "desc" | null;
type SortCol = "CSM" | "CLIENT" | "AM" | "EA" | "TYPE" | null;

// ─── EA display mapping ───────────────────────────────────
const EA_DISPLAY: Record<string, string> = { Y: "Yes", N: "No" };
const EA_DISPLAY_REVERSE: Record<string, string> = { Yes: "Y", No: "N" };

// ─── MultiSelect component ────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  displayFn,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  displayFn?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const display = displayFn ?? ((v: string) => v);

  const filtered = options.filter(o => display(o).toLowerCase().includes(search.toLowerCase()));

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(s => s !== val));
    else onChange([...selected, val]);
  };

  return (
    <div className="flex-1 min-w-[120px] relative">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full text-left text-xs px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors focus:outline-none min-h-[34px]">
        {selected.length === 0
          ? <span className="text-gray-400 dark:text-gray-500">All</span>
          : <span className="flex flex-wrap gap-1">
              {selected.slice(0, 2).map(s => (
                <span key={s} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                  {display(s)}
                </span>
              ))}
              {selected.length > 2 && <span className="text-gray-400 text-[10px]">+{selected.length - 2}</span>}
            </span>
        }
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none" />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">No options</p> :
              filtered.map(o => (
                <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{display(o)}</span>
                </label>
              ))
            }
          </div>
          <div className="p-1 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button onClick={() => setOpen(false)} className="text-xs text-gray-500 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function PublicCsmAccountPage() {
  const [fCSM, setFCSM] = useState<string[]>([]);
  const [fClient, setFClient] = useState<string[]>([]);
  const [fAM, setFAM] = useState<string[]>([]);
  const [fEA, setFEA] = useState<string[]>([]);   // stores raw values "Y" / "N"
  const [fType, setFType] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const q = useQuery({ queryKey: ["public-csm"], queryFn: () => apiClient.get<Row[]>("/public/csm-account").then(r => r.data), staleTime: 5 * 60 * 1000 });
  const rows = q.data ?? [];

  const hasFilters = fCSM.length > 0 || fClient.length > 0 || fAM.length > 0 || fEA.length > 0 || fType.length > 0;

  const clearAll = () => {
    setFCSM([]); setFClient([]); setFAM([]); setFEA([]); setFType([]);
    setPage(1);
  };

  // Cascading filter options
  const csms = useMemo(() => [...new Set(rows.map(r => r.CSM ?? ""))].filter(Boolean).sort(), [rows]);
  const clients = useMemo(() => [...new Set(rows.filter(r => !fCSM.length || fCSM.includes(r.CSM ?? "")).map(r => r.CLIENT ?? ""))].filter(Boolean).sort(), [rows, fCSM]);
  const ams = useMemo(() => [...new Set(rows.filter(r => (!fCSM.length || fCSM.includes(r.CSM ?? "")) && (!fClient.length || fClient.includes(r.CLIENT ?? ""))).map(r => r.AM ?? ""))].filter(Boolean).sort(), [rows, fCSM, fClient]);
  const eas = useMemo(() => [...new Set(rows.map(r => r.EA ?? ""))].filter(Boolean).sort(), [rows]);
  const types = useMemo(() => [...new Set(rows.map(r => r.TYPE ?? ""))].filter(Boolean).sort(), [rows]);

  const filtered = useMemo(() => {
    const base = rows.filter(r =>
      (!fCSM.length || fCSM.includes(r.CSM ?? "")) &&
      (!fClient.length || fClient.includes(r.CLIENT ?? "")) &&
      (!fAM.length || fAM.includes(r.AM ?? "")) &&
      (!fEA.length || fEA.includes(r.EA ?? "")) &&
      (!fType.length || fType.includes(r.TYPE ?? ""))
    );
    if (!sortCol || !sortDir) return base;
    return [...base].sort((a, b) => {
      const va = String(a[sortCol] ?? "").toLowerCase();
      const vb = String(b[sortCol] ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [rows, fCSM, fClient, fAM, fEA, fType, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const typeColor = (type?: string) => {
    const t = (type ?? "").toUpperCase();
    if (t.includes("HIGH")) return "text-red-600 dark:text-red-400 font-bold";
    if (t.includes("SCALE")) return "text-yellow-600 dark:text-yellow-400";
    if (t.includes("DIGITAL")) return "text-blue-600 dark:text-blue-400";
    if (t.includes("CUSTOMER")) return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortDir(null); setSortCol(null); }
    } else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <span className="inline-flex flex-col ml-1 opacity-30"><ChevronUp size={8} /><ChevronDownIcon size={8} /></span>;
    return sortDir === "asc" ? <ChevronUp size={10} className="ml-1 text-blue-500" /> : <ChevronDownIcon size={10} className="ml-1 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header — no Refresh button */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CSM Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customer Success Manager — Account Overview</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          <MultiSelect label="CSM" options={csms} selected={fCSM} onChange={v => { setFCSM(v); setFClient([]); setFAM([]); setPage(1); }} />
          <MultiSelect label="Client" options={clients} selected={fClient} onChange={v => { setFClient(v); setFAM([]); setPage(1); }} />
          <MultiSelect label="AM" options={ams} selected={fAM} onChange={v => { setFAM(v); setPage(1); }} />
          <MultiSelect label="EA" options={eas} selected={fEA} onChange={v => { setFEA(v); setPage(1); }}
            displayFn={v => EA_DISPLAY[v] ?? v} />
          <MultiSelect label="Type" options={types} selected={fType} onChange={v => { setFType(v); setPage(1); }} />
        </div>
        {/* Clear all filters — inline text link, visible only when filters are active */}
        {hasFilters && (
          <div className="mt-2 flex justify-end">
            <span onClick={clearAll}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer select-none transition-colors">
              <X size={11} /> Clear all filters
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {q.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{filtered.length} records</p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Per page:</label>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold w-8">#</th>
                    {(["CSM", "CLIENT", "AM", "EA", "TYPE"] as SortCol[]).map(col => (
                      <th key={col} onClick={() => handleSort(col)}
                        className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none transition-colors">
                        <span className="inline-flex items-center gap-0.5">
                          {col === "CLIENT" ? "Client" : col === "TYPE" ? "Type" : col}
                          <SortIcon col={col} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-1.5 px-3 text-gray-400 tabular-nums">{(safePage - 1) * pageSize + i + 1}</td>
                      <td className="py-1.5 px-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.CSM ?? "—"}</td>
                      <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">{r.CLIENT ?? "—"}</td>
                      <td className="py-1.5 px-3 text-gray-500 dark:text-gray-500 whitespace-nowrap">{r.AM ?? "—"}</td>
                      <td className="py-1.5 px-3 text-center text-gray-500 dark:text-gray-500">{EA_DISPLAY[r.EA ?? ""] ?? r.EA ?? "—"}</td>
                      <td className="py-1.5 px-3"><span className={`font-medium ${typeColor(r.TYPE)}`}>{r.TYPE ?? "—"}</span></td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={safePage === 1}
                    className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="p-1.5 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) pageNum = i + 1;
                    else if (safePage <= 4) { pageNum = i + 1; if (i === 6) pageNum = totalPages; }
                    else if (safePage >= totalPages - 3) pageNum = i === 0 ? 1 : totalPages - 6 + i;
                    else { const c = [-3,-2,-1,0,1,2,3]; pageNum = i === 0 ? 1 : i === 6 ? totalPages : safePage + c[i]; }
                    const isEllipsis = i > 0 && i < 6 && totalPages > 7 && ((i === 1 && pageNum > 2) || (i === 5 && pageNum < totalPages - 1));
                    return (
                      <button key={i} onClick={() => !isEllipsis && setPage(pageNum)} disabled={isEllipsis}
                        className={`min-w-[28px] h-7 text-xs font-medium rounded-lg transition-colors ${safePage === pageNum && !isEllipsis ? "bg-blue-600 text-white" : isEllipsis ? "text-gray-400 cursor-default" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                        {isEllipsis ? "…" : pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="p-1.5 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                    className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
