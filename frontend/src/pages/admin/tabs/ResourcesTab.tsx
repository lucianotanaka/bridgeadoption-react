import { useState } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Plus, Edit2, Save, X, RefreshCw } from "lucide-react";
import type { ResourceRow } from "../AdminRolesPage";

const ic = "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const bp = "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const bs = "flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const B = ({ v }: { v: number }) => <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${v ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{v}</span>;

interface Props {
  resourcesQ: UseQueryResult<ResourceRow[]>;
  createResMut: UseMutationResult<unknown, Error, { resource_key: string; resource_name: string; resource_icon: string }>;
  updateResMut: UseMutationResult<unknown, Error, { id: number; resource_key: string; resource_name: string; resource_icon: string }>;
  toggleResMut: UseMutationResult<unknown, Error, number>;
}

export default function ResourcesTab({ resourcesQ, createResMut, updateResMut, toggleResMut }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ resource_key: "", resource_name: "", resource_icon: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ resource_key: "", resource_name: "", resource_icon: "" });
  const [filterText, setFilterText] = useState("");
  const resources = resourcesQ.data ?? [];
  const filtered = filterText ? resources.filter(r => r.resource_key.includes(filterText.toLowerCase()) || (r.resource_name ?? "").toLowerCase().includes(filterText.toLowerCase())) : resources;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className={ic + " max-w-xs"} placeholder="Filter by key or name..." value={filterText} onChange={e => setFilterText(e.target.value)} />
        <span className="text-xs text-gray-400">{filtered.length} / {resources.length}</span>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-14">id</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-48">resource_key</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">resource_name</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-24">resource_icon</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-20">is_active</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-28">Actions</th>
            </tr></thead>
            <tbody>
              {resourcesQ.isLoading ? <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">No resources found.</td></tr>
              : filtered.map(r => (
                <tr key={r.resource_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  {editId === r.resource_id ? <>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.resource_id}</td>
                    <td className="px-3 py-1.5"><input className={ic} value={editData.resource_key} onChange={e => setEditData(p => ({ ...p, resource_key: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") }))} /></td>
                    <td className="px-3 py-1.5"><input className={ic} value={editData.resource_name} onChange={e => setEditData(p => ({ ...p, resource_name: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className={ic} value={editData.resource_icon} onChange={e => setEditData(p => ({ ...p, resource_icon: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><B v={r.is_active} /></td>
                    <td className="px-3 py-1.5"><div className="flex gap-1">
                      <button onClick={() => { updateResMut.mutate({ id: r.resource_id, ...editData }); setEditId(null); }} disabled={updateResMut.isPending || !editData.resource_key.trim()} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 disabled:opacity-40" title="Save"><Save size={13} /></button>
                      <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Cancel"><X size={13} /></button>
                    </div></td>
                  </> : <>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.resource_id}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-800 dark:text-gray-200">{r.resource_key}</td>
                    <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 truncate max-w-xs">{r.resource_name || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400 text-xs">{r.resource_icon || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-3 py-1.5"><B v={r.is_active} /></td>
                    <td className="px-3 py-1.5"><div className="flex gap-1">
                      <button onClick={() => { setEditId(r.resource_id); setEditData({ resource_key: r.resource_key, resource_name: r.resource_name ?? "", resource_icon: r.resource_icon ?? "" }); setShowCreate(false); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400" title="Edit"><Edit2 size={13} /></button>
                      <button onClick={() => toggleResMut.mutate(r.resource_id)} disabled={toggleResMut.isPending} className={`p-1 rounded text-xs font-bold ${r.is_active ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`} title={r.is_active ? "Deactivate" : "Activate"}>{r.is_active ? "ON" : "OFF"}</button>
                    </div></td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">{resources.length} record(s)</div>
      </div>
      <div className="flex gap-2">
        <button className={bp} onClick={() => { setShowCreate(v => !v); setEditId(null); }}><Plus size={12} />New Resource</button>
        <button className={bs} onClick={() => resourcesQ.refetch()}><RefreshCw size={12} />Refresh</button>
      </div>
      {showCreate && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50/30 dark:bg-green-900/10">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Create Resource</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Key format: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">module.page_name</code> (snake_case).</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Resource Key *</label><input className={ic} placeholder="e.g. admin.my_page" value={form.resource_key} onChange={e => setForm(p => ({ ...p, resource_key: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") }))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Resource Name</label><input className={ic} placeholder="e.g. Admin - My Page" value={form.resource_name} onChange={e => setForm(p => ({ ...p, resource_name: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Icon (optional)</label><input className={ic} placeholder="e.g. Settings" value={form.resource_icon} onChange={e => setForm(p => ({ ...p, resource_icon: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={createResMut.isPending || !form.resource_key.trim()} onClick={() => createResMut.mutate(form)}><Save size={12} />{createResMut.isPending ? "Saving..." : "Create Resource"}</button>
            <button className={bs} onClick={() => setShowCreate(false)}><X size={12} />Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
