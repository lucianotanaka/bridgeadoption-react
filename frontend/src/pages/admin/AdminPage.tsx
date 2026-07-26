import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, Users, Building, Shield } from "lucide-react";
import apiClient from "@/api/client";

type Tab = "users" | "companies" | "roles";

function TableRows({ rows, maxCols = 8 }: { rows: Record<string, unknown>[]; maxCols?: number }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(h => !h.startsWith("__")).slice(0, maxCols) : [];
  if (!rows.length) return <p className="text-center text-gray-400 py-8">No data available.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">{headers.map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{r[h] == null ? "—" : String(r[h])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/admin/users").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "users" });
  const companiesQ = useQuery({ queryKey: ["admin-companies", search], queryFn: () => apiClient.get<Record<string, unknown>[]>(`/admin/companies${search ? `?search=${search}` : ""}`).then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "companies" });
  const rolesQ = useQuery({ queryKey: ["admin-roles"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/admin/roles").then(r => r.data), staleTime: 10 * 60 * 1000, enabled: tab === "roles" });

  const activeQ = { users: usersQ, companies: companiesQ, roles: rolesQ }[tab];
  const rows = activeQ.data ?? [];

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "users", label: "Users", icon: <Users size={14} />, count: usersQ.data?.length },
    { key: "companies", label: "Companies", icon: <Building size={14} />, count: companiesQ.data?.length },
    { key: "roles", label: "Roles", icon: <Shield size={14} />, count: rolesQ.data?.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Users, Companies & Roles Management</p>
        </div>
        <button onClick={() => void activeQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {t.icon} {t.label} {t.count != null && <span className="ml-1 text-xs opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {(tab === "companies" || tab === "users") && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{rows.length} records</p>
        </div>
        {activeQ.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : activeQ.isError ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-red-600 dark:text-red-400">⚠ Admin access required. Only ADMIN role can view this section.</p>
          </div>
        ) : <TableRows rows={rows} />}
      </div>
    </div>
  );
}
