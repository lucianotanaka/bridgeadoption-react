/**
 * CiscoEATrueForwardTab — migração completa do report_cisco_true_forward.py
 *
 * Filtros → KPIs → Gráficos (bar, 2×pie, line) → Tabs (Exec|Over|All|Tasks|CCW)
 */
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Plot from "react-plotly.js";
import { fetchTrueForwardReportData, type TrueForwardRow, type CcwRow } from "@/api/ciscoEATrueForward";
import {
  DC, DW, EA_PRODUCTS, RISK_COLORS, URGENCY_PIE, TASK_PIE, CCW_COV, CCW_RNG, card,
  fmtN, fmtD, fmtPct, urgBucket, riskLvl, covBucket, consBucket, toYM, sortYM, ymLabel,
  UrgBadge, RiskBadge, KPI, type Col,
} from "./TFHelpers";
import { Tbl, xlsxExport } from "./TFTable";

// ── layout helper ─────────────────────────────────────────────────────────────
const isDark = () => document.documentElement.classList.contains("dark");
function mkLay(h: number) {
  const dark = isDark();
  const bg = dark ? "#111827" : "white";
  const gr = dark ? "#374151" : "#e5e7eb";
  const fc = dark ? "#d1d5db" : "#374151";
  return { paper_bgcolor: bg, plot_bgcolor: bg, font: { color: fc, size: 11 }, margin: { l: 60, r: 30, t: 40, b: 80 }, height: h, xaxis: { gridcolor: gr, automargin: true }, yaxis: { gridcolor: gr, automargin: true }, showlegend: true };
}

// ── column defs ───────────────────────────────────────────────────────────────
const COLS_OVER: Col[] = [
  { key: "customer_name", label: "Cliente" },
  { key: "mcea_subscription", label: "Subscription" },
  { key: "mcea_suite_name", label: "Suite" },
  { key: "mcea_sku", label: "SKU" },
  { key: "mcea_domain", label: "Domínio" },
  { key: "mcea_end_date", label: "Fim Contrato", fmt: fmtD },
  { key: "days_to_contract_end", label: "Dias p/ Venc.", right: true, render: r => <UrgBadge days={r.days_to_contract_end as number} /> },
  { key: "total_purchased", label: "Contratado", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "total_consumed", label: "Usado", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "overconsumption", label: "Excesso", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "consumption_pct", label: "% Consumo", right: true, fmt: v => fmtPct(v as number) },
  { key: "mcea_update", label: "Última Med.", fmt: fmtD },
  { key: "t_task_id", label: "Task ID" },
  { key: "t_status_label", label: "Status Tarefa" },
  { key: "t_reference", label: "Referência" },
  { key: "t_start", label: "Início Tarefa", fmt: fmtD },
  { key: "t_end", label: "Fim Tarefa", fmt: fmtD },
];
const COLS_ALL: Col[] = [
  { key: "customer_name", label: "Cliente" },
  { key: "mcea_subscription", label: "Subscription" },
  { key: "mcea_suite_name", label: "Suite" },
  { key: "mcea_sku", label: "SKU" },
  { key: "mcea_end_date", label: "Fim Contrato", fmt: fmtD },
  { key: "days_to_contract_end", label: "Dias p/ Venc.", right: true, render: r => <UrgBadge days={r.days_to_contract_end as number} /> },
  { key: "total_purchased", label: "Contratado", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "total_consumed", label: "Usado", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "overconsumption", label: "Excesso", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "consumption_pct", label: "% Consumo", right: true, fmt: v => fmtPct(v as number) },
  { key: "t_task_id", label: "Task ID" },
  { key: "t_status_label", label: "Status Tarefa" },
];
const COLS_TASKS: Col[] = [
  { key: "customer_name", label: "Cliente" },
  { key: "mcea_subscription", label: "Subscription" },
  { key: "mcea_suite_name", label: "Suite" },
  { key: "t_task_id", label: "Task ID" },
  { key: "t_status_label", label: "Status" },
  { key: "t_track", label: "Track" },
  { key: "t_subtrack", label: "Subtrack" },
  { key: "t_reference", label: "Referência" },
  { key: "t_start", label: "Início", fmt: fmtD },
  { key: "t_end", label: "Fim", fmt: fmtD },
  { key: "t_created_date", label: "Abertura", fmt: fmtD },
  { key: "overconsumption", label: "Excesso", right: true, fmt: v => fmtN(v as number, 0) },
  { key: "days_to_contract_end", label: "Dias p/ Venc.", right: true, render: r => <UrgBadge days={r.days_to_contract_end as number} /> },
];
const COLS_CCW: Col[] = [
  { key: "end_customer", label: "End Customer" },
  { key: "offer_name", label: "Offer" },
  { key: "consumption_status", label: "Consumption Status" },
  { key: "subscription_id", label: "Subscription ID" },
  { key: "status", label: "Status" },
  { key: "start_date", label: "Start", fmt: fmtD },
  { key: "end_date", label: "End", fmt: fmtD },
  { key: "next_true_forward", label: "Next TF", fmt: fmtD },
  { key: "tf_overage", label: "TF Overage ($)", right: true, fmt: v => fmtN(v as number, 2) },
  { key: "ea_consumed_suite_value_percent", label: "Consumed (%)", right: true, fmt: v => fmtPct(v as number) },
  { key: "provisioning_status", label: "Provisioning" },
  { key: "buying_program_id", label: "Buying Program" },
];

