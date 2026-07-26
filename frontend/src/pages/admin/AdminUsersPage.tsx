import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, Plus, Edit2, X, Save, Shield } from "lucide-react";
import apiClient from "@/api/client";

interface UserRow { user_id: number; user_name?: string; user_full_name?: string; user_email?: string; [key: string]: unknown; }
interface RoleRow { role_id: number; user_role_id: number; role_name: string; [key: string]: unknown; }
interface AllRole { role_id: number; role_name: string; [key: string]: unknown; }

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [nameSearch, setNameSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserRow[] | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [activeTab, setActiveTab] = useState<"data" | "roles">("data");
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState("");

  const allRolesQ = useQuery({ queryKey: ["admin-all-roles"], queryFn: () => apiClient.get<AllRole[]>("/admin/roles").then(r => r.data), staleTime: 10 * 60 * 1000 });
  const userRolesQ = useQuery({ queryKey: ["user-roles", editUser?.user_id], queryFn: () => apiClient.get<RoleRow[]>(`/admin/users/${editUser!.user_id}/roles`).then(r => r.data), enabled: !!editUser && activeTab === "roles" });

  const searchMut = useMutation<UserRow[], Error, void>({
    mutationFn: () => apiClient.get<UserRow[]>(`/admin/users/search?${nameSearch ? `name=${encodeURIComponent(nameSearch)}` : ""}${emailSearch ? `&email=${encodeURIComponent(emailSearch)}` : ""}`).then(r => r.data),
    onSuccess: (data) => setSearchResults(data),
  });

  const updateMut = useMutation<unknown, Error, void>({
    mutationFn: () => apiClient.put(`/admin/users/${editUser!.user_id}`, editData).then(r => r.data),
    onSuccess: () => { setSavedMsg("✓ Saved"); void searchMut.mutate(); },
  });

  const assignRoleMut = useMutation<unknown, Error, number>({
    mutationFn: (roleId) => apiClient.post(`/admin/users/${editUser!.user_id}/roles/${roleId}`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["user-roles", editUser?.user_id] }),
  });

  const removeRoleMut = useMutation<unknown, Error, number>({
    mutationFn: (roleId) => apiClient.delete(`/admin/users/${editUser!.user_id}/roles/${roleId}`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["user-roles", editUser?.user_id] }),
  });

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setActiveTab("data");
    setEditData({ user_name: String(user.user_name ?? ""), user_full_name: String(user.user_full_name ?? ""), user_email: String(user.user_email ?? "") });
    setSavedMsg("");
  };

  const currentRoleIds = new Set((userRolesQ.data ?? []).map(r => r.role_id));
  const availableRoles = (allRolesQ.data ?? []).filter(r => !currentRoleIds.has(r.role_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">User management, roles & permissions</p>
        </div>
      </div>

      {/* Search form */}
      {!editUser && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
              <input value={nameSearch} onChange={e => setNameSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMut.mutate()}
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Search by name..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
              <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMut.mutate()}
                className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Search by email..." />
            </div>
          </div>
          <button onClick={() => searchMut.mutate()} disabled={searchMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
            <Search size={13} /> {searchMut.isPending ? "Searching..." : "Search"}
          </button>
        </div>
      )}

      {/* Search results */}
      {!editUser && searchResults !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">{searchResults.length} results</p>
          {searchResults.length === 0 ? (
            <p className="text-gray-400 text-xs">No users found.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{u.user_name} — {u.user_full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.user_email} | ID: {u.user_id}</p>
                  </div>
                  <button onClick={() => openEdit(u)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editUser && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Editing: {editUser.user_name}</h2>
            <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><X size={16} /></button>
          </div>

          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            {(["data", "roles"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === t ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                {t === "data" ? "User Data" : "Roles"}
              </button>
            ))}
          </div>

          {activeTab === "data" && (
            <div className="space-y-3">
              {[["user_name", "Username"], ["user_full_name", "Full Name"], ["user_email", "Email"]].map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
                  <input value={editData[k] ?? ""} onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">New Password (leave blank to keep)</label>
                <input type="password" value={editData.user_password ?? ""} onChange={e => setEditData(p => ({ ...p, user_password: e.target.value, user_change_passwd: "1" }))}
                  className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                <Save size={13} /> {updateMut.isPending ? "Saving..." : "Save"}
              </button>
              {savedMsg && <p className="text-xs text-green-600 dark:text-green-400">{savedMsg}</p>}
            </div>
          )}

          {activeTab === "roles" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Current Roles</p>
                {userRolesQ.isLoading ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> :
                  (userRolesQ.data ?? []).length === 0 ? <p className="text-xs text-gray-400">No roles assigned.</p> :
                    <div className="space-y-1.5">
                      {(userRolesQ.data ?? []).map(r => (
                        <div key={r.role_id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield size={12} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.role_name}</span>
                          </div>
                          <button onClick={() => removeRoleMut.mutate(r.role_id)} disabled={removeRoleMut.isPending} className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">Remove</button>
                        </div>
                      ))}
                    </div>
                }
              </div>
              {availableRoles.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Add Role</p>
                  <div className="space-y-1.5">
                    {availableRoles.map(r => (
                      <div key={r.role_id} className="flex items-center justify-between py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{r.role_name}</span>
                        <button onClick={() => assignRoleMut.mutate(r.role_id)} disabled={assignRoleMut.isPending} className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
