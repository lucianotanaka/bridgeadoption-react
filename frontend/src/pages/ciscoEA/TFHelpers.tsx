/**
 * TFHelpers — constants, pure helpers, simple UI atoms for True Forward.
 */
import React from "react";
export const DC = 30, DW = 90;
export const EA_PRODUCTS = new Set(["EA3-M","ELA2-M","A-FLEX","A-FLEX-3"]);
export const RISK_COLORS: Record<string,string> = { Expirado:"#667085",CRITICO:"#F04438",ATENCAO:"#FDB022",OK:"#12B76A","Sem data":"#D0D5DD" };
export const URGENCY_PIE: Record<string,string> = { Expirado:"#667085","Crítico (≤30d)":"#F04438","Atenção (≤90d)":"#FDB022","OK (>90d)":"#12B76A","Sem data":"#D0D5DD" };
export const TASK_PIE: Record<string,string> = { "Tarefa Aberta":"#175CD3","Tarefa Encerrada":"#667085","Sem Tarefa":"#F04438" };
export const CCW_COV = ["Expired","< 30 Days","31-60 Days","61-90 Days","91-120 Days","121-365 D.","> 1 Year","Sem data"];
export const CCW_RNG = ["1) Not Applicable","3) Up to 50%","4) 51%-80%","5) 81%-93%","6) 100%","7) 101%-110%","8) 111%-115%","9) Above 115%"];
export const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";

export const fmtN = (v: number|null|undefined, d=0) =>
  v==null ? "–" : v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
export const fmtD = (v: unknown) => !v ? "–" : String(v).split("T")[0];
export const fmtPct = (v: number|null|undefined) => v==null ? "–" : v.toFixed(1)+"%";

export function urgBucket(d: number|null|undefined): string {
  if(d==null) return "Sem data"; if(d<0) return "Expirado";
  if(d<=DC) return "Crítico (≤30d)"; if(d<=DW) return "Atenção (≤90d)"; return "OK (>90d)";
}
export function urgLabel(d: number|null|undefined): string {
  if(d==null) return "Sem data"; if(d<0) return `Expirado há ${Math.abs(d)}d`;
  if(d<=DC) return `CRÍTICO ${d}d`; if(d<=DW) return `ATENÇÃO ${d}d`; return `OK ${d}d`;
}
export function riskLvl(d: number|null|undefined): string {
  if(d==null) return "Sem data"; if(d<0) return "Expirado";
  if(d<=DC) return "CRITICO"; if(d<=DW) return "ATENCAO"; return "OK";
}
export function covBucket(d: number|null|undefined): string {
  if(d==null) return "Sem data"; if(d<0) return "Expired";
  if(d<=30) return "< 30 Days"; if(d<=60) return "31-60 Days";
  if(d<=90) return "61-90 Days"; if(d<=120) return "91-120 Days";
  if(d<=365) return "121-365 D."; return "> 1 Year";
}
export function consBucket(pct: number|null|undefined): string {
  if(pct==null||pct<=0) return "1) Not Applicable";
  if(pct<=50) return "3) Up to 50%"; if(pct<=80) return "4) 51%-80%";
  if(pct<=93) return "5) 81%-93%"; if(pct<=100) return "6) 100%";
  if(pct<=110) return "7) 101%-110%"; if(pct<=115) return "8) 111%-115%";
  return "9) Above 115%";
}
export function toYM(iso: string|null|undefined): string { return !iso?"":iso.slice(0,7); }
export function sortYM(arr: string[]): string[] {
  return [...arr].sort((a,b)=>{ try{return new Date(a+"-01").getTime()-new Date(b+"-01").getTime();}catch{return 0;} });
}
export function ymLabel(iso: string|null|undefined): string {
  if(!iso) return "";
  try{return new Date(iso+"-01").toLocaleDateString("en-US",{month:"short",year:"2-digit"});}catch{return iso;}
}

export function UrgBadge({days}:{days:number|null|undefined}) {
  let bg="#C6F6D5",fg="#276749";
  if(days==null||days<0){bg="#E2E8F0";fg="#718096";}
  else if(days<=DC){bg="#FED7D7";fg="#9B2335";}
  else if(days<=DW){bg="#FEEBC8";fg="#7B341E";}
  return <span style={{background:bg,color:fg,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{urgLabel(days)}</span>;
}
export function RiskBadge({level}:{level:string}) {
  const c=RISK_COLORS[level]??"#D0D5DD";
  return <span style={{background:c+"22",color:c==="#12B76A"?"#166534":c,border:`1px solid ${c}55`,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:700}}>{level}</span>;
}
export function KPI({label,value,danger}:{label:string;value:string|number;danger?:boolean}) {
  return (
    <div className={card}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={"text-2xl font-bold "+(danger?"text-red-500":"text-blue-600 dark:text-blue-400")}>{value}</p>
    </div>
  );
}
export type Col = { key:string; label:string; fmt?:(v:unknown)=>string; right?:boolean; render?:(row:Record<string,unknown>)=>React.ReactNode };
