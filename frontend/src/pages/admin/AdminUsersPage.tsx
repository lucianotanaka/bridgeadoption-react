import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit2, X, Save, Shield, Trash2 } from "lucide-react";
import apiClient from "@/api/client";

interface UserRow { user_id: number; user_name?: string; user_full_name?: string; user_email?: string; [key: string]: unknown; }
interface PersonRow { person_id: number; person_name: string; person_email?: string; person_job_title?: string; person_type?: string; }
interface RoleRow { role_id: number; user_role_id: number; role_name: string; [key: string]: unknown; }
interface AllRole { role_id: number; role_name: string; [key: string]: unknown; }
interface PermissionRow { permission_id: number; resource_key: string; action_key: string; action_id: number; }
interface ActionRow { action_id: number; action_key: string; }
interface ResourceRow { resource_id: number; resource_key: string; is_active: number; }

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [nameSearch, setNameSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserRow[] | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [activeTab, setActiveTab] = useState<"data" | "roles" | "permissions">("data");
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState("");
  const [changePasswd, setChangePasswd] = useState(false);

  // ── Create mode state ─────────────────────────────────
  const [createMode, setCreateMode] = useState(false);
  const [personSearchName, setPersonSearchName] = useState("");
  const [personSearchEmail, setPersonSearchEmail] = useState("");
  const [personResults, setPersonResults] = useState<PersonRow[] | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonRow | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserError, setNewUserError] = useState("");
  const [newUserSuccess, setNewUserSuccess] = useState("");

  const [selectedUserRoleId, setSelectedUserRoleId] = useState<number | null>(null);
  const [editActions, setEditActions] = useState<Record<number, number>>({});
  const [newPermResourceId, setNewPermResourceId] = useState<number | null>(null);
  const [newPermActionId, setNewPermActionId] = useState<number | null>(null);

  const allRolesQ = useQuery({ queryKey: ["admin-all-roles"], queryFn: () => apiClient.get<AllRole[]>("/admin/roles").then(r => r.data), staleTime: 600000 });
  const userRolesQ = useQuery({ queryKey: ["user-roles", editUser?.user_id], queryFn: () => apiClient.get<RoleRow[]>(`/admin/users/${editUser!.user_id}/roles`).then(r => r.data), enabled: !!editUser && (activeTab === "roles" || activeTab === "permissions") });
  const actionsQ = useQuery({ queryKey: ["admin-actions"], queryFn: () => apiClient.get<ActionRow[]>("/admin/actions").then(r => r.data), staleTime: 600000, enabled: activeTab === "permissions" });
  const resourcesQ = useQuery({ queryKey: ["admin-resources"], queryFn: () => apiClient.get<ResourceRow[]>("/admin/resources?only_active=false").then(r => r.data), staleTime: 600000, enabled: activeTab === "permissions" });
  const permissionsQ = useQuery({ queryKey: ["role-permissions", selectedUserRoleId], queryFn: () => apiClient.get<PermissionRow[]>(`/admin/roles/${selectedUserRoleId}/permissions`).then(r => r.data), enabled: !!selectedUserRoleId && activeTab === "permissions" });

  const searchMut = useMutation<UserRow[], Error, void>({ mutationFn: () => apiClient.get<UserRow[]>(`/admin/users/search?${nameSearch ? `name=${encodeURIComponent(nameSearch)}` : ""}${emailSearch ? `&email=${encodeURIComponent(emailSearch)}` : ""}`).then(r => r.data), onSuccess: d => setSearchResults(d) });
  const personSearchMut = useMutation<PersonRow[], Error, void>({ mutationFn: () => apiClient.get<PersonRow[]>(`/admin/persons/search?${personSearchName ? `name=${encodeURIComponent(personSearchName)}` : ""}${personSearchEmail ? `&email=${encodeURIComponent(personSearchEmail)}` : ""}`).then(r => r.data), onSuccess: d => setPersonResults(d) });
  const createUserMut = useMutation<{ user_id: number }, Error, void>({
    mutationFn: () => apiClient.post<{ user_id: number }>("/admin/users", {
      user_name: newUserName,
      user_full_name: selectedPerson!.person_name,
      user_email: newUserEmail,
      user_password: newUserPassword,
      user_person_id: selectedPerson!.person_id,
      user_change_passwd: 1,
      user_language: "en-US",
    }).then(r => r.data),
    onSuccess: (data) => {
      setNewUserSuccess(`✓ User created (ID: ${data.user_id}). They will be required to change password on first login.`);
      setNewUserError("");
      setNewUserPassword("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create user.";
      setNewUserError(msg);
    },
  });
  const updateMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      // Never send an empty user_password — omit it so the backend leaves the existing hash untouched
      const { user_password, ...rest } = editData;
      const payload: Record<string, string> = { ...rest, user_change_passwd: changePasswd ? "1" : "0" };
      if (user_password) payload.user_password = user_password;
      return apiClient.put(`/admin/users/${editUser!.user_id}`, payload).then(r => r.data);
    },
    onSuccess: () => { setSavedMsg("Saved"); void searchMut.mutate(); },
  });
  const assignRoleMut = useMutation<unknown, Error, number>({ mutationFn: id => apiClient.post(`/admin/users/${editUser!.user_id}/roles/${id}`).then(r => r.data), onSuccess: () => void qc.invalidateQueries({ queryKey: ["user-roles", editUser?.user_id] }) });
  const removeRoleMut = useMutation<unknown, Error, number>({ mutationFn: id => apiClient.delete(`/admin/users/${editUser!.user_id}/roles/${id}`).then(r => r.data), onSuccess: () => void qc.invalidateQueries({ queryKey: ["user-roles", editUser?.user_id] }) });
  const addPermMut = useMutation<unknown, Error, { user_role_id: number; resource_id: number; action_id: number }>({ mutationFn: b => apiClient.post("/admin/permissions", b).then(r => r.data), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["role-permissions", selectedUserRoleId] }); setNewPermResourceId(null); setNewPermActionId(null); } });
  const removePermMut = useMutation<unknown, Error, number>({ mutationFn: id => apiClient.delete(`/admin/permissions/${id}`).then(r => r.data), onSuccess: () => void qc.invalidateQueries({ queryKey: ["role-permissions", selectedUserRoleId] }) });
  const updatePermMut = useMutation<unknown, Error, { permId: number; action_id: number }>({ mutationFn: ({ permId, action_id }) => apiClient.put(`/admin/permissions/${permId}`, { action_id }).then(r => r.data), onSuccess: () => void qc.invalidateQueries({ queryKey: ["role-permissions", selectedUserRoleId] }) });

  const openCreateMode = () => {
    setCreateMode(true);
    setEditUser(null);
    setPersonResults(null);
    setSelectedPerson(null);
    setPersonSearchName("");
    setPersonSearchEmail("");
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserError("");
    setNewUserSuccess("");
  };

  const closeCreateMode = () => {
    setCreateMode(false);
  };

  const selectPerson = (p: PersonRow) => {
    setSelectedPerson(p);
    // Pre-fill username from person name: lowercase, spaces → dots
    setNewUserName(p.person_name.toLowerCase().replace(/\s+/g, "."));
    setNewUserEmail(p.person_email ?? "");
    setNewUserError("");
    setNewUserSuccess("");
  };

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setActiveTab("data");
    setEditData({ user_name: String(user.user_name ?? ""), user_full_name: String(user.user_full_name ?? ""), user_email: String(user.user_email ?? "") });
    setChangePasswd(Number(user.user_change_passwd ?? 0) === 1);
    setSavedMsg("");
    setSelectedUserRoleId(null);
    setEditActions({});
    setNewPermResourceId(null);
    setNewPermActionId(null);
  };

  const handleTabChange = (tab: "data" | "roles" | "permissions") => {
    setActiveTab(tab);
    if (tab === "permissions" && !selectedUserRoleId && (userRolesQ.data ?? []).length > 0) {
      setSelectedUserRoleId(userRolesQ.data![0].user_role_id);
    }
  };

  const currentRoleIds = new Set((userRolesQ.data ?? []).map(r => r.role_id));
  const availableRoles = (allRolesQ.data ?? []).filter(r => !currentRoleIds.has(r.role_id));
  const selectedRole = (userRolesQ.data ?? []).find(r => r.user_role_id === selectedUserRoleId);
  const roleDomain = selectedRole ? selectedRole.role_name.toLowerCase() : "";
  const filteredResources = roleDomain ? (resourcesQ.data ?? []).filter(r => r.resource_key.startsWith(`${roleDomain}.`)) : [];
  const usedResourceKeys = new Set((permissionsQ.data ?? []).map(p => p.resource_key));
  const availableResources = filteredResources.filter(r => !usedResourceKeys.has(r.resource_key));

  const inputCls = "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const selectCls = "text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const spinner = <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Users</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">User management, roles & permissions</p>
      </div>

      {!editUser && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
              <input value={nameSearch} onChange={e => setNameSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMut.mutate()} className={inputCls} placeholder="Search by name..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
              <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMut.mutate()} className={inputCls} placeholder="Search by email..." />
            </div>
          </div>
      <div className="flex gap-2">
            <button onClick={() => searchMut.mutate()} disabled={searchMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
              <Search size={13} />{searchMut.isPending ? "Searching..." : "Search"}
            </button>
            <button onClick={openCreateMode} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
              <Plus size={13} /> New User
            </button>
          </div>
        </div>
      )}

      {!editUser && searchResults !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">{searchResults.length} results</p>
          {searchResults.length === 0 ? <p className="text-gray-400 text-xs">No users found.</p> : (
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
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

      {/* ── Create New User panel ────────────────────────────── */}
      {createMode && !editUser && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">New User</h2>
            <button onClick={closeCreateMode} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><X size={16} /></button>
          </div>

          {/* Step 1 — find person */}
          {!selectedPerson && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Search for the person in tbPerson (NTT internal, person_company_id IS NULL):</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                  <input value={personSearchName} onChange={e => setPersonSearchName(e.target.value)} onKeyDown={e => e.key === "Enter" && personSearchMut.mutate()} className={inputCls} placeholder="Search by name..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
                  <input value={personSearchEmail} onChange={e => setPersonSearchEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && personSearchMut.mutate()} className={inputCls} placeholder="Search by email..." />
                </div>
              </div>
              <button onClick={() => personSearchMut.mutate()} disabled={personSearchMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
                <Search size={13} />{personSearchMut.isPending ? "Searching..." : "Search Persons"}
              </button>
              {personResults !== null && (
                <div className="mt-2 space-y-1.5">
                  {personResults.length === 0 ? (
                    <p className="text-xs text-gray-400">No persons found.</p>
                  ) : personResults.map(p => (
                    <div key={p.person_id} className="flex items-center justify-between py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.person_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.person_email}{p.person_job_title ? ` — ${p.person_job_title}` : ""}</p>
                      </div>
                      <button onClick={() => selectPerson(p)} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — set credentials */}
          {selectedPerson && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{selectedPerson.person_name}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400">{selectedPerson.person_email} — person_id: {selectedPerson.person_id}</p>
                </div>
                <button onClick={() => { setSelectedPerson(null); setNewUserError(""); setNewUserSuccess(""); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Change</button>
              </div>

              {newUserError && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{newUserError}</p>}
              {newUserSuccess && <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">{newUserSuccess}</p>}

              {!newUserSuccess && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Username</label>
                    <input value={newUserName} onChange={e => setNewUserName(e.target.value)} className={inputCls} placeholder="e.g. john.doe" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
                    <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className={inputCls} placeholder="user@nttdata.com" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Initial Password <span className="text-red-500">*</span></label>
                    <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className={inputCls} placeholder="Set initial password" />
                    <p className="text-xs text-gray-400 mt-1">User will be required to change it on first login.</p>
                  </div>
                  <button
                    onClick={() => createUserMut.mutate()}
                    disabled={createUserMut.isPending || !newUserName || !newUserEmail || !newUserPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Plus size={13} />{createUserMut.isPending ? "Creating..." : "Create User"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {editUser && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Editing: {editUser.user_name}</h2>
            <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><X size={16} /></button>
          </div>

          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            {(["data", "roles", "permissions"] as const).map(t => (
              <button key={t} onClick={() => handleTabChange(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === t ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                {t === "data" ? "User Data" : t === "roles" ? "Roles" : "Permissions"}
              </button>
            ))}
          </div>

          {/* ── User Data ── */}
          {activeTab === "data" && (
            <div className="space-y-3">
              {([["user_name", "Username"], ["user_full_name", "Full Name"], ["user_email", "Email"]] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
                  <input value={editData[k] ?? ""} onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">New Password (leave blank to keep)</label>
                <input type="password" value={editData.user_password ?? ""} onChange={e => { setEditData(p => ({ ...p, user_password: e.target.value })); if (e.target.value) setChangePasswd(true); }} className={inputCls} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="change-passwd-toggle"
                  type="checkbox"
                  checked={changePasswd}
                  onChange={e => setChangePasswd(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="change-passwd-toggle" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  Require password change on next login
                </label>
              </div>
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
                <Save size={13} />{updateMut.isPending ? "Saving..." : "Save"}
              </button>
              {savedMsg && <p className="text-xs text-green-600 dark:text-green-400">{savedMsg}</p>}
            </div>
          )}

          {/* ── Roles ── */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Current Roles</p>
                {userRolesQ.isLoading ? spinner :
                  (userRolesQ.data ?? []).length === 0 ? <p className="text-xs text-gray-400">No roles assigned.</p> : (
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
                  )
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

          {/* ── Permissions ── */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              {(userRolesQ.data ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">User has no roles. Assign roles first.</p>
              ) : (
                <>
                  {/* Role selector */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Select Role to Manage</label>
                    <select
                      value={selectedUserRoleId ?? ""}
                      onChange={e => { const id = Number(e.target.value); setSelectedUserRoleId(id); setEditActions({}); setNewPermResourceId(null); setNewPermActionId(null); }}
                      className={selectCls + " w-full"}
                    >
                      {(userRolesQ.data ?? []).map(r => (
                        <option key={r.user_role_id} value={r.user_role_id}>{r.role_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Current permissions */}
                  {selectedUserRoleId && (
                    <>
                      <div>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Current Permissions</p>
                        {permissionsQ.isLoading ? spinner :
                          (permissionsQ.data ?? []).length === 0 ? <p className="text-xs text-gray-400">No permissions assigned.</p> : (
                            <div className="space-y-1.5">
                              {(permissionsQ.data ?? []).map(perm => {
                                const currentActionId = editActions[perm.permission_id] ?? perm.action_id;
                                return (
                                  <div key={perm.permission_id} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{perm.resource_key}</span>
                                    <select
                                      value={currentActionId}
                                      onChange={e => setEditActions(p => ({ ...p, [perm.permission_id]: Number(e.target.value) }))}
                                      className={selectCls}
                                    >
                                      {(actionsQ.data ?? []).map(a => (
                                        <option key={a.action_id} value={a.action_id}>{a.action_key}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => updatePermMut.mutate({ permId: perm.permission_id, action_id: currentActionId })}
                                      disabled={updatePermMut.isPending || currentActionId === perm.action_id}
                                      title="Save"
                                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 disabled:opacity-40 transition-colors"
                                    >
                                      <Save size={13} />
                                    </button>
                                    <button
                                      onClick={() => removePermMut.mutate(perm.permission_id)}
                                      disabled={removePermMut.isPending}
                                      title="Remove"
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-40 transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        }
                      </div>

                      {/* Add permission */}
                      <div>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Add Permission</p>
                        {filteredResources.length === 0 ? (
                          <p className="text-xs text-gray-400">No resources found for domain "{roleDomain}".</p>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={newPermResourceId ?? ""}
                              onChange={e => setNewPermResourceId(Number(e.target.value))}
                              className={selectCls}
                            >
                              <option value="">Select resource…</option>
                              {availableResources.map(r => (
                                <option key={r.resource_id} value={r.resource_id}>{r.resource_key}</option>
                              ))}
                            </select>
                            <select
                              value={newPermActionId ?? ""}
                              onChange={e => setNewPermActionId(Number(e.target.value))}
                              className={selectCls}
                            >
                              <option value="">Select action…</option>
                              {(actionsQ.data ?? []).map(a => (
                                <option key={a.action_id} value={a.action_id}>{a.action_key}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (selectedUserRoleId && newPermResourceId && newPermActionId) {
                                  addPermMut.mutate({ user_role_id: selectedUserRoleId, resource_id: newPermResourceId, action_id: newPermActionId });
                                }
                              }}
                              disabled={!newPermResourceId || !newPermActionId || addPermMut.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                            >
                              <Plus size={12} /> Add Permission
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
