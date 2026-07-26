import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import apiClient from "@/api/client";

type Tab = "cisco-ea" | "cisco-sa" | "true-forward";
const TABS: { key: Tab; label: string }[] = [
  { key: "cisco-ea", label: "Cisco EA License Usage" },
  { key: "cisco-sa", label: "Cisco Smart Account" },
  { key: "true-forward", label: "Cisco True Forward" },
];

function TableView({ rows, maxCols = 12 }: { rows: Record<string, unknown>[]; maxCols?: number }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(h => !h.startsWith("__")).slice(0, maxCols) : [];
  if (!rows.length) return <p className="text-center text-gray-400 dark:text-gray-500 py-8">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{rows.length} records</p>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 300).map((r, i) => <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">{headers.map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{r[h] == null ? "—" : String(r[h])}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > 300 && <p className="text-xs text-gray-400 text-center mt-2">Showing 300 of {rows.length}</p>}
    </div>
  );
}

export default function ClientOverviewPage() {
  const [customerId, setCustomerId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("cisco-ea");

  const companiesQ = useQuery({
    queryKey: ["portfolio-companies-list"],
    queryFn: () => apiClient.get<Record<string, unknown>[]>("/portfolio/companies").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const eaQ = useQuery({
    queryKey: ["client-ea", selectedId],
    queryFn: () => apiClient.get<Record<string, unknown>[]>(`/portfolio/cisco-ea/metering${selectedId ? `?customer_id=${selectedId}` : ""}`).then(r => r.data),
    enabled: !!selectedId && tab === "cisco-ea",
    staleTime: 5 * 60 * 1000,
  });

  const saQ = useQuery({
    queryKey: ["client-sa", selectedId],
    queryFn: () => apiClient.get<Record<string, unknown>[]>(`/portfolio/cisco-sa/usage${selectedId ? `?customer_id=${selectedId}` : ""}`).then(r => r.data),
    enabled: !!selectedId && tab === "cisco-sa",
    staleTime: 5 * 60 * 1000,
  });

  const tfQ = useQuery({
    queryKey: ["client-tf"],
    queryFn: () => apiClient.get<Record<string, unknown>[]>("/portfolio/cisco-true-forward").then(r => r.data),
    enabled: tab === "true-forward",
    staleTime: 5 * 60 * 1000,
  });

  const companies = companiesQ.data ?? [];
  const activeQ = { "cisco-ea": eaQ, "cisco-sa": saQ, "true-forward": tfQ }[tab];
  const rows = activeQ.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio — Client Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cisco EA • Cisco SA • True Forward — per client</p>
      </div>

      {/* Client selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">Select Client</label>
        <div className="flex gap-2">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
            <option value="">All clients / Select...</option>
            {companies.map((c, i) => {
              const id = c.customer_id ?? c.company_id ?? i;
              const name = String(c.customer_name ?? c.company_name ?? id);
              return <option key={String(id)} value={String(id)}>{name}</option>;
            })}
          </select>
          <button onClick={() => setSelectedId(customerId ? parseInt(customerId) : null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
            <Search size={13} /> Load
          </button>
        </div>
      </div>

      {/* Sub-module tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {activeQ.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : <TableView rows={rows} />}
      </div>
    </div>
  );
}
