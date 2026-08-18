/**
 * AssetPage — Portfolio: Assets — Full migration from Streamlit asset.py
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, X, RefreshCw } from "lucide-react";
import apiClient from "@/api/client";

interface AssetClient { client_id: number; client_name: string; }
interface AssetRow {
  asset_id: number | null; asset_serial_number: string | null; asset_instance_number: string | null;
  asset_subscription_id: string | null; asset_parent_level: string | null;
  asset_parent_serial_number: string | null; asset_parent_instance_number: string | null;
  product_name: string | null; product_manufacturer_name: string | null;
  product_family: string | null; product_group: string | null; product_subtype: string | null;
  vendorasset_vendor_name: string | null; vendorasset_contract_num: string | null;
  vendorasset_customer_name: string | null; vendorasset_start: string | null; vendorasset_end: string | null;
  nttasset_contract_number: string | null; nttasset_entitlement_contract: string | null;
  nttasset_customer_name: string | null; nttasset_contract_start: string | null; nttasset_contract_end: string | null;
  customer_mismatch_flag: string | null; status_consolidated: string | null; alert_reason: string | null;
  product_eos: string | null; product_ldos: string | null; eos_status: string | null; ldos_status: string | null;
  [k: string]: unknown;
}

const COL_ORDER: (keyof AssetRow)[] = [
  "asset_id","vendorasset_vendor_name","product_name","asset_serial_number","asset_instance_number",
  "asset_subscription_id","asset_parent_level","asset_parent_serial_number","asset_parent_instance_number",
  "product_manufacturer_name","product_family","product_group","product_subtype",
  "vendorasset_contract_num","vendorasset_customer_name","nttasset_contract_number",
  "nttasset_entitlement_contract","nttasset_customer_name","vendorasset_start","vendorasset_end",
  "nttasset_contract_start","nttasset_contract_end","customer_mismatch_flag",
  "status_consolidated","alert_reason","product_eos","product_ldos","eos_status","ldos_status",
];
const COL_LABELS: Record<string,string> = {
  asset_id:"Asset ID", product_name:"Product Name", asset_serial_number:"Serial Number",
  asset_instance_number:"Instance Number", asset_subscription_id:"Subscription ID",
  asset_parent_level:"Major/Minor", asset_parent_serial_number:"Parent Serial Number",
  asset_parent_instance_number:"Parent Instance Number", vendorasset_vendor_name:"Vendor",
  product_manufacturer_name:"Manufacturer", product_family:"Product Family",
  product_group:"Product Group", product_subtype:"Asset Type",
  vendorasset_contract_num:"Vendor Contract Number",
  vendorasset_customer_name:"Client Name (Vendor Contract)",
  nttasset_contract_number:"NTT Contract Number", nttasset_entitlement_contract:"Entitlement Contract",
  nttasset_customer_name:"Client Name (NTT Contract)",
  vendorasset_start:"Start Date (Vendor Contract)", vendorasset_end:"End Date (Vendor Contract)",
  nttasset_contract_start:"Start Date (NTT Contract)", nttasset_contract_end:"End Date (NTT Contract)",
  customer_mismatch_flag:"Customer Mismatch Flag", status_consolidated:"Status Consolidated",
  alert_reason:"Alert Reason", product_eos:"EOS", product_ldos:"LDOS",
  eos_status:"EOS Status", ldos_status:"LDOS Status",
};

const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";
const inp = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";
const srch = "w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const PAGE_SIZES = [10,25,50,100];
const Spin = () => <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>;

function getUniq(rows: AssetRow[], key: keyof AssetRow): string[] {
  const s = new Set<string>();
  for (const r of rows) { const v = r[key]; if (v!=null && v!=="") s.add(String(v)); }
  return [...s].sort();
}
function exportCSV(rows: AssetRow[], clientName: string) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const c = clientName.replace(/[^a-zA-Z0-9]/g,"").slice(0,20);
  const hdrs = COL_ORDER.map(k=>`"${(COL_LABELS[k as string]??String(k)).replace(/"/g,'""')}"`).join(",");
  const body = rows.map(r=>COL_ORDER.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+hdrs+"\n"+body],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"),{href:url,download:`${d}_asset_${c}.csv`}).click();
  URL.revokeObjectURL(url);
}

// ─── Client selector (searchable) ────────────────────────
function ClientSelect({clients,value,onChange,loading}:{
  clients:AssetClient[];value:AssetClient|null;
  onChange:(v:AssetClient|null)=>void;loading:boolean;
}) {
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const filtered=useMemo(()=>q.trim()?clients.filter(c=>c.client_name.toLowerCase().includes(q.toLowerCase())):clients,[clients,q]);
  return (
    <div className="relative flex-1 min-w-[260px]">
      <button type="button" disabled={loading} onClick={()=>{setOpen(o=>!o);setQ("");}}
        className={`${inp} text-left flex items-center justify-between gap-1 disabled:opacity-40`}>
        <span className={`truncate ${value?"text-gray-700 dark:text-gray-300":"text-gray-400"}`}>
          {loading?"Loading clients…":value?value.client_name:"Select a customer..."}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value&&<span onClick={e=>{e.stopPropagation();onChange(null);}} className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]">✕</span>}
          <span className="text-gray-400 text-[10px]">▾</span>
        </div>
      </button>
      {open&&!loading&&(
        <>
          <div className="fixed inset-0 z-20" onClick={()=>{setOpen(false);setQ("");}}/>
          <div className="absolute top-full mt-1 z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col" style={{maxHeight:300}}>
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" onClick={e=>e.stopPropagation()} className={srch}/>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length===0&&<p className="px-3 py-2 text-xs text-gray-400">No results</p>}
              {filtered.map(c=>(
                <button key={c.client_id} type="button" onClick={()=>{onChange(c);setOpen(false);setQ("");}}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value?.client_id===c.client_id?"bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium":"text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {c.client_name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── MultiSelect filter ───────────────────────────────────
function MultiSelect({label,options,value,onChange}:{
  label:string;options:string[];value:string[];onChange:(v:string[])=>void;
}) {
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const toggle=(opt:string)=>onChange(value.includes(opt)?value.filter(v=>v!==opt):[...value,opt]);
  const filtered=q.trim()?options.filter(o=>o.toLowerCase().includes(q.toLowerCase())):options;
  return (
    <div className="relative flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      <button type="button" onClick={()=>{setOpen(o=>!o);setQ("");}}
        className={`${inp} text-left flex items-center justify-between gap-1`}>
        <span className="truncate text-xs">
          {value.length===0?"All":value.length===1?value[0]:`${value.length} sel.`}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value.length>0&&<span onClick={e=>{e.stopPropagation();onChange([]);}} className="text-gray-400 hover:text-red-500 cursor-pointer text-[10px]">✕</span>}
          <span className="text-gray-400 text-[10px]">▾</span>
        </div>
      </button>
      {open&&(
        <>
          <div className="fixed inset-0 z-20" onClick={()=>{setOpen(false);setQ("");}}/>
          <div className="absolute top-full mt-1 z-30 w-max min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg flex flex-col" style={{maxHeight:260}}>
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" onClick={e=>e.stopPropagation()} className={srch}/>
            </div>
            <div className="overflow-y-auto flex-1">
              {value.length>0&&!q&&(
                <button type="button" onClick={()=>{onChange([]);setOpen(false);}}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 border-b border-gray-100 dark:border-gray-700">
                  Clear all
                </button>
              )}
              {filtered.length===0&&<p className="px-3 py-2 text-xs text-gray-400">No results</p>}
              {filtered.map(opt=>(
                <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input type="checkbox" checked={value.includes(opt)} onChange={()=>toggle(opt)} className="rounded accent-blue-600"/>{opt}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pagination bar ───────────────────────────────────────
function PaginationBar({total,page,pageSize,onPage,onPageSize}:{total:number;page:number;pageSize:number;onPage:(p:number)=>void;onPageSize:(ps:number)=>void}) {
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const from=total===0?0:(page-1)*pageSize+1;
  const to=Math.min(page*pageSize,total);
  const btnB="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const btnA=`${btnB} bg-blue-600 text-white`;
  const btnI=`${btnB} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed`;
  const ws=5; let start=Math.max(1,page-Math.floor(ws/2));
  const end=Math.min(totalPages,start+ws-1);
  if(end-start<ws-1) start=Math.max(1,end-ws+1);
  const pages=Array.from({length:end-start+1},(_,i)=>start+i);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong></span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Per page</span>
          <select value={pageSize} onChange={e=>{onPageSize(Number(e.target.value));onPage(1);}}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
            {PAGE_SIZES.map(ps=><option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={()=>onPage(1)} disabled={page===1} className={btnI}>«</button>
        <button onClick={()=>onPage(page-1)} disabled={page===1} className={btnI}>‹</button>
        {start>1&&<span className="text-xs text-gray-400 px-1">…</span>}
        {pages.map(p=><button key={p} onClick={()=>onPage(p)} className={p===page?btnA:btnI}>{p}</button>)}
        {end<totalPages&&<span className="text-xs text-gray-400 px-1">…</span>}
        <button onClick={()=>onPage(page+1)} disabled={page>=totalPages} className={btnI}>›</button>
        <button onClick={()=>onPage(totalPages)} disabled={page>=totalPages} className={btnI}>»</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function AssetPage() {
  // Client selection state
  const [client,setClient]=useState<AssetClient|null>(null);
  const [activeClient,setActiveClient]=useState<AssetClient|null>(null);
  const [loaded,setLoaded]=useState(false);

  // Filter state (11 filters matching Streamlit)
  const [fVendor,setFVendor]=useState<string[]>([]);
  const [fProduct,setFProduct]=useState<string[]>([]);
  const [fNttContract,setFNttContract]=useState<string[]>([]);
  const [fSubs,setFSubs]=useState<string[]>([]);
  const [fSerial,setFSerial]=useState<string[]>([]);
  const [fInstance,setFInstance]=useState<string[]>([]);
  const [fMajorMinor,setFMajorMinor]=useState<string[]>([]);
  const [fStatus,setFStatus]=useState<string[]>([]);
  const [fAlert,setFAlert]=useState<string[]>([]);
  const [fEos,setFEos]=useState<string[]>([]);
  const [fLdos,setFLdos]=useState<string[]>([]);

  // Pagination
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(50);

  // Queries
  const clientsQ=useQuery({
    queryKey:["asset-clients"],
    queryFn:()=>apiClient.get<AssetClient[]>("/portfolio/asset-clients").then(r=>r.data),
    staleTime:10*60*1000,
  });

  const assetsQ=useQuery({
    queryKey:["portfolio-assets",activeClient?.client_id],
    queryFn:()=>apiClient.get<AssetRow[]>("/portfolio/assets",{params:{customer_id:activeClient!.client_id}}).then(r=>r.data),
    enabled:loaded&&!!activeClient,
    staleTime:5*60*1000,
  });

  const clients=clientsQ.data??[];
  const allRows=assetsQ.data??[];

  function handleLoad() {
    if(!client) return;
    setActiveClient(client);
    setLoaded(true);
    setPage(1);
    resetFilters();
    if(activeClient?.client_id===client.client_id) void assetsQ.refetch();
  }
  function resetFilters(){setFVendor([]);setFProduct([]);setFNttContract([]);setFSubs([]);setFSerial([]);setFInstance([]);setFMajorMinor([]);setFStatus([]);setFAlert([]);setFEos([]);setFLdos([]);}
  const anyFilter=fVendor.length||fProduct.length||fNttContract.length||fSubs.length||fSerial.length||fInstance.length||fMajorMinor.length||fStatus.length||fAlert.length||fEos.length||fLdos.length;

  // Summary cards
  const total=allRows.length;
  const hasVendor=(r:AssetRow)=>!!r.vendorasset_contract_num;
  const hasNtt=(r:AssetRow)=>!!r.nttasset_contract_number;
  const vendorOnly=allRows.filter(r=>hasVendor(r)&&!hasNtt(r)).length;
  const nttOnly=allRows.filter(r=>!hasVendor(r)&&hasNtt(r)).length;
  const both=allRows.filter(r=>hasVendor(r)&&hasNtt(r)).length;
  const pct=(n:number)=>total>0?`(${(n/total*100).toFixed(1)}%)`:"";

  // Filter options (from full dataset)
  const optVendor=useMemo(()=>getUniq(allRows,"vendorasset_vendor_name"),[allRows]);
  const optProduct=useMemo(()=>getUniq(allRows,"product_name"),[allRows]);
  const optNttContract=useMemo(()=>getUniq(allRows,"nttasset_contract_number"),[allRows]);
  const optSubs=useMemo(()=>getUniq(allRows,"asset_subscription_id"),[allRows]);
  const optSerial=useMemo(()=>getUniq(allRows,"asset_serial_number"),[allRows]);
  const optInstance=useMemo(()=>getUniq(allRows,"asset_instance_number"),[allRows]);
  const optMajorMinor=useMemo(()=>getUniq(allRows,"asset_parent_level"),[allRows]);
  const optStatus=useMemo(()=>getUniq(allRows,"status_consolidated"),[allRows]);
  const optAlert=useMemo(()=>getUniq(allRows,"alert_reason"),[allRows]);
  const optEos=useMemo(()=>getUniq(allRows,"eos_status"),[allRows]);
  const optLdos=useMemo(()=>getUniq(allRows,"ldos_status"),[allRows]);

  // Apply filters
  const filtered=useMemo(()=>{
    let rows=allRows;
    if(fVendor.length) rows=rows.filter(r=>fVendor.includes(String(r.vendorasset_vendor_name??"")));
    if(fProduct.length) rows=rows.filter(r=>fProduct.includes(String(r.product_name??"")));
    if(fNttContract.length) rows=rows.filter(r=>fNttContract.includes(String(r.nttasset_contract_number??"")));
    if(fSubs.length) rows=rows.filter(r=>fSubs.includes(String(r.asset_subscription_id??"")));
    if(fSerial.length) rows=rows.filter(r=>fSerial.includes(String(r.asset_serial_number??"")));
    if(fInstance.length) rows=rows.filter(r=>fInstance.includes(String(r.asset_instance_number??"")));
    if(fMajorMinor.length) rows=rows.filter(r=>fMajorMinor.includes(String(r.asset_parent_level??"")));
    if(fStatus.length) rows=rows.filter(r=>fStatus.includes(String(r.status_consolidated??"")));
    if(fAlert.length) rows=rows.filter(r=>fAlert.includes(String(r.alert_reason??"")));
    if(fEos.length) rows=rows.filter(r=>fEos.includes(String(r.eos_status??"")));
    if(fLdos.length) rows=rows.filter(r=>fLdos.includes(String(r.ldos_status??"")));
    return rows;
  },[allRows,fVendor,fProduct,fNttContract,fSubs,fSerial,fInstance,fMajorMinor,fStatus,fAlert,fEos,fLdos]);

  useMemo(()=>{setPage(1);},[filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const paginated=useMemo(()=>filtered.slice((page-1)*pageSize,page*pageSize),[filtered,page,pageSize]);

  const cardSt="text-center text-sm font-semibold p-3 rounded-lg border border-gray-200 dark:border-gray-700";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio — Assets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customer Asset Portfolio</p>
        </div>
        {loaded&&allRows.length>0&&(
          <div className="flex items-center gap-2">
            <button onClick={()=>exportCSV(filtered,activeClient?.client_name??"")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download size={13}/> Export CSV
            </button>
            <button onClick={()=>void assetsQ.refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <RefreshCw size={13} className={assetsQ.isFetching?"animate-spin":""}/>
            </button>
          </div>
        )}
      </div>

      {/* Client selector card */}
      <div className={card}>
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Select Client</p>
        <div className="flex flex-wrap items-end gap-3">
          <ClientSelect clients={clients} value={client} onChange={setClient} loading={clientsQ.isLoading}/>
          <button onClick={handleLoad} disabled={!client||assetsQ.isFetching}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
            {assetsQ.isFetching?<Spin/>:<Search size={13}/>} Load Assets
          </button>
        </div>
        {clientsQ.isError&&<p className="text-xs text-red-500 mt-2">Failed to load clients.</p>}
      </div>

      {/* Not loaded yet */}
      {!loaded&&(
        <div className={card}>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Select a client and click <strong>Load Assets</strong>.</p>
        </div>
      )}

      {/* Loading */}
      {loaded&&assetsQ.isLoading&&(
        <div className={`${card} flex items-center justify-center gap-3 py-12`}>
          <Spin/><span className="text-sm text-gray-500 dark:text-gray-400">Loading assets…</span>
        </div>
      )}

      {/* Error */}
      {loaded&&assetsQ.isError&&(
        <div className={card}>
          <p className="text-sm text-red-500 text-center py-8">Failed to load assets. Please try again.</p>
        </div>
      )}

      {/* No data */}
      {loaded&&!assetsQ.isLoading&&!assetsQ.isError&&allRows.length===0&&(
        <div className={card}>
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center py-8">No assets found for this client.</p>
        </div>
      )}

      {/* Data loaded */}
      {loaded&&!assetsQ.isLoading&&!assetsQ.isError&&allRows.length>0&&(
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={cardSt}><p className="text-[10px] text-gray-400 mb-1">Total Assets</p><strong>{total}</strong></div>
            <div className={cardSt}><p className="text-[10px] text-gray-400 mb-1">Vendor Only</p><strong>{vendorOnly} {pct(vendorOnly)}</strong></div>
            <div className={cardSt}><p className="text-[10px] text-gray-400 mb-1">NTT Only</p><strong>{nttOnly} {pct(nttOnly)}</strong></div>
            <div className={cardSt}><p className="text-[10px] text-gray-400 mb-1">Vendor + NTT</p><strong>{both} {pct(both)}</strong></div>
          </div>

          {/* Filters */}
          <div className={card}>
            <div className="flex flex-wrap gap-3">
              <MultiSelect label="Vendor" options={optVendor} value={fVendor} onChange={setFVendor}/>
              <MultiSelect label="Product Name" options={optProduct} value={fProduct} onChange={setFProduct}/>
              <MultiSelect label="NTT Contract" options={optNttContract} value={fNttContract} onChange={setFNttContract}/>
              <MultiSelect label="Subscription ID" options={optSubs} value={fSubs} onChange={setFSubs}/>
              <MultiSelect label="Serial Number" options={optSerial} value={fSerial} onChange={setFSerial}/>
              <MultiSelect label="Instance Number" options={optInstance} value={fInstance} onChange={setFInstance}/>
              <MultiSelect label="Major/Minor" options={optMajorMinor} value={fMajorMinor} onChange={setFMajorMinor}/>
              <MultiSelect label="Status" options={optStatus} value={fStatus} onChange={setFStatus}/>
              <MultiSelect label="Alert Reason" options={optAlert} value={fAlert} onChange={setFAlert}/>
              <MultiSelect label="EOS Status" options={optEos} value={fEos} onChange={setFEos}/>
              <MultiSelect label="LDOS Status" options={optLdos} value={fLdos} onChange={setFLdos}/>
              {!!anyFilter&&(
                <div className="flex flex-col justify-end">
                  <button type="button" onClick={resetFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-lg">
                    <X size={12}/> Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className={card}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {filtered.length} assets — {activeClient?.client_name}
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {COL_ORDER.map(k=>(
                      <th key={String(k)} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {COL_LABELS[k as string]??String(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length===0&&(
                    <tr><td colSpan={COL_ORDER.length} className="px-3 py-8 text-center text-gray-400">No data matches the current filters.</td></tr>
                  )}
                  {paginated.map((row,i)=>(
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {COL_ORDER.map(k=>{
                        const v=row[k];
                        const s=v==null||v===""?null:String(v);
                        return (
                          <td key={String(k)} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 align-top whitespace-nowrap">
                            {s?s:<span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar total={filtered.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}/>
          </div>
        </>
      )}
    </div>
  );
}
