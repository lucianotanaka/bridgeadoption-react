/**
 * FarolPage — Portfolio: Farol (Traffic Light)
 * Full migration from Streamlit farol.py
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, RefreshCw } from "lucide-react";
import apiClient from "@/api/client";

interface FarolClient { client_id: number; client_name: string; }
interface FarolRow { architecture: string; solution: string; status: string | null; farol: string | null; [k: string]: unknown; }
interface ArchGroup { arch: string; solutions: { name: string; status: string | null; farol: string | null }[]; }

const VENDOR_MAP: Record<string, number> = { CISCO: 1 };
const VENDOR_OPTIONS = Object.keys(VENDOR_MAP);
const MAX = 5;

const EMOJI: Record<string, string> = { green: "🟢", yellow: "🟡", red: "🔴", gray: "⚪" };
const LABEL: Record<string, string> = {
  green: "Active",
  yellow: "Signed – Pending Activation",
  red: "Expired or Never Covered",
  gray: "Non-Existent or Other Partner",
};
const emoji = (s?: string | null) => EMOJI[s ?? ""] ?? "⚪";
const label = (s?: string | null) => LABEL[s ?? ""] ?? "Non-Existent or Other Partner";

const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inp = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const Spin = () => <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

function buildGroups(rows: FarolRow[]): ArchGroup[] {
  const m = new Map<string, Map<string, { status: string | null; farol: string | null }>>();
  for (const r of rows) {
    const a = r.architecture ?? "", s = r.solution ?? "";
    if (!m.has(a)) m.set(a, new Map());
    const sm = m.get(a)!;
    if (!sm.has(s)) sm.set(s, { status: r.status ?? null, farol: r.farol ?? null });
  }
  return [...m.entries()].map(([arch, sm]) => ({
    arch,
    solutions: [...sm.entries()].map(([name, v]) => ({ name, ...v })),
  }));
}

function exportCSV(groups: ArchGroup[], vendor: string, client: string) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const c = client.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const rows: string[][] = [[`Farol ${vendor}: ${client}`], []];
  for (const g of groups) {
    let first = true;
    for (let i = 0; i < g.solutions.length; i += MAX) {
      const row = [first ? g.arch.toUpperCase() : ""];
      first = false;
      for (const s of g.solutions.slice(i, i + MAX))
        row.push(`${s.name} = ${s.farol ?? "Non-Existent or Other Partner"}`);
      rows.push(row);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${d}_Farol_${vendor}_${c}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

// Searchable single-select
function Sel<T>({ label: lbl, options, value, onChange, getLabel: gl, getId: gi, placeholder, disabled }: {
  label: string; options: T[]; value: T | null; onChange: (v: T | null) => void;
  getLabel: (o: T) => string; getId: (o: T) => string | number; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => q.trim() ? options.filter(o => gl(o).toLowerCase().includes(q.toLowerCase())) : options, [options, q]); // eslint-disable-line
  return (
    <div className="flex flex-col gap-1 min-w-[220px]">
      {lbl && <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lbl}</label>}
      <div className="relative">
        <button type="button" disabled={disabled}
          onClick={() => { setOpen(o => !o); setQ(""); }}
          className={`${inp} text-left flex items-center justify-between gap-1 disabled:opacity-40 disabled:cursor-not-allowed`}>
          <span className={`truncate ${value ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
            {value ? gl(value) : (placeholder ?? "Select...")}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && <span onClick={e => { e.stopPropagation(); onChange(null); setQ(""); }} className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]">✕</span>}
            <span className="text-gray-400 text-[10px]">▾</span>
          </div>
        </button>
        {open && !disabled && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setQ(""); }} />
            <div className="absolute top-full mt-1 z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: "280px" }}>
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
                  onClick={e => e.stopPropagation()}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
                {filtered.map(opt => (
                  <button key={gi(opt)} type="button" onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value && gi(value) === gi(opt) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                    {gl(opt)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Farol Grid component
function Grid({ groups, vendor, client }: { groups: ArchGroup[]; vendor: string; client: string }) {
  if (groups.length === 0)
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">No Farol data found for this client.</p>;
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">FAROL {vendor} — {client}</h3>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(EMOJI).map(([k, e]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="text-base leading-none">{e}</span><span>{LABEL[k]}</span></span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="text-xs border-collapse w-full">
          <tbody>
            {groups.flatMap((g) => {
              const chunks: (typeof g.solutions)[] = [];
              for (let i = 0; i < g.solutions.length; i += MAX) chunks.push(g.solutions.slice(i, i + MAX));
              return chunks.map((chunk, ci) => (
                <tr key={`${g.arch}-${ci}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  {ci === 0 && (
                    <td rowSpan={chunks.length} className="border-r border-gray-200 dark:border-gray-700 align-top p-3 bg-gray-50 dark:bg-gray-800/50" style={{ width: 180, minWidth: 150 }}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Architecture</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-[11px] leading-tight break-words">{g.arch.toUpperCase()}</p>
                    </td>
                  )}
                  {chunk.map(sol => (
                    <td key={sol.name} title={label(sol.status)} className="border-r border-gray-100 dark:border-gray-700 last:border-r-0 align-top p-3" style={{ width: 150, minWidth: 120 }}>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] leading-tight break-words mb-2">{sol.name}</p>
                      <p className="text-xl text-center">{emoji(sol.status)}</p>
                      {sol.farol && <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1 leading-tight">{sol.farol}</p>}
                    </td>
                  ))}
                  {/* Pad empty cells so rows align */}
                  {Array.from({ length: MAX - chunk.length }).map((_, i) => (
                    <td key={`empty-${i}`} className="border-r border-gray-100 dark:border-gray-700 last:border-r-0" style={{ width: 150 }} />
                  ))}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function FarolPage() {
  const { t } = useTranslation();

  // Filter state
  const [vendor, setVendor] = useState<string>("CISCO");
  const [client, setClient] = useState<FarolClient | null>(null);

  // Trigger state — set to true when Generate button is clicked
  const [generated, setGenerated] = useState(false);
  const [activeVendor, setActiveVendor] = useState<string>("");
  const [activeClient, setActiveClient] = useState<FarolClient | null>(null);

  // Clients query — auto-fetched when vendor is selected
  const clientsQ = useQuery({
    queryKey: ["farol-clients", vendor],
    queryFn: () =>
      apiClient
        .get<FarolClient[]>("/portfolio/farol/clients", { params: { vendor_id: VENDOR_MAP[vendor] } })
        .then((r) => r.data),
    enabled: !!vendor,
    staleTime: 5 * 60 * 1000,
  });

  const clients = clientsQ.data ?? [];

  // Farol data query — only runs when "Generate" is clicked
  const farolQ = useQuery({
    queryKey: ["farol-data", activeVendor, activeClient?.client_id],
    queryFn: () =>
      apiClient
        .get<FarolRow[]>("/portfolio/farol", {
          params: { vendor_id: VENDOR_MAP[activeVendor], customer_id: activeClient?.client_id },
        })
        .then((r) => r.data),
    enabled: generated && !!activeVendor && !!activeClient,
    staleTime: 2 * 60 * 1000,
  });

  const groups = useMemo(
    () => buildGroups(farolQ.data ?? []),
    [farolQ.data]
  );

  const canGenerate = !!vendor && !!client;

  function handleGenerate() {
    if (!canGenerate) return;
    setActiveVendor(vendor);
    setActiveClient(client);
    setGenerated(true);
    // If already generated with same params, force refetch
    if (activeVendor === vendor && activeClient?.client_id === client.client_id) {
      void farolQ.refetch();
    }
  }

  function handleVendorChange(v: string) {
    setVendor(v);
    setClient(null);
    setGenerated(false);
    setActiveVendor("");
    setActiveClient(null);
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Portfolio — Farol
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Traffic Light — Client Health Status
          </p>
        </div>
        {generated && groups.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(groups, activeVendor, activeClient?.client_name ?? "")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={() => void farolQ.refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={farolQ.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Filters card */}
      <div className={card}>
        <div className="flex flex-wrap items-end gap-4">
          {/* Vendor selector */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Vendor
            </label>
            <select
              value={vendor}
              onChange={(e) => handleVendorChange(e.target.value)}
              className={inp.replace("w-full", "")}
              style={{ minWidth: 160 }}
            >
              {VENDOR_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Client selector */}
          <div className="relative">
            {clientsQ.isLoading && (
              <div className="absolute right-2 bottom-2 z-10"><Spin /></div>
            )}
            <Sel<FarolClient>
              label="Client"
              options={clients}
              value={client}
              onChange={setClient}
              getLabel={(c) => c.client_name}
              getId={(c) => c.client_id}
              placeholder={clientsQ.isLoading ? "Loading..." : clients.length === 0 ? "No clients available" : "Select client..."}
              disabled={!vendor || clientsQ.isLoading}
            />
          </div>

          {/* Generate button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || farolQ.isFetching}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {farolQ.isFetching ? <Spin /> : null}
              Generate Farol
            </button>
          </div>
        </div>

        {clientsQ.isError && (
          <p className="text-xs text-red-500 mt-2">Failed to load clients. Please try again.</p>
        )}
      </div>

      {/* Results card */}
      <div className={card}>
        {/* Not yet generated */}
        {!generated && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            Select a vendor and client, then click <strong>Generate Farol</strong>.
          </p>
        )}

        {/* Loading */}
        {generated && farolQ.isLoading && (
          <div className="flex items-center justify-center gap-3 py-12">
            <Spin />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading Farol data…</span>
          </div>
        )}

        {/* Error */}
        {generated && farolQ.isError && (
          <p className="text-sm text-red-500 text-center py-8">
            Failed to load Farol data. Please try again.
          </p>
        )}

        {/* Data */}
        {generated && !farolQ.isLoading && !farolQ.isError && (
          <Grid
            groups={groups}
            vendor={activeVendor}
            client={activeClient?.client_name ?? ""}
          />
        )}
      </div>
    </div>
  );
}
