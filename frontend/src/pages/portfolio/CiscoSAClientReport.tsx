/**
 * CiscoSAClientReport
 * Migration of cisco_smart_account_license_usage.py → React
 * Used inside the Client Overview "Cisco SA" detail panel.
 *
 * Sections:
 *  1. Filters (Domain, Virtual Account, Subscription, Compliance, License, quick toggles)
 *  2. Summary KPIs (Licenses, In Use, Available, Net Balance, Out of Compliance)
 *  3. Overall Consumption gauge bar
 *  4. Charts: In Use vs Available by Domain, by Virtual Account, by License Type
 *  5. Compliance Distribution (pie + bar)
 *  6. Top 15 Most Used Licenses (horizontal bar)
 *  7. License Expiration Timeline (line chart)
 *  8. Detail table (sorted by Balance, paginated)
 */

import { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { BarChart3, Layers, Tag, CheckCircle, TrendingUp, Calendar, List } from "lucide-react";

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export type SARow = Record<string, unknown>;

interface Props {
  rows: SARow[];
  isDark?: boolean;
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const fmtN = (v: number) => v.toLocaleString("en-US");
const fmtD = (v: unknown) => v ? String(v).slice(0, 10) : "—";
const pct = (inUse: number, total: number) => total > 0 ? Math.round((inUse / total) * 100 * 10) / 10 : 0;
const TODAY = new Date().toISOString().slice(0, 10);
const isOOC = (v: unknown) => !String(v ?? "").toLowerCase().includes("in compliance");

function KpiTile({ label, value, sub, cls = "" }: { label: string; value: string | number; sub?: string; cls?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={"text-xl font-bold leading-tight " + cls}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function BarInline({ value, max = 100 }: { value: number; max?: number }) {
  const w = Math.min(Math.max(value, 0), max);
  const col = value > 100 ? "bg-red-500" : value >= 90 ? "bg-orange-400" : "bg-cyan-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div className={"h-full rounded-full " + col} style={{ width: (w / max * 100) + "%" }} />
    </div>
  );
}

const PLT = {
  dark: { bg: "rgba(0,0,0,0)", font: "#9CA3AF", grid: "#374151" },
  light: { bg: "rgba(0,0,0,0)", font: "#4B5563", grid: "#E5E7EB" },
};

export default function CiscoSAClientReport({ rows, isDark = false }: Props) {
  const [filterDom,    setFilterDom]    = useState<string[]>([]);
  const [filterVA,     setFilterVA]     = useState<string[]>([]);
  const [filterSub,    setFilterSub]    = useState<string[]>([]);
  const [filterComp,   setFilterComp]   = useState<string[]>([]);
  const [filterLic,    setFilterLic]    = useState<string[]>([]);
  const [showOOC,      setShowOOC]      = useState(false);
  const [showNeg,      setShowNeg]      = useState(false);
  const [tablePage,    setTablePage]    = useState(1);
  const TABLE_PS = 20;

  const plt = isDark ? PLT.dark : PLT.light;

  // ── Filter options (cascade) ──────────────────────────────────────────────
  const domOpts   = useMemo(() => [...new Set(rows.map(r => String(r.mcsa_domain ?? "")).filter(Boolean))].sort(), [rows]);
  const df1       = useMemo(() => filterDom.length  ? rows.filter(r => filterDom.includes(String(r.mcsa_domain ?? "")))           : rows, [rows, filterDom]);
  const vaOpts    = useMemo(() => [...new Set(df1.map(r => String(r.mcsa_virtual_account ?? "")).filter(Boolean))].sort(), [df1]);
  const df2       = useMemo(() => filterVA.length   ? df1.filter(r => filterVA.includes(String(r.mcsa_virtual_account ?? "")))    : df1, [df1, filterVA]);
  const subOpts   = useMemo(() => [...new Set(df2.map(r => String(r.mcsa_subscription ?? "")).filter(Boolean))].sort(), [df2]);
  const df3       = useMemo(() => filterSub.length  ? df2.filter(r => filterSub.includes(String(r.mcsa_subscription ?? "")))      : df2, [df2, filterSub]);
  const compOpts  = useMemo(() => [...new Set(df3.map(r => String(r.mcsa_compliance ?? "")).filter(Boolean))].sort(), [df3]);
  const df4       = useMemo(() => filterComp.length ? df3.filter(r => filterComp.includes(String(r.mcsa_compliance ?? "")))       : df3, [df3, filterComp]);
  const licOpts   = useMemo(() => [...new Set(df4.map(r => String(r.mcsa_license ?? "")).filter(Boolean))].sort(), [df4]);

  // ── Apply all filters ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = df4;
    if (filterLic.length) d = d.filter(r => filterLic.includes(String(r.mcsa_license ?? "")));
    if (showOOC) d = d.filter(r => isOOC(r.mcsa_compliance));
    if (showNeg) d = d.filter(r => num(r.mcsa_balance) < 0);
    return d;
  }, [df4, filterLic, showOOC, showNeg]);

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let inUse = 0, available = 0, balance = 0;
    let ooc = 0;
    for (const r of filtered) {
      inUse     += num(r.mcsa_in_use);
      available += num(r.mcsa_available_to_use);
      balance   += num(r.mcsa_balance);
      if (isOOC(r.mcsa_compliance)) ooc++;
    }
    const capacity = inUse + available;
    const overallPct = pct(inUse, capacity);
    return { inUse, available, balance, capacity, overallPct, ooc, total: filtered.length };
  }, [filtered]);

  // ── Charts ────────────────────────────────────────────────────────────────
  const byDomain = useMemo(() => {
    const m: Record<string, { i: number; a: number }> = {};
    for (const r of filtered) {
      const k = String(r.mcsa_domain ?? "Unknown");
      if (!m[k]) m[k] = { i: 0, a: 0 };
      m[k].i += num(r.mcsa_in_use); m[k].a += num(r.mcsa_available_to_use);
    }
    return Object.entries(m).map(([d, v]) => ({ d, ...v })).sort((a, b) => b.i - a.i);
  }, [filtered]);

  const byVA = useMemo(() => {
    const m: Record<string, { i: number; a: number }> = {};
    for (const r of filtered) {
      const k = String(r.mcsa_virtual_account ?? "Unknown");
      if (!m[k]) m[k] = { i: 0, a: 0 };
      m[k].i += num(r.mcsa_in_use); m[k].a += num(r.mcsa_available_to_use);
    }
    return Object.entries(m).map(([va, v]) => ({ va, ...v })).sort((a, b) => b.i - a.i);
  }, [filtered]);

  const byLicType = useMemo(() => {
    const m: Record<string, { i: number; a: number; count: number }> = {};
    for (const r of filtered) {
      const k = String(r.mcsa_license_type ?? "Unknown");
      if (!m[k]) m[k] = { i: 0, a: 0, count: 0 };
      m[k].i += num(r.mcsa_in_use); m[k].a += num(r.mcsa_available_to_use); m[k].count++;
    }
    return Object.entries(m).map(([lt, v]) => ({ lt, ...v, usagePct: pct(v.i, v.i + v.a) })).sort((a, b) => b.i - a.i);
  }, [filtered]);

  const compDist = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of filtered) {
      const k = String(r.mcsa_compliance ?? "Unknown");
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).map(([comp, cnt]) => ({ comp, cnt })).sort((a, b) => b.cnt - a.cnt);
  }, [filtered]);

  const top15 = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of filtered) { const k = String(r.mcsa_license ?? "—"); m[k] = (m[k] ?? 0) + num(r.mcsa_in_use); }
    return Object.entries(m).map(([lic, v]) => ({ lic, v })).sort((a, b) => b.v - a.v).slice(0, 15);
  }, [filtered]);

  // ── Expiration timeline (group by year-month) ─────────────────────────────
  const expTimeline = useMemo(() => {
    const m: Record<string, { qty: number; dt: string }> = {};
    for (const r of filtered) {
      if (!r.mcsa_end_date) continue;
      const ym = String(r.mcsa_end_date).slice(0, 7);
      if (!m[ym]) m[ym] = { qty: 0, dt: ym + "-01" };
      m[ym].qty += num(r.mcsa_quantity);
    }
    return Object.entries(m).map(([ym, v]) => ({ ym, label: new Date(v.dt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }), qty: v.qty, isPast: ym < TODAY.slice(0, 7) }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
  }, [filtered]);

  // ── Detail table ──────────────────────────────────────────────────────────
  const tableRows = useMemo(() => [...filtered].sort((a, b) => num(a.mcsa_balance) - num(b.mcsa_balance)), [filtered]);
  const totalPages = Math.max(1, Math.ceil(tableRows.length / TABLE_PS));
  const safePage = Math.min(tablePage, totalPages);
  const paginated = tableRows.slice((safePage - 1) * TABLE_PS, safePage * TABLE_PS);

  const lastUpdate = useMemo(() => {
    let max = "";
    for (const r of rows) { const d = r.mcsa_update ? String(r.mcsa_update).slice(0, 10) : ""; if (d > max) max = d; }
    return max || "—";
  }, [rows]);

  const selectCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const hasFilter = filterDom.length > 0 || filterVA.length > 0 || filterSub.length > 0 || filterComp.length > 0 || filterLic.length > 0 || showOOC || showNeg;

  return (
    <div className="space-y-5">
      <p className="text-[10px] text-gray-400 dark:text-gray-500">Last measurement: {lastUpdate}</p>

      {/* ── 1. Filters ────────────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Filters</p>
        <div className="flex flex-wrap gap-3 items-end">
          {([
            { label: "Domain",          opts: domOpts,  val: filterDom,  set: setFilterDom  },
            { label: "Virtual Account", opts: vaOpts,   val: filterVA,   set: setFilterVA   },
            { label: "Subscription",    opts: subOpts,  val: filterSub,  set: setFilterSub  },
            { label: "Compliance",      opts: compOpts, val: filterComp, set: setFilterComp },
            { label: "License",         opts: licOpts,  val: filterLic,  set: setFilterLic  },
          ] as { label: string; opts: string[]; val: string[]; set: (v: string[]) => void }[]).map(({ label, opts, val, set }) => (
            <div key={label}>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
              <select multiple value={val} onChange={e => set([...e.target.selectedOptions].map(o => o.value))}
                className={selectCls + " min-w-[130px] max-h-20"} size={Math.min(opts.length, 3)}>
                {opts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 mt-4">
            <input type="checkbox" checked={showOOC} onChange={e => setShowOOC(e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
            Out of Compliance
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 mt-4">
            <input type="checkbox" checked={showNeg} onChange={e => setShowNeg(e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
            Negative Balance
          </label>
          {hasFilter && (
            <button onClick={() => { setFilterDom([]); setFilterVA([]); setFilterSub([]); setFilterComp([]); setFilterLic([]); setShowOOC(false); setShowNeg(false); }}
              className="text-xs text-red-500 hover:text-red-700 mt-4">✕ Clear</button>
          )}
        </div>
        {filtered.length !== rows.length && <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">{filtered.length} of {rows.length} records shown</p>}
      </div>

      {/* ── 2. KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Total Licenses" value={summary.total} />
        <KpiTile label="Total In Use" value={fmtN(Math.round(summary.inUse))}
          cls={summary.overallPct > 100 ? "text-red-500 dark:text-red-400" : summary.overallPct >= 90 ? "text-orange-500 dark:text-orange-400" : "text-cyan-600 dark:text-cyan-400"} />
        <KpiTile label="Total Available" value={fmtN(Math.round(summary.available))} />
        <KpiTile label="Net Balance" value={(summary.balance >= 0 ? "+" : "") + fmtN(Math.round(summary.balance))}
          cls={summary.balance < 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"} />
        <KpiTile label="Out of Compliance" value={summary.ooc}
          cls={summary.ooc > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"} />
      </div>

      {/* ── 3. Consumption gauge bar ──────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overall Consumption (In Use / Capacity)</span>
          <span className={"text-sm font-bold " + (summary.overallPct > 100 ? "text-red-500" : summary.overallPct >= 90 ? "text-orange-500" : "text-cyan-600")}>{summary.overallPct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={"h-full rounded-full transition-all " + (summary.overallPct > 100 ? "bg-red-500" : summary.overallPct >= 90 ? "bg-orange-400" : "bg-cyan-500")}
            style={{ width: Math.min(summary.overallPct, 100) + "%" }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          <span>0%</span><span>Capacity: {fmtN(Math.round(summary.capacity))}</span><span>100%</span>
        </div>
      </div>

      {/* ── 4a. In Use vs Available by Domain ────────────────────────── */}
      {byDomain.length > 0 && (
        <div>
          <SectionTitle icon={<BarChart3 size={12} />} label="In Use vs Available by Domain" />
          <Plot
            data={[
              { type: "bar", name: "In Use",    x: byDomain.map(r => r.d), y: byDomain.map(r => r.i), marker: { color: "#FFA726" }, text: byDomain.map(r => fmtN(Math.round(r.i))), textposition: "outside" },
              { type: "bar", name: "Available", x: byDomain.map(r => r.d), y: byDomain.map(r => r.a), marker: { color: "#1E88E5" }, text: byDomain.map(r => fmtN(Math.round(r.a))), textposition: "outside" },
            ]}
            layout={{ barmode: "group", bargap: 0.35, height: Math.max(240, byDomain.length * 40 + 80), margin: { t: 20, b: 70, l: 10, r: 10 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 11 }, xaxis: { gridcolor: plt.grid, tickangle: -30 }, yaxis: { gridcolor: plt.grid }, legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 }, showlegend: true }}
            config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
          />
        </div>
      )}

      {/* ── 4b. In Use vs Available by Virtual Account ────────────────── */}
      {byVA.length > 0 && (
        <div>
          <SectionTitle icon={<Layers size={12} />} label="In Use vs Available by Virtual Account" />
          <Plot
            data={[
              { type: "bar", name: "In Use",    x: byVA.map(r => r.i), y: byVA.map(r => r.va), orientation: "h", marker: { color: "#FFA726" }, text: byVA.map(r => fmtN(Math.round(r.i))), textposition: "outside" },
              { type: "bar", name: "Available", x: byVA.map(r => r.a), y: byVA.map(r => r.va), orientation: "h", marker: { color: "#1E88E5" }, text: byVA.map(r => fmtN(Math.round(r.a))), textposition: "outside" },
            ]}
            layout={{ barmode: "group", bargap: 0.35, height: Math.max(240, byVA.length * 40 + 80), margin: { t: 20, b: 20, l: 160, r: 80 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 11 }, xaxis: { gridcolor: plt.grid }, yaxis: { gridcolor: plt.grid, autorange: "reversed" }, legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 }, showlegend: true }}
            config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
          />
        </div>
      )}

      {/* ── 4c. In Use vs Available by License Type ──────────────────── */}
      {byLicType.length > 0 && (
        <div>
          <SectionTitle icon={<Tag size={12} />} label="In Use vs Available by License Type" />
          <div className="flex gap-4">
            <div className="flex-1">
              <Plot
                data={[
                  { type: "bar", name: "In Use",    x: byLicType.map(r => r.i), y: byLicType.map(r => r.lt), orientation: "h", marker: { color: "#FFA726" }, text: byLicType.map(r => fmtN(Math.round(r.i))), textposition: "outside" },
                  { type: "bar", name: "Available", x: byLicType.map(r => r.a), y: byLicType.map(r => r.lt), orientation: "h", marker: { color: "#1E88E5" }, text: byLicType.map(r => fmtN(Math.round(r.a))), textposition: "outside" },
                ]}
                layout={{ barmode: "group", bargap: 0.35, height: Math.max(200, byLicType.length * 50 + 80), margin: { t: 10, b: 20, l: 160, r: 80 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 11 }, xaxis: { gridcolor: plt.grid }, yaxis: { gridcolor: plt.grid, autorange: "reversed" }, legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 }, showlegend: true }}
                config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
              />
            </div>
            <div className="w-28 flex flex-col gap-2 pt-2">
              {byLicType.map(r => (
                <div key={r.lt} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-center">
                  <p className={"text-sm font-bold " + (r.usagePct > 100 ? "text-red-500" : r.usagePct >= 90 ? "text-orange-500" : "text-cyan-600")}>{r.usagePct}%</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{r.lt}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500">{r.count} lic.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Compliance Distribution ───────────────────────────────── */}
      {compDist.length > 0 && (
        <div>
          <SectionTitle icon={<CheckCircle size={12} />} label="Compliance Distribution" />
          <div className="flex gap-4">
            <div className="w-52 flex-shrink-0">
              <Plot
                data={[{ type: "pie", labels: compDist.map(r => r.comp), values: compDist.map(r => r.cnt), hole: 0.55, marker: { colors: compDist.map(r => isOOC(r.comp) ? "#EF5350" : "#66BB6A") }, textinfo: "label+percent", hovertemplate: "%{label}: %{value}<extra></extra>" }]}
                layout={{ showlegend: false, height: 220, margin: { t: 10, b: 10, l: 10, r: 10 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 10 }, annotations: [{ text: "Compliance", x: 0.5, y: 0.5, font: { size: 11, color: plt.font }, showarrow: false }] }}
                config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
              />
            </div>
            <div className="flex-1 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {["Compliance Status", "Count", "%"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {compDist.map((r, i) => {
                    const total = compDist.reduce((s, x) => s + x.cnt, 0);
                    const compPct = total > 0 ? Math.round(r.cnt / total * 100) : 0;
                    return (
                      <tr key={i} className={"border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"}>
                        <td className={"px-3 py-2 font-medium " + (isOOC(r.comp) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{r.comp}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.cnt}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{compPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Top 15 Most Used Licenses ─────────────────────────────── */}
      {top15.length > 0 && (
        <div>
          <SectionTitle icon={<TrendingUp size={12} />} label="Top 15 Most Used Licenses" />
          <Plot
            data={[{ type: "bar", orientation: "h", x: top15.map(r => r.v), y: top15.map(r => r.lic), marker: { color: top15.map(r => r.v) as unknown as string, colorscale: [[0, "#1E88E5"], [0.5, "#FFA726"], [1, "#EF5350"]] as unknown as string }, text: top15.map(r => fmtN(Math.round(r.v))), textposition: "outside" }]}
            layout={{ height: Math.max(200, top15.length * 28 + 60), margin: { t: 10, b: 40, l: 200, r: 80 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 11 }, xaxis: { gridcolor: plt.grid }, yaxis: { gridcolor: plt.grid, autorange: "reversed" } }}
            config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
          />
        </div>
      )}

      {/* ── 7. License Expiration Timeline ───────────────────────────── */}
      {expTimeline.length > 0 && (
        <div>
          <SectionTitle icon={<Calendar size={12} />} label="License Expiration Timeline — Quantity by Month" />
          <Plot
            data={[
              { type: "scatter", mode: "none", x: expTimeline.map(r => r.label), y: expTimeline.map(r => r.qty), fill: "tozeroy", fillcolor: "rgba(30,136,229,0.10)", showlegend: false, hoverinfo: "skip" as "skip" },
              ...(expTimeline.filter(r => r.isPast).length > 0 ? [{
                type: "scatter" as const, mode: "lines+markers+text" as const, name: "Expired",
                x: expTimeline.filter(r => r.isPast).map(r => r.label), y: expTimeline.filter(r => r.isPast).map(r => r.qty),
                line: { color: "#546E7A", width: 2 }, marker: { size: 7, color: "#546E7A" },
                text: expTimeline.filter(r => r.isPast).map(r => fmtN(r.qty)), textposition: "top center" as const,
              }] : []),
              ...(expTimeline.filter(r => !r.isPast).length > 0 ? [{
                type: "scatter" as const, mode: "lines+markers+text" as const, name: "Active",
                x: expTimeline.filter(r => !r.isPast).map(r => r.label), y: expTimeline.filter(r => !r.isPast).map(r => r.qty),
                line: { color: "#1E88E5", width: 2.5 }, marker: { size: 8, color: "#1E88E5" },
                text: expTimeline.filter(r => !r.isPast).map(r => fmtN(r.qty)), textposition: "top center" as const,
              }] : []),
            ]}
            layout={{ height: 300, margin: { t: 30, b: 60, l: 10, r: 10 }, paper_bgcolor: plt.bg, plot_bgcolor: plt.bg, font: { color: plt.font, size: 11 }, xaxis: { gridcolor: plt.grid, tickangle: -30, title: "Expiration Month" }, yaxis: { gridcolor: plt.grid, title: "Quantity", rangemode: "tozero" as "tozero" }, legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 }, hovermode: "x unified" as "x unified" }}
            config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} useResizeHandler
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Active / Upcoming (blue)  •  Expired (gray)</p>
        </div>
      )}

      {/* ── 8. Detail Table ───────────────────────────────────────────── */}
      <div>
        <SectionTitle icon={<List size={12} />} label={`Detail — License Usage (${tableRows.length})`} />
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {["License","Domain","Virtual Account","Subscription","Compliance","Qty","In Use","Available","Balance","Usage %"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paginated.map((r, i) => {
                const inUse = num(r.mcsa_in_use); const avail = num(r.mcsa_available_to_use);
                const bal = num(r.mcsa_balance); const usePct = pct(inUse, inUse + avail);
                const ooc = isOOC(r.mcsa_compliance);
                return (
                  <tr key={i} className={"border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50" + (ooc ? " bg-red-50/20 dark:bg-red-900/10" : "")}>
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[180px] truncate">{String(r.mcsa_license ?? "—")}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{String(r.mcsa_domain ?? "—")}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{String(r.mcsa_virtual_account ?? "—")}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{String(r.mcsa_subscription ?? "—")}</td>
                    <td className={"px-3 py-2 whitespace-nowrap text-[10px] font-semibold " + (ooc ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{String(r.mcsa_compliance ?? "—")}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmtN(Math.round(num(r.mcsa_quantity)))}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmtN(Math.round(inUse))}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmtN(Math.round(avail))}</td>
                    <td className={"px-3 py-2 text-right font-semibold " + (bal < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{(bal >= 0 ? "+" : "") + fmtN(Math.round(bal))}</td>
                    <td className="px-3 py-2 min-w-[80px]">
                      <div className="flex items-center gap-1.5">
                        <span className={"text-[10px] font-semibold w-10 text-right " + (usePct > 100 ? "text-red-500" : usePct >= 90 ? "text-orange-500" : "text-cyan-600")}>{usePct}%</span>
                        <BarInline value={usePct} max={130} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{(safePage - 1) * TABLE_PS + 1}–{Math.min(safePage * TABLE_PS, tableRows.length)} of {tableRows.length}</p>
            <div className="flex items-center gap-1">
              {["«","‹"].map((lbl, idx) => (
                <button key={lbl} onClick={() => setTablePage(idx === 0 ? 1 : Math.max(1, safePage - 1))} disabled={safePage === 1}
                  className="flex items-center justify-center w-7 h-7 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">{lbl}</button>
              ))}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(safePage - 2, totalPages - 4)) + i;
                return pg <= totalPages ? (
                  <button key={pg} onClick={() => setTablePage(pg)}
                    className={"flex items-center justify-center w-7 h-7 text-xs rounded-lg " + (pg === safePage ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}>{pg}</button>
                ) : null;
              })}
              {["›","»"].map((lbl, idx) => (
                <button key={lbl} onClick={() => setTablePage(idx === 0 ? Math.min(totalPages, safePage + 1) : totalPages)} disabled={safePage >= totalPages}
                  className="flex items-center justify-center w-7 h-7 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">{lbl}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
