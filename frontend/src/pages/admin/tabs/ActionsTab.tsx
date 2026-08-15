import { useState } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Plus, Save, X, RefreshCw } from "lucide-react";
import type { ActionRow } from "../AdminRolesPage";

const ic = "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const bp = "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const bs = "flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
const B = ({ v }: { v: number }) => <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${v ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{v}</span>;

interface Props {
  actionsQ: UseQueryResult<ActionRow[]>;
  createActionMut: UseMutationResult<unknown, Error, { action_key: string; action_name: string }>;
}

export default function ActionsTab({ actionsQ, createActionMut }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ action_key: "", action_name: "" });
  const actions = actionsQ.data ?? [];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-14">action_id</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-36">action_key</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">action_name</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-20">is_active</th>
          </tr></thead>
          <tbody>
            {actionsQ.isLoading ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-xs">Loading...</td></tr>
            : actions.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-xs">No actions found.</td></tr>
            : actions.map(a => (
              <tr key={a.action_id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{a.action_id}</td>
                <td className="px-3 py-1.5 font-mono font-medium text-gray-800 dark:text-gray-200">{a.action_key}</td>
                <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{a.action_name || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                <td className="px-3 py-1.5"><B v={a.is_active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">{actions.length} record(s)</div>
      </div>
      <div className="flex gap-2">
        <button className={bp} onClick={() => setShowCreate(v => !v)}><Plus size={12} />New Action</button>
        <button className={bs} onClick={() => actionsQ.refetch()}><RefreshCw size={12} />Refresh</button>
      </div>
      {showCreate && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50/30 dark:bg-green-900/10">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Create Action</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Action Key must be snake_case (e.g. <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">view</code>, <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">edit</code>).</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Action Key *</label><input className={ic} placeholder="e.g. view" value={form.action_key} onChange={e => setForm(p => ({ ...p, action_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Action Name</label><input className={ic} placeholder="e.g. View" value={form.action_name} onChange={e => setForm(p => ({ ...p, action_name: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button className={bp} disabled={createActionMut.isPending || !form.action_key.trim()} onClick={() => createActionMut.mutate(form)}><Save size={12} />{createActionMut.isPending ? "Saving..." : "Create Action"}</button>
            <button className={bs} onClick={() => setShowCreate(false)}><X size={12} />Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