type Row = TrueForwardRow & Record<string, unknown>;

// ── main component ────────────────────────────────────────────────────────────
export default function CiscoEATrueForwardTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  // ── data fetch ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cisco-ea-true-forward"],
    queryFn: fetchTrueForwardReportData,
    staleTime: 5 * 60 * 1000,
  });

  const allRows = (data?.rows ?? []) as Row[];
  const allCcw  = (data?.ccw  ?? []) as (CcwRow & Record<string, unknown>)[];

  // ── filters (metering/tasks) ────────────────────────────────────────────────
  const tf = (k: string, opts?: Record<string, unknown>): string => String(t(`portfolio.ciscoEA.trueForward.${k}`, opts as never));

  const [viewSel, setViewSel] = useState(t("portfolio.ciscoEA.trueForward.viewOverOnly"));
  const [clienteSel, setClienteSel] = useState<string[]>([]);
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [taskFil, setTaskFil] = useState(t("portfolio.ciscoEA.trueForward.taskAll"));
  const [urgFil, setUrgFil] = useState(t("portfolio.ciscoEA.trueForward.urgAll"));
  const [activeTab, setActiveTab] = useState("exec");

  // ── CCW filters ─────────────────────────────────────────────────────────────
  const [ccwYears, setCcwYears]   = useState<string[]>([]);
  const [ccwCov,   setCcwCov]     = useState<string[]>([]);
  const [ccwVenc,  setCcwVenc]    = useState<string[]>([]);
  const [ccwStat,  setCcwStat]    = useState<string[]>([]);
  const [ccwRng,   setCcwRng]     = useState<string[]>([]);
  const [ccwTf,    setCcwTf]      = useState<string[]>([]);
  const [ccwEaTerm,setCcwEaTerm]  = useState<string[]>([]);

  const customerOpts = useMemo(() =>
    [...new Set(allRows.map(r => r.customer_name ?? "").filter(Boolean))].sort(),
  [allRows]);

  // ── apply main filters ──────────────────────────────────────────────────────
  const filtered: Row[] = useMemo(() => {
    let r = [...allRows];
    if (viewSel === tf("viewOverOnly")) r = r.filter(x => x.is_overconsumption);
    else if (viewSel === tf("viewHighConsumption")) r = r.filter(x => x.consumption_pct >= 85);
    if (clienteSel.length) r = r.filter(x => clienteSel.includes(x.customer_name ?? ""));
    if (taskFil === tf("taskOpen")) r = r.filter(x => x.task_is_open);
    else if (taskFil === tf("taskNone")) r = r.filter(x => !x.has_task);
    else if (taskFil === tf("taskClosed")) r = r.filter(x => x.has_task && !x.task_is_open);
    if (urgFil === tf("urgCritical")) r = r.filter(x => x.days_to_contract_end != null && x.days_to_contract_end >= 0 && x.days_to_contract_end <= DC);
    else if (urgFil === tf("urgWarning")) r = r.filter(x => x.days_to_contract_end != null && x.days_to_contract_end > DC && x.days_to_contract_end <= DW);
    else if (urgFil === tf("urgExpired")) r = r.filter(x => x.days_to_contract_end != null && x.days_to_contract_end < 0);
    return r;
  }, [allRows, viewSel, clienteSel, taskFil, urgFil]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption);
    return {
      total: filtered.length,
      clientes: new Set(filtered.map(r => r.mcea_client_id)).size,
      excesso: Math.round(over.reduce((s, r) => s + r.overconsumption, 0)),
      semTarefa: over.filter(r => !r.has_task).length,
      comTarefaAberta: over.filter(r => r.task_is_open).length,
      criticos: over.filter(r => r.days_to_contract_end != null && r.days_to_contract_end >= 0 && r.days_to_contract_end <= DC).length,
    };
  }, [filtered]);

  // ── Gráfico 1: barras top clientes por suite ─────────────────────────────────
  const barChart = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption);
    if (!over.length) return null;
    const agg: Record<string, Record<string, number>> = {};
    for (const r of over) {
      const c = r.customer_name ?? "N/A";
      const s = r.mcea_suite_name ?? "N/A";
      if (!agg[c]) agg[c] = {};
      agg[c][s] = (agg[c][s] ?? 0) + r.overconsumption;
    }
    const totals = Object.entries(agg).map(([c, sv]) => ({ c, t: Object.values(sv).reduce((a, b) => a + b, 0), sv }));
    const top30 = totals.sort((a, b) => b.t - a.t).slice(0, 30);
    const suites = [...new Set(over.map(r => r.mcea_suite_name ?? "N/A"))];
    const COLORS = ["#005B96","#6B48A2","#00897B","#E67E22","#E74C3C","#2980B9","#8E44AD","#16A085"];
    return {
      traces: suites.map((s, i) => ({
        type: "bar" as const, name: s,
        x: top30.map(r => r.c),
        y: top30.map(r => r.sv[s] ?? 0),
        marker: { color: COLORS[i % COLORS.length] },
      })),
      h: Math.max(350, top30.length * 22),
    };
  }, [filtered]);

  // ── Gráfico 2a: pizza urgência ────────────────────────────────────────────────
  const urgPie = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption);
    const cnt: Record<string, number> = {};
    for (const r of over) { const b = urgBucket(r.days_to_contract_end); cnt[b] = (cnt[b] ?? 0) + 1; }
    const labels = Object.keys(cnt), values = Object.values(cnt);
    return { labels, values, colors: labels.map(l => URGENCY_PIE[l] ?? "#999") };
  }, [filtered]);

  // ── Gráfico 2b: pizza status tarefa ──────────────────────────────────────────
  const taskPie = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption);
    const cnt: Record<string, number> = {};
    for (const r of over) {
      const k = r.task_is_open ? "Tarefa Aberta" : r.has_task ? "Tarefa Encerrada" : "Sem Tarefa";
      cnt[k] = (cnt[k] ?? 0) + 1;
    }
    const labels = Object.keys(cnt), values = Object.values(cnt);
    return { labels, values, colors: labels.map(l => TASK_PIE[l] ?? "#999") };
  }, [filtered]);

  // ── Gráfico 3: evolução temporal ──────────────────────────────────────────────
  const lineSeries = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption && r.mcea_update);
    if (!over.length) return null;
    const byDate: Record<string, { casos: number; excesso: number }> = {};
    for (const r of over) {
      const d = toYM(r.mcea_update) || "?";
      if (!byDate[d]) byDate[d] = { casos: 0, excesso: 0 };
      byDate[d].casos += 1;
      byDate[d].excesso += r.overconsumption;
    }
    const dates = sortYM(Object.keys(byDate).filter(d => d !== "?"));
    return { dates, casos: dates.map(d => byDate[d].casos), excesso: dates.map(d => byDate[d].excesso) };
  }, [filtered]);

  // ── Visão Executiva ───────────────────────────────────────────────────────────
  const execData = useMemo(() => {
    const over = filtered.filter(r => r.is_overconsumption);
    const map: Record<string, { excesso: number; suites: Set<string>; subs: Set<string>; minDays: number | null; tasksAbertas: number; semCobertura: number }> = {};
    for (const r of over) {
      const cn = r.customer_name ?? "N/A";
      if (!map[cn]) map[cn] = { excesso: 0, suites: new Set(), subs: new Set(), minDays: null, tasksAbertas: 0, semCobertura: 0 };
      const e = map[cn];
      e.excesso += r.overconsumption;
      if (r.mcea_suite_name) e.suites.add(r.mcea_suite_name);
      if (r.mcea_subscription) e.subs.add(r.mcea_subscription);
      if (r.days_to_contract_end != null) e.minDays = e.minDays == null ? r.days_to_contract_end : Math.min(e.minDays, r.days_to_contract_end);
      if (r.task_is_open) e.tasksAbertas++;
      if (!r.has_task) e.semCobertura++;
    }
    const RORD: Record<string, number> = { Expirado: 0, CRITICO: 1, ATENCAO: 2, OK: 3, "Sem data": 4 };
    return Object.entries(map).map(([cn, e]) => {
      const nivel = riskLvl(e.minDays);
      const cobPct = e.subs.size > 0 ? Math.round((e.tasksAbertas / e.subs.size) * 100) : 0;
      return { customer_name: cn, total_excesso: Math.round(e.excesso), suites_afetadas: e.suites.size, subscriptions_afetadas: e.subs.size, pior_vencimento_dias: e.minDays, nivel_risco: nivel, tasks_abertas: e.tasksAbertas, sem_cobertura: e.semCobertura, cobertura_pct: cobPct, _rord: RORD[nivel] ?? 99 };
    }).sort((a, b) => a._rord - b._rord || b.total_excesso - a.total_excesso);
  }, [filtered]);

  // ── CCW enriched + filters ────────────────────────────────────────────────────
  const ccwEnriched = useMemo(() => allCcw.map(r => ({
    ...r,
    _end_year: r.end_date ? String(new Date(String(r.end_date)).getFullYear()) : "",
    _cov: covBucket(r._days_to_end as number | null),
    _ym_venc: toYM(r.end_date as string),
    _ym_tf: toYM(r.next_true_forward as string),
    _cons_rng: consBucket(r.ea_consumed_suite_value_percent as number | null),
    _ea_term: EA_PRODUCTS.has(String(r.offer_name ?? "").toUpperCase().trim()) ? "EA" : "Term",
  })), [allCcw]);

  const ccwFiltered = useMemo(() => {
    let r = ccwEnriched;
    if (ccwYears.length) r = r.filter(x => ccwYears.includes(x._end_year as string));
    if (ccwCov.length) r = r.filter(x => ccwCov.includes(x._cov as string));
    if (ccwVenc.length) r = r.filter(x => ccwVenc.includes(x._ym_venc as string));
    if (ccwStat.length) r = r.filter(x => ccwStat.includes(String(x.consumption_status ?? "")));
    if (ccwRng.length) r = r.filter(x => ccwRng.includes(x._cons_rng as string));
    if (ccwTf.length) r = r.filter(x => ccwTf.includes(x._ym_tf as string));
    if (ccwEaTerm.length) r = r.filter(x => ccwEaTerm.includes(x._ea_term as string));
    return r;
  }, [ccwEnriched, ccwYears, ccwCov, ccwVenc, ccwStat, ccwRng, ccwTf, ccwEaTerm]);

  const ccwKpis = useMemo(() => ({
    provIncomplete: ccwEnriched.filter(r => String(r.provisioning_status ?? "").toUpperCase() !== "COMPLETE").length,
    over90: ccwEnriched.filter(r => (r.ea_consumed_suite_value_percent as number ?? 0) > 90).length,
    over100: ccwEnriched.filter(r => (r.ea_consumed_suite_value_percent as number ?? 0) > 100).length,
    overConsumed: ccwEnriched.filter(r => String(r.consumption_status ?? "").toUpperCase() === "OVER CONSUMED").length,
    tfOverage: ccwEnriched.filter(r => (r.tf_overage as number ?? 0) > 0).length,
  }), [ccwEnriched]);

  // ── helpers ───────────────────────────────────────────────────────────────────
  // Inline checkbox (kept for compatibility, not used in main filters)
  const MS = (opts: string[], sel: string[], set: (v: string[]) => void, placeholder: string) => (
    <div className="flex flex-wrap gap-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 min-h-[36px] items-center cursor-pointer text-xs"
      title={placeholder}>
      {opts.slice(0, 4).map(o => (
        <label key={o} className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={sel.includes(o)} onChange={e => set(e.target.checked ? [...sel, o] : sel.filter(x => x !== o))} className="w-3 h-3" />
          <span className="text-gray-700 dark:text-gray-300 text-[11px]">{o}</span>
        </label>
      ))}
      {opts.length > 4 && <span className="text-gray-400 text-[10px]">+{opts.length - 4} mais</span>}
      {sel.length > 0 && <button onClick={() => set([])} className="ml-auto text-[10px] text-red-400 hover:text-red-600">✕</button>}
    </div>
  );
  // Dropdown multiselect (used for all CCW + main filters)
  const [dropStates, setDropStates] = useState<Record<string, boolean>>({});
  const [dropSearch, setDropSearch] = useState<Record<string, string>>({});
  const toggleDrop = (id: string) => setDropStates(p => ({ ...p, [id]: !p[id] }));
  const setSearch = (id: string, v: string) => setDropSearch(p => ({ ...p, [id]: v }));

  const DropMS = (id: string, label: string, opts: string[], sel: string[], set: (v: string[]) => void) => {
    const open = !!dropStates[id];
    const search = dropSearch[id] ?? "";
    const filtered_opts = opts.filter(n => n.toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
          {label}{sel.length > 0 && <span className="ml-1 text-blue-500 normal-case font-normal">({sel.length})</span>}
        </label>
        <div className="relative">
          <button onClick={() => toggleDrop(id)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors">
            <span className="truncate">
              {sel.length === 0 ? "Selecionar..." : sel.length === 1 ? sel[0] : `${sel.length} selecionados`}
            </span>
            <svg className={"w-3.5 h-3.5 ml-1 flex-shrink-0 text-gray-400 transition-transform " + (open ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input type="text" value={search} onChange={e => setSearch(id, e.target.value)}
                  placeholder="Buscar..." autoFocus
                  className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {filtered_opts.map(name => (
                  <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer select-none">
                    <input type="checkbox" checked={sel.includes(name)}
                      onChange={() => set(sel.includes(name) ? sel.filter(x => x !== name) : [...sel, name])}
                      className="w-3 h-3 rounded accent-blue-600 flex-shrink-0"/>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{name}</span>
                  </label>
                ))}
                {filtered_opts.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Nenhum resultado</p>}
              </div>
              <div className="flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-700">
                {sel.length > 0 && <button onClick={() => { set([]); }} className="text-[10px] text-red-400 hover:text-red-600">Limpar</button>}
                <button onClick={() => toggleDrop(id)} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium ml-auto">Fechar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SEL = (label: string, val: string, set: (v: string) => void, opts: string[]) => (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      <select value={val} onChange={e => set(e.target.value)}
        className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const TABS = ["exec","over","all","tasks","ccw"];
  const TL: Record<string,string> = {exec:tf("tabExec"),over:tf("tabOver"),all:tf("tabAll"),tasks:tf("tabTasks"),ccw:"CCW Subscriptions"};

  // ── exec column defs ─────────────────────────────────────────────────────────
  const COLS_EXEC: Col[] = [
    {key:"customer_name",label:"Cliente"},
    {key:"suites_afetadas",label:"Suites",right:true},
    {key:"subscriptions_afetadas",label:"Subscriptions",right:true},
    {key:"total_excesso",label:"Total Excedente",right:true,fmt:v=>fmtN(v as number,0)},
    {key:"pior_vencimento_dias",label:"Pior Venc. (d)",right:true},
    {key:"nivel_risco",label:"Nível Risco",render:r=><RiskBadge level={r.nivel_risco as string}/>},
    {key:"tasks_abertas",label:"Tasks Abertas",right:true},
    {key:"sem_cobertura",label:"Sem Cobertura",right:true},
    {key:"cobertura_pct",label:"Cobertura (%)",right:true,fmt:v=>fmtN(v as number,0)+"%"},
  ];

  // ── render ───────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  if (isError) return <div className="text-center py-12 text-red-500 text-sm">{tf("errLoad")}</div>;
  if (!allRows.length) return <div className="text-center py-12 text-gray-400 text-sm">{tf("noData")}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tf("title")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tf("subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className={card}>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{tf("filters")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SEL(tf("viewLabel"),viewSel,setViewSel,[tf("viewOverOnly"),tf("viewHighConsumption"),tf("viewAll")])}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {tf("filterCustomer")}{clienteSel.length > 0 && <span className="ml-1 text-blue-500 normal-case font-normal">({clienteSel.length})</span>}
            </label>
            <div className="relative">
              <button onClick={() => setCustomerDropOpen(o => !o)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors">
                <span className="truncate">
                  {clienteSel.length === 0 ? tf("selectCustomers") : clienteSel.length === 1 ? clienteSel[0] : `${clienteSel.length} ${tf("filterCustomer").toLowerCase()}`}
                </span>
                <svg className={"w-3.5 h-3.5 ml-1 flex-shrink-0 text-gray-400 transition-transform " + (customerDropOpen ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {customerDropOpen && (
                <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Buscar..." autoFocus
                      className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {customerOpts.filter(n => n.toLowerCase().includes(customerSearch.toLowerCase())).map(name => (
                      <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer select-none">
                        <input type="checkbox" checked={clienteSel.includes(name)}
                          onChange={() => setClienteSel(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name])}
                          className="w-3 h-3 rounded accent-blue-600 flex-shrink-0"/>
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{name}</span>
                      </label>
                    ))}
                    {customerOpts.filter(n => n.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">Nenhum cliente encontrado</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-700">
                    {clienteSel.length > 0 && <button onClick={() => setClienteSel([])} className="text-[10px] text-red-400 hover:text-red-600">Limpar</button>}
                    <button onClick={() => setCustomerDropOpen(false)} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium ml-auto">Fechar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {SEL(tf("filterTaskStatus"),taskFil,setTaskFil,[tf("taskAll"),tf("taskOpen"),tf("taskNone"),tf("taskClosed")])}
          {SEL(tf("filterUrgency"),urgFil,setUrgFil,[tf("urgAll"),tf("urgCritical"),tf("urgWarning"),tf("urgExpired")])}
        </div>
        {filtered.length === 0 && <p className="mt-3 text-xs text-amber-600">{tf("noRecords")}</p>}
      </div>

      {/* KPIs */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPI label={tf("kpiTotalCases")} value={fmtN(kpis.total,0)}/>
          <KPI label={tf("kpiClientsAffected")} value={fmtN(kpis.clientes,0)}/>
          <KPI label={tf("kpiTotalExcess")} value={fmtN(kpis.excesso,0)} danger={kpis.excesso>0}/>
          <KPI label={tf("kpiNoOpenTask")} value={fmtN(kpis.semTarefa,0)} danger={kpis.semTarefa>0}/>
          <KPI label={tf("kpiOpenTask")} value={fmtN(kpis.comTarefaAberta,0)}/>
          <KPI label={tf("kpiCritical")} value={fmtN(kpis.criticos,0)} danger={kpis.criticos>0}/>
        </div>
      )}

      {/* Chart 1: Bar */}
      {barChart && (
        <div className={card}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{tf("chartTopClients")}</p>
          <Plot data={barChart.traces} layout={{...mkLay(barChart.h),barmode:"stack",xaxis:{...mkLay(barChart.h).xaxis,tickangle:-40},legend:{orientation:"h",y:-0.25}}} useResizeHandler style={{width:"100%"}} config={{displayModeBar:false,responsive:true}}/>
        </div>
      )}

      {/* Charts 2: Pie pair */}
      {urgPie.labels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={card}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{tf("chartUrgency")}</p>
            <Plot data={[{type:"pie",labels:urgPie.labels,values:urgPie.values,marker:{colors:urgPie.colors},textinfo:"label+percent"}]} layout={{...mkLay(300),showlegend:false}} useResizeHandler style={{width:"100%"}} config={{displayModeBar:false,responsive:true}}/>
          </div>
          <div className={card}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{tf("chartTaskStatus")}</p>
            <Plot data={[{type:"pie",labels:taskPie.labels,values:taskPie.values,marker:{colors:taskPie.colors},textinfo:"label+percent"}]} layout={{...mkLay(300),showlegend:false}} useResizeHandler style={{width:"100%"}} config={{displayModeBar:false,responsive:true}}/>
          </div>
        </div>
      )}

      {/* Chart 3: Line series */}
      {lineSeries && (
        <div className={card}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{tf("chartTimeline")}</p>
          <Plot
            data={[
              {type:"scatter",mode:"lines+markers",name:"Total Excedente",x:lineSeries.dates,y:lineSeries.excesso,line:{color:"#F04438",width:2}},
              {type:"scatter",mode:"lines+markers",name:"Qtd. Casos",x:lineSeries.dates,y:lineSeries.casos,yaxis:"y2",line:{color:"#175CD3",width:2,dash:"dot"}},
            ]}
            layout={{...mkLay(320),yaxis:{...mkLay(320).yaxis,title:"Licenças Excedentes"},yaxis2:{title:"Qtd. Casos",overlaying:"y",side:"right",showgrid:false},hovermode:"x unified",legend:{orientation:"h",y:-0.2}}}
            useResizeHandler style={{width:"100%"}} config={{displayModeBar:false,responsive:true}}
          />
        </div>
      )}

      {/* Tabs */}
      <div className={card}>
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              className={"px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors "+(activeTab===t?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
              {TL[t]}
            </button>
          ))}
        </div>

        {/* Exec */}
        {activeTab==="exec" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">{tf("execSubtitle")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label={tf("execClientsExcess")} value={execData.length}/>
              <KPI label={tf("execCriticalExpired")} value={execData.filter(r=>["CRITICO","Expirado"].includes(r.nivel_risco)).length} danger/>
              <KPI label={tf("execNoCoverage")} value={execData.filter(r=>r.sem_cobertura>0).length} danger/>
              <KPI label={tf("kpiTotalExcess")} value={fmtN(execData.reduce((s,r)=>s+r.total_excesso,0),0)} danger/>
            </div>
            {execData.length > 0 && (
              <Plot
                data={[{type:"bar",orientation:"h",x:execData.slice(0,20).map(r=>r.total_excesso),y:execData.slice(0,20).map(r=>r.customer_name),text:execData.slice(0,20).map(r=>String(r.total_excesso)),textposition:"outside",marker:{color:execData.slice(0,20).map(r=>RISK_COLORS[r.nivel_risco]??"#ccc")}}]}
                layout={{...mkLay(Math.max(400,execData.slice(0,20).length*28)),yaxis:{...mkLay(400).yaxis,autorange:"reversed"},title:"Ranking Clientes por Licenças Excedentes (Top 20)",showlegend:false}}
                useResizeHandler style={{width:"100%"}} config={{displayModeBar:false,responsive:true}}
              />
            )}
            <Tbl rows={execData as unknown as Record<string,unknown>[]} cols={COLS_EXEC} title="Ranking Executivo"
              onExport={()=>xlsxExport([{name:"Visão Executiva",rows:execData as unknown as Record<string,unknown>[]}],`cisco_tf_exec_${new Date().toISOString().slice(0,10)}.xlsx`)}/>
          </div>
        )}

        {/* Over */}
        {activeTab==="over" && (
          <div>
              <p className="text-xs text-gray-500 mb-3">{"Casos onde balance < 0. True Forward: o cliente será cobrado pelo pico de consumo atingido."}</p>
            <Tbl rows={filtered.filter(r=>r.is_overconsumption) as unknown as Record<string,unknown>[]} cols={COLS_OVER} title="Consumo Excedente"
              onExport={()=>xlsxExport([{name:"Consumo Excedente",rows:filtered.filter(r=>r.is_overconsumption) as unknown as Record<string,unknown>[]}],`cisco_tf_over_${new Date().toISOString().slice(0,10)}.xlsx`)}/>
          </div>
        )}

        {/* All */}
        {activeTab==="all" && (
          <Tbl rows={filtered as unknown as Record<string,unknown>[]} cols={COLS_ALL} title="Todos os Casos"
            onExport={()=>xlsxExport([{name:"Todos os Casos",rows:filtered as unknown as Record<string,unknown>[]}],`cisco_tf_all_${new Date().toISOString().slice(0,10)}.xlsx`)}/>
        )}

        {/* Tasks */}
        {activeTab==="tasks" && (
          <Tbl rows={filtered.filter(r=>r.task_is_open) as unknown as Record<string,unknown>[]} cols={COLS_TASKS} title="Tarefas Abertas"
            onExport={()=>xlsxExport([{name:"Tarefas Abertas",rows:filtered.filter(r=>r.task_is_open) as unknown as Record<string,unknown>[]}],`cisco_tf_tasks_${new Date().toISOString().slice(0,10)}.xlsx`)}/>
        )}

        {/* CCW */}
        {activeTab==="ccw" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Subscriptions Cisco EA importadas via CCW. Inclui status de consumo, datas de True Forward e Provisioning Status.</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KPI label="Provisioning Incompleto" value={ccwKpis.provIncomplete} danger/>
              <KPI label=">90% Consumido" value={ccwKpis.over90} danger/>
              <KPI label=">100% Consumido" value={ccwKpis.over100} danger/>
              <KPI label="Over Consumed" value={ccwKpis.overConsumed} danger/>
              <KPI label="TF Overage" value={ccwKpis.tfOverage} danger/>
            </div>
            {/* CCW Filters */}
            <div className={card}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Filtros CCW</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                {DropMS("ccw_year","End Year",[...new Set(ccwEnriched.map(r=>r._end_year as string).filter(Boolean))].sort().reverse(),ccwYears,setCcwYears)}
                {DropMS("ccw_cov","Coverage End",CCW_COV.filter(c=>[...new Set(ccwEnriched.map(r=>r._cov as string))].includes(c)),ccwCov,setCcwCov)}
                {DropMS("ccw_stat","Consumption Status",[...new Set(ccwEnriched.map(r=>String(r.consumption_status??"")))].filter(Boolean).sort(),ccwStat,setCcwStat)}
                {DropMS("ccw_rng","Consumed Range",CCW_RNG.filter(c=>[...new Set(ccwEnriched.map(r=>r._cons_rng as string))].includes(c)),ccwRng,setCcwRng)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DropMS("ccw_venc","Ano/Mês Venc.",[...new Set(ccwEnriched.map(r=>r._ym_venc as string).filter(Boolean))].sort(),ccwVenc,setCcwVenc)}
                {DropMS("ccw_tf","Ano/Mês Next TF",[...new Set(ccwEnriched.map(r=>r._ym_tf as string).filter(Boolean))].sort(),ccwTf,setCcwTf)}
                {DropMS("ccw_ea","EA ou Term",[...new Set(ccwEnriched.map(r=>r._ea_term as string))].sort(),ccwEaTerm,setCcwEaTerm)}
              </div>
              {(ccwYears.length||ccwCov.length||ccwVenc.length||ccwStat.length||ccwRng.length||ccwTf.length||ccwEaTerm.length) > 0 && (
                <button onClick={()=>{setCcwYears([]);setCcwCov([]);setCcwVenc([]);setCcwStat([]);setCcwRng([]);setCcwTf([]);setCcwEaTerm([]);setDropStates({});}}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium">Limpar Filtros CCW</button>
              )}
            </div>
            <p className="text-xs text-gray-500">{ccwFiltered.length.toLocaleString()} subscriptions exibidas</p>
            <Tbl rows={ccwFiltered as unknown as Record<string,unknown>[]} cols={COLS_CCW} title="CCW Subscriptions"
              onExport={()=>xlsxExport([{name:"CCW Subscriptions",rows:ccwFiltered as unknown as Record<string,unknown>[]}],`cisco_ccw_${new Date().toISOString().slice(0,10)}.xlsx`)}/>
          </div>
        )}
      </div>
    </div>
  );
}
