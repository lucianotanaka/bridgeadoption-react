/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Edit2, Trash2, Plus, Save, X } from "lucide-react";
import apiClient from "@/api/client";

type Row = Record<string, unknown>;
interface Co { company_id: number; company_type?: string|null; company_name?: string|null; company_is_vendor?: string|null; company_vertical?: string|null; [key:string]: unknown; }
type SM = "none"|"name"|"id";
const TABS = ["tbCompany","tbCompanyListName","tbCiscoEA","tbProject","tbNotaFiscalAsset","tbContractNTTAsset","tbContractVendorAsset","tbTask","tbAccountTeam"] as const;
type Tab = typeof TABS[number];
function norm(s:string){return s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}

function Grid({rows,selId,idKey,onSel,mc=10,h="220px"}:{rows:Row[];selId?:number|null;idKey?:string;onSel?:(id:number|null)=>void;mc?:number;h?:string;}){
  if(!rows.length) return <div className="flex items-center justify-center h-14 text-gray-400 text-xs border border-gray-200 dark:border-gray-700 rounded-lg">No data available.</div>;
  const cols=Object.keys(rows[0]).slice(0,mc);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div style={{maxHeight:h}} className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10"><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{cols.map(c=><th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{c}</th>)}</tr></thead>
          <tbody>{rows.map((row,i)=>{const rid=idKey?(row[idKey] as number):i;const isSel=!!(idKey&&selId!=null&&selId===rid);return(<tr key={i} onClick={()=>onSel&&idKey&&onSel(isSel?null:(row[idKey] as number))} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${onSel?"cursor-pointer":""} ${isSel?"bg-blue-50 dark:bg-blue-900/20":"hover:bg-gray-50 dark:hover:bg-gray-800/40"}`}>{cols.map(c=><td key={c} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-xs truncate">{row[c]==null?<span className="text-gray-300 italic">null</span>:String(row[c])}</td>)}</tr>);})}</tbody>
        </table>
      </div>
      <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">{rows.length} record(s)</div>
    </div>
  );
}
const Spin=()=><div className="flex items-center gap-2 text-xs text-gray-500 py-3"><div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>Loading...</div>;
const ic="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const bp="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const bs="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const bw="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
export default function AdminCompaniesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SM>("none");
  const [results, setResults] = useState<Co[]>([]);
  const [singleId, setSingleId] = useState<number|null>(null);
  const [selCo, setSelCo] = useState<number|null>(null);
  const [tab, setTab] = useState<Tab>("tbCompany");
  const [cF, setCF] = useState<null|"edit"|"insert"|"vacate">(null);
  const [cE, setCE] = useState({company_name:"",company_type:"",company_is_vendor:"NO",company_vertical:""});
  const [lF, setLF] = useState<null|"edit"|"insert"|"vacate">(null);
  const [selLn, setSelLn] = useState<number|null>(null);
  const [lE, setLE] = useState({cid:0,name:""});
  const [lIns, setLIns] = useState("");
  const [selEa, setSelEa] = useState<number|null>(null);
  const [eaEd, setEaEd] = useState(false);
  const [eaCid, setEaCid] = useState(0);
  const [msg, setMsg] = useState<{ok:boolean;s:string}|null>(null);

  const flash = useCallback((ok:boolean,s:string)=>{setMsg({ok,s});setTimeout(()=>setMsg(null),4000);},[]);
  const effId = mode==="id" ? singleId : mode==="name" ? selCo : null;
  const allIds = results.map(r=>r.company_id);
  function rf(){ setCF(null); setLF(null); setSelLn(null); setSelEa(null); setEaEd(false); }
  function inv(){ void qc.invalidateQueries({queryKey:["co-tab"]}); }

  const tabQ = useQuery<Row[]>({
    queryKey: effId ? ["co-tab",tab,"s",effId] : ["co-tab",tab,"m",allIds.join(",")],
    queryFn: async () => {
      if(effId){ const r=await apiClient.get<Row[]>(`/admin/companies/${effId}/tab/${tab}`); return r.data; }
      if(mode==="name"&&allIds.length){ const r=await apiClient.post<Row[]>("/admin/companies/tab-multi",{tab_name:tab,company_ids:allIds}); return r.data; }
      return [];
    },
    enabled: tab!=="tbCompany" && (!!effId||(mode==="name"&&allIds.length>0)),
    staleTime: 0,
  });

  function doSearch(){ const raw=q.trim(); if(!raw) return; if(/^\d+$/.test(raw)) byIdM.mutate(Number(raw)); else byNmM.mutate(raw); }

  const byNmM = useMutation({mutationFn:(n:string)=>apiClient.get<Co[]>(`/admin/companies/search?name=${encodeURIComponent(n)}`).then(r=>r.data),onSuccess:(d)=>{setResults(d);setMode("name");setSelCo(null);setSingleId(null);setTab("tbCompany");rf();},onError:()=>flash(false,"Search failed")});
  const byIdM = useMutation({mutationFn:(id:number)=>apiClient.get<Co>(`/admin/companies/${id}`).then(r=>r.data),onSuccess:(d)=>{if(!d?.company_id){flash(false,"Not found");return;}setSingleId(d.company_id);setResults([d]);setMode("id");setSelCo(null);setTab("tbCompany");rf();},onError:()=>flash(false,"Not found")});
  const createM = useMutation({mutationFn:(b:Row)=>apiClient.post<{company_id:number}>("/admin/companies",b).then(r=>r.data),onSuccess:(d)=>{flash(true,`Created — ID ${d.company_id}`);setCF(null);doSearch();},onError:(e:Error)=>flash(false,e.message)});
  const updateM = useMutation({mutationFn:({id,b}:{id:number;b:Row})=>apiClient.put(`/admin/companies/${id}`,b).then(r=>r.data),onSuccess:()=>{flash(true,"Updated");setCF(null);doSearch();},onError:(e:Error)=>flash(false,e.message)});
  const vacateM = useMutation({mutationFn:(id:number)=>apiClient.post(`/admin/companies/${id}/vacate`).then(r=>r.data),onSuccess:()=>{flash(true,"Vacated");setCF(null);setSelCo(null);doSearch();},onError:(e:Error)=>flash(false,e.message)});
  const lnAddM = useMutation({mutationFn:({cid,name}:{cid:number;name:string})=>apiClient.post(`/admin/companies/${cid}/names`,{name}).then(r=>r.data),onSuccess:()=>{flash(true,"Name added");setLF(null);setLIns("");inv();},onError:(e:Error)=>flash(false,e.message)});
  const lnUpdM = useMutation({mutationFn:({id,cid,name}:{id:number;cid:number;name:string})=>apiClient.put(`/admin/companies/names/${id}`,{company_id:cid,name}).then(r=>r.data),onSuccess:()=>{flash(true,"Name updated");setLF(null);inv();},onError:(e:Error)=>flash(false,e.message)});
  const lnVacM = useMutation({mutationFn:(id:number)=>apiClient.post(`/admin/companies/names/${id}/vacate`).then(r=>r.data),onSuccess:()=>{flash(true,"Name vacated");setLF(null);setSelLn(null);inv();},onError:(e:Error)=>flash(false,e.message)});
  const eaUpdM = useMutation({mutationFn:({eid,cid}:{eid:number;cid:number})=>apiClient.put(`/admin/cisco-ea/${eid}/customer`,{end_customer_id:cid}).then(r=>r.data),onSuccess:()=>{flash(true,"EA updated");setEaEd(false);setSelEa(null);inv();},onError:(e:Error)=>flash(false,e.message)});
function renderCoTab() {
    const coId = effId ?? (mode==="name" ? selCo : null);
    const row = coId ? results.find(r=>r.company_id===coId) : null;
    return (
      <div className="space-y-3">
        <Grid rows={results} selId={mode==="name"?selCo:null} idKey="company_id" onSel={mode==="name"?(id)=>{setSelCo(id);rf();}:undefined}/>
        {mode==="name" && <p className="text-xs text-gray-400 dark:text-gray-500">💡 Click a row to select a company and filter the other tabs.</p>}
        <div className="flex gap-2 flex-wrap">
          <button className={bs} disabled={!coId} onClick={()=>{if(!row)return;setCE({company_name:String(row.company_name??""),company_type:String(row.company_type??""),company_is_vendor:String(row.company_is_vendor??"NO"),company_vertical:String(row.company_vertical??"")});setCF("edit");setLF(null);}}><Edit2 size={12}/>Edit</button>
          <button className={bw} disabled={!coId} onClick={()=>{setCF("vacate");setLF(null);}}><Trash2 size={12}/>Vacate</button>
          <button className={bp} onClick={()=>{setCF("insert");setCE({company_name:"",company_type:"",company_is_vendor:"NO",company_vertical:""});setLF(null);}}><Plus size={12}/>Insert</button>
        </div>
        {cF==="edit" && coId && (<div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 bg-blue-50/20 dark:bg-blue-900/10">
          <p className="text-xs font-bold text-gray-500 uppercase">Editing ID {coId}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">company_name *</label><input className={ic} value={cE.company_name} onChange={e=>setCE(p=>({...p,company_name:e.target.value}))}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_type</label><input className={ic} value={cE.company_type} onChange={e=>setCE(p=>({...p,company_type:e.target.value}))}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_is_vendor</label><select className={ic} value={cE.company_is_vendor} onChange={e=>setCE(p=>({...p,company_is_vendor:e.target.value}))}><option>NO</option><option>YES</option></select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_vertical</label><input className={ic} value={cE.company_vertical} onChange={e=>setCE(p=>({...p,company_vertical:e.target.value}))}/></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={updateM.isPending} onClick={()=>{if(!cE.company_name.trim()){flash(false,"company_name required");return;}updateM.mutate({id:coId,b:{company_name:norm(cE.company_name),company_type:norm(cE.company_type)||null,company_is_vendor:cE.company_is_vendor,company_vertical:norm(cE.company_vertical)||null}});}}><Save size={12}/>Save</button>
            <button className={bs} onClick={()=>setCF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
        {cF==="insert" && (<div className="border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50/20 dark:bg-green-900/10">
          <p className="text-xs font-bold text-gray-500 uppercase">New Company</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">company_name *</label><input className={ic} value={cE.company_name} onChange={e=>setCE(p=>({...p,company_name:e.target.value}))}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_type</label><input className={ic} value={cE.company_type} onChange={e=>setCE(p=>({...p,company_type:e.target.value}))}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_is_vendor</label><select className={ic} value={cE.company_is_vendor} onChange={e=>setCE(p=>({...p,company_is_vendor:e.target.value}))}><option>NO</option><option>YES</option></select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">company_vertical</label><input className={ic} value={cE.company_vertical} onChange={e=>setCE(p=>({...p,company_vertical:e.target.value}))}/></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={createM.isPending} onClick={()=>{if(!cE.company_name.trim()){flash(false,"company_name required");return;}createM.mutate({company_name:norm(cE.company_name),company_type:norm(cE.company_type)||null,company_is_vendor:cE.company_is_vendor,company_vertical:norm(cE.company_vertical)||null});}}><Save size={12}/>Save</button>
            <button className={bs} onClick={()=>setCF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
        {cF==="vacate" && coId && (<div className="border border-amber-200 dark:border-amber-700 rounded-lg p-4 space-y-3 bg-amber-50/20 dark:bg-amber-900/10">
          <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Vacate company ID {coId}? All fields will be cleared.</p>
          <div className="flex gap-2">
            <button className={bw} disabled={vacateM.isPending} onClick={()=>vacateM.mutate(coId)}><Save size={12}/>Confirm</button>
            <button className={bs} onClick={()=>setCF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
      </div>
    );
  }

  function renderLnTab() {
    const data = (tabQ.data ?? []) as Row[];
    const lnData = data as unknown as {companylistname_id:number;companylistname_company_id:number;companylistname_name:string}[];
    const selRow = selLn ? lnData.find(r=>r.companylistname_id===selLn) : null;
    const insCompanyId = effId ?? (selRow ? selRow.companylistname_company_id : 0);
    return (
      <div className="space-y-3">
        {tabQ.isLoading ? <Spin/> : <Grid rows={data} selId={selLn} idKey="companylistname_id" onSel={(id)=>{setSelLn(id);setLF(null);}}/>}
        <div className="flex gap-2 flex-wrap">
          <button className={bs} disabled={!selLn} onClick={()=>{if(!selRow)return;setLE({cid:selRow.companylistname_company_id,name:selRow.companylistname_name});setLF("edit");}}><Edit2 size={12}/>Edit</button>
          <button className={bw} disabled={!selLn} onClick={()=>setLF("vacate")}><Trash2 size={12}/>Vacate</button>
          <button className={bp} disabled={!insCompanyId} onClick={()=>{setLIns("");setLF("insert");}}><Plus size={12}/>Insert</button>
        </div>
        {lF==="edit" && selLn && selRow && (<div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 bg-blue-50/20 dark:bg-blue-900/10">
          <p className="text-xs font-bold text-gray-500 uppercase">Editing listname ID {selLn}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">company_id</label><input type="number" className={ic} value={lE.cid} onChange={e=>setLE(p=>({...p,cid:Number(e.target.value)}))}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">name *</label><input className={ic} value={lE.name} onChange={e=>setLE(p=>({...p,name:e.target.value}))}/></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={lnUpdM.isPending} onClick={()=>{if(!lE.name.trim()){flash(false,"name required");return;}lnUpdM.mutate({id:selLn,cid:lE.cid,name:norm(lE.name)});}}><Save size={12}/>Save</button>
            <button className={bs} onClick={()=>setLF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
        {lF==="vacate" && selLn && (<div className="border border-amber-200 dark:border-amber-700 rounded-lg p-4 space-y-3 bg-amber-50/20 dark:bg-amber-900/10">
          <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Vacate listname ID {selLn}?</p>
          <div className="flex gap-2">
            <button className={bw} disabled={lnVacM.isPending} onClick={()=>lnVacM.mutate(selLn)}><Save size={12}/>Confirm</button>
            <button className={bs} onClick={()=>setLF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
        {lF==="insert" && insCompanyId>0 && (<div className="border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50/20 dark:bg-green-900/10">
          <p className="text-xs font-bold text-gray-500 uppercase">New name for company ID {insCompanyId}</p>
          <input className={ic} placeholder="NAME" value={lIns} onChange={e=>setLIns(e.target.value)}/>
          <div className="flex gap-2">
            <button className={bp} disabled={lnAddM.isPending} onClick={()=>{if(!lIns.trim()){flash(false,"name required");return;}lnAddM.mutate({cid:insCompanyId,name:norm(lIns)});}}><Save size={12}/>Save</button>
            <button className={bs} onClick={()=>setLF(null)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
      </div>
    );
  }
function renderEaTab() {
    const data = (tabQ.data ?? []) as Row[];
    const eaData = data as unknown as {ea_id:number;ea_end_customer_id:number|null}[];
    const selRow = selEa ? eaData.find(r=>r.ea_id===selEa) : null;
    return (
      <div className="space-y-3">
        {tabQ.isLoading ? <Spin/> : <Grid rows={data} selId={selEa} idKey="ea_id" onSel={(id)=>{setSelEa(id);setEaEd(false);}}/>}
        <div className="flex gap-2">
          <button className={bs} disabled={!selEa} onClick={()=>{if(!selRow)return;setEaCid(selRow.ea_end_customer_id??0);setEaEd(true);}}><Edit2 size={12}/>Edit ea_end_customer_id</button>
        </div>
        {eaEd && selEa && (<div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 bg-blue-50/20 dark:bg-blue-900/10">
          <p className="text-xs font-bold text-gray-500 uppercase">Editing ea_id {selEa}</p>
          <div><label className="text-xs text-gray-500 mb-1 block">ea_end_customer_id</label><input type="number" className={ic} value={eaCid} onChange={e=>setEaCid(Number(e.target.value))}/></div>
          <div className="flex gap-2">
            <button className={bp} disabled={eaUpdM.isPending} onClick={()=>eaUpdM.mutate({eid:selEa,cid:eaCid})}><Save size={12}/>Save</button>
            <button className={bs} onClick={()=>setEaEd(false)}><X size={12}/>Cancel</button>
          </div>
        </div>)}
      </div>
    );
  }

  function renderGenericTab() {
    if(tabQ.isLoading) return <Spin/>;
    return <Grid rows={tabQ.data??[]} h="300px"/>;
  }

  function renderTabContent() {
    if(tab==="tbCompany") return renderCoTab();
    if(tab==="tbCompanyListName") return renderLnTab();
    if(tab==="tbCiscoEA") return renderEaTab();
    if(mode==="none") return <p className="text-xs text-gray-400">Use the search above to load data.</p>;
    return renderGenericTab();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Companies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Company & Customer Management</p>
        </div>
        <button className={bs} onClick={()=>doSearch()} title="Refresh"><RefreshCw size={14}/>Refresh</button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-medium ${msg.ok?"bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800":"bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
          {msg.s}
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            className={ic}
            placeholder="Search by company_name... (or numeric ID)"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&doSearch()}
          />
          <button className={bp} onClick={doSearch} disabled={byNmM.isPending||byIdM.isPending}>
            <Search size={13}/>{(byNmM.isPending||byIdM.isPending)?"Searching...":"Search"}
          </button>
        </div>
        {mode!=="none" && results.length>0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {mode==="name" ? `${results.length} company(ies) found` : `Company ID ${singleId}`}
            {selCo && mode==="name" ? ` — selected: ID ${selCo}` : ""}
          </p>
        )}
      </div>

      {/* Tabs + Content */}
      {mode!=="none" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-2">
            {TABS.map(t=>(
              <button key={t} onClick={()=>{setTab(t);rf();}}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab===t?"bg-blue-600 text-white":"text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                {t.replace("tb","")}
              </button>
            ))}
          </div>
          {/* Tab content */}
          {renderTabContent()}
        </div>
      )}

      {mode==="none" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No data available.</p>
        </div>
      )}
    </div>
  );
}
