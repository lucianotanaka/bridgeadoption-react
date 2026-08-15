import { useState } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Plus, Edit2, Save, X, RefreshCw } from "lucide-react";
import type { RoleRow } from "../AdminRolesPage";

const ic = "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const bp = "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const bs = "flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const B = ({ v }: { v: number }) => <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${v ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{v}</span>;

interface Props {
  rolesQ: UseQueryResult<RoleRow[]>;
  createRoleMut: UseMutationResult<unknown, Error, { role_name: string; role_description: string }>;
  updateRoleMut: UseMutationResult<unknown, Error, { id: number; role_name: string; role_description: string }>;
  toggleRoleMut: UseMutationResult<unknown, Error, number>;
}

export default function RolesTab({ rolesQ, createRoleMut, updateRoleMut, toggleRoleMut }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ role_name: "", role_description: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ role_name: "", role_description: "" });
  const roles = rolesQ.data ?? [];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-14">role_id</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-36">role_name</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">role_description</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-20">is_active</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-28">Actions</th>
          </tr></thead>
          <tbody>
            {rolesQ.isLoading ? <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-xs">Loading...</td></tr>
            : roles.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-xs">No roles found.</td></tr>
            : roles.map(r => (
              <tr key={r.role_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                {editId === r.role_id ? <>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.role_id}</td>
                  <td className="px-3 py-1.5"><input className={ic} value={editData.role_name} onChange={e => setEditData(p => ({ ...p, role_name: e.target.value }))} /></td>
                  <td className="px-3 py-1.5"><input className={ic} value={editData.role_description} onChange={e => setEditData(p => ({ ...p, role_description: e.target.value }))} /></td>
                  <td className="px-3 py-1.5"><B v={r.is_active} /></td>
                  <td className="px-3 py-1.5"><div className="flex gap-1">
                    <button onClick={() => { updateRoleMut.mutate({ id: r.role_id, ...editData }); setEditId(null); }} disabled={updateRoleMut.isPending || !editData.role_name.trim()} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 disabled:opacity-40" title="Save"><Save size={13} /></button>
                    <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Cancel"><X size={13} /></button>
                  </div></td>
                </> : <>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{r.role_id}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-800 dark:text-gray-200">{r.role_name}</td>
                  <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">{r.role_description || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-3 py-1.5"><B v={r.is_active} /></td>
                  <td className="px-3 py-1.5"><div className="flex gap-1">
                    <button onClick={() => { setEditId(r.role_id); setEditData({ role_name: r.role_name, role_description: r.role_description ?? "" }); setShowCreate(false); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400" title="Edit"><Edit2 size={13} /></button>
                    <button onClick={() => toggleRoleMut.mutate(r.role_id)} disabled={toggleRoleMut.isPending} className={`p-1 rounded text-xs font-bold ${r.is_active ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`} title={r.is_active ? "Deactivate" : "Activate"}>{r.is_active ? "ON" : "OFF"}</button>
                  </div></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">{roles.length} record(s)</div>
      </div>
      <div className="flex gap-2">
        <button className={bp} onClick={() => { setShowCreate(v => !v); setEditId(null); }}><Plus size={12} />New Role</button>
        <button className={bs} onClick={() => rolesQ.refetch()}><RefreshCw size={12} />Refresh</button>
      </div>
      {showCreate && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50/30 dark:bg-green-900/10">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Create Role</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Role Name *</label><input className={ic} placeholder="e.g. ANALYST" value={form.role_name} onChange={e => setForm(p => ({ ...p, role_name: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Description</label><input className={ic} placeholder="Short description" value={form.role_description} onChange={e => setForm(p => ({ ...p, role_description: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={createRoleMut.isPending || !form.role_name.trim()} onClick={() => createRoleMut.mutate(form)}><Save size={12} />{createRoleMut.isPending ? "Saving..." : "Create Role"}</button>
            <button className={bs} onClick={() => setShowCreate(false)}><X size={12} />Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
