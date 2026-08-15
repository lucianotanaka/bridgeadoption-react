import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shield, Zap, FileText } from "lucide-react";
import apiClient from "@/api/client";
import RolesTab from "./tabs/RolesTab";
import ActionsTab from "./tabs/ActionsTab";
import ResourcesTab from "./tabs/ResourcesTab";

export type RoleRow = { role_id: number; role_name: string; role_description?: string | null; is_active: number; };
export type ActionRow = { action_id: number; action_key: string; action_name?: string | null; is_active: number; };
export type ResourceRow = { resource_id: number; resource_key: string; resource_name?: string | null; resource_icon?: string | null; is_active: number; show_in_menu: number; };

type Tab = "roles" | "actions" | "resources";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "roles", label: "Roles", icon: <Shield size={13} /> },
  { key: "actions", label: "Actions", icon: <Zap size={13} /> },
  { key: "resources", label: "Resources", icon: <FileText size={13} /> },
];

export default function AdminRolesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("roles");
  const [msg, setMsg] = useState<{ ok: boolean; s: string } | null>(null);
  const flash = useCallback((ok: boolean, s: string) => { setMsg({ ok, s }); setTimeout(() => setMsg(null), 4000); }, []);

  const rolesQ = useQuery<RoleRow[]>({ queryKey: ["admin-roles-full"], queryFn: () => apiClient.get<RoleRow[]>("/admin/roles").then(r => r.data), staleTime: 0 });
  const actionsQ = useQuery<ActionRow[]>({ queryKey: ["admin-actions-full"], queryFn: () => apiClient.get<ActionRow[]>("/admin/actions").then(r => r.data), staleTime: 0, enabled: tab === "actions" });
  const resourcesQ = useQuery<ResourceRow[]>({ queryKey: ["admin-resources-full"], queryFn: () => apiClient.get<ResourceRow[]>("/admin/resources?only_active=false").then(r => r.data), staleTime: 0, enabled: tab === "resources" });

  const createRoleMut = useMutation({ mutationFn: (b: { role_name: string; role_description: string }) => apiClient.post("/admin/roles", b).then(r => r.data), onSuccess: () => { flash(true, "Role created."); void qc.invalidateQueries({ queryKey: ["admin-roles-full"] }); void qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); }, onError: (e: Error) => flash(false, e.message) });
  const updateRoleMut = useMutation({ mutationFn: ({ id, ...b }: { id: number; role_name: string; role_description: string }) => apiClient.put(`/admin/roles/${id}`, b).then(r => r.data), onSuccess: () => { flash(true, "Role updated."); void qc.invalidateQueries({ queryKey: ["admin-roles-full"] }); void qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); }, onError: (e: Error) => flash(false, e.message) });
  const toggleRoleMut = useMutation({ mutationFn: (id: number) => apiClient.post(`/admin/roles/${id}/toggle-active`).then(r => r.data), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-roles-full"] }); void qc.invalidateQueries({ queryKey: ["admin-all-roles"] }); }, onError: (e: Error) => flash(false, e.message) });
  const createActionMut = useMutation({ mutationFn: (b: { action_key: string; action_name: string }) => apiClient.post("/admin/actions", b).then(r => r.data), onSuccess: () => { flash(true, "Action created."); void qc.invalidateQueries({ queryKey: ["admin-actions-full"] }); void qc.invalidateQueries({ queryKey: ["admin-actions"] }); }, onError: (e: Error) => flash(false, e.message) });
  const createResMut = useMutation({ mutationFn: (b: { resource_key: string; resource_name: string; resource_icon: string }) => apiClient.post("/admin/resources", b).then(r => r.data), onSuccess: () => { flash(true, "Resource created."); void qc.invalidateQueries({ queryKey: ["admin-resources-full"] }); void qc.invalidateQueries({ queryKey: ["admin-resources"] }); }, onError: (e: Error) => flash(false, e.message) });
  const updateResMut = useMutation({ mutationFn: ({ id, ...b }: { id: number; resource_key: string; resource_name: string; resource_icon: string }) => apiClient.put(`/admin/resources/${id}`, b).then(r => r.data), onSuccess: () => { flash(true, "Resource updated."); void qc.invalidateQueries({ queryKey: ["admin-resources-full"] }); void qc.invalidateQueries({ queryKey: ["admin-resources"] }); }, onError: (e: Error) => flash(false, e.message) });
  const toggleResMut = useMutation({ mutationFn: (id: number) => apiClient.post(`/admin/resources/${id}/toggle-active`).then(r => r.data), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-resources-full"] }); void qc.invalidateQueries({ queryKey: ["admin-resources"] }); }, onError: (e: Error) => flash(false, e.message) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Roles & Auth</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Authorization Roles Management</p>
        </div>
        <button
          onClick={() => { void rolesQ.refetch(); void actionsQ.refetch(); void resourcesQ.refetch(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-xs font-medium ${msg.ok ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
          {msg.s}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-3">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === "roles" && <RolesTab rolesQ={rolesQ} createRoleMut={createRoleMut} updateRoleMut={updateRoleMut} toggleRoleMut={toggleRoleMut} />}
        {tab === "actions" && <ActionsTab actionsQ={actionsQ} createActionMut={createActionMut} />}
        {tab === "resources" && <ResourcesTab resourcesQ={resourcesQ} createResMut={createResMut} updateResMut={updateResMut} toggleResMut={toggleResMut} />}
      </div>
    </div>
  );
}
