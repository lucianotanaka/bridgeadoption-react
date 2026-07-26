import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import apiClient from "@/api/client";

type Tab = "farol" | "companies" | "ea" | "account-team";

function TableRows({ rows, maxCols = 10 }: { rows: Record<string, unknown>[]; maxCols?: number }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(h => !h.startsWith("__")).slice(0, maxCols) : [];
  if (!rows.length) return <p className="text-center text-gray-400 py-8">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">{rows.length} records</p>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 200).map((r, i) => <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">{headers.map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{r[h] == null ? "—" : String(r[h])}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > 200 && <p className="text-xs text-gray-400 text-center mt-2">Showing 200 of {rows.length}</p>}
    </div>
  );
}

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>("farol");
  const [search, setSearch] = useState("");

  const farolQ = useQuery({ queryKey: ["portfolio-farol"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/portfolio/farol").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "farol" });
  const companiesQ = useQuery({ queryKey: ["portfolio-companies", search], queryFn: () => apiClient.get<Record<string, unknown>[]>(`/portfolio/companies${search ? `?search=${search}` : ""}`).then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "companies" });
  const eaQ = useQuery({ queryKey: ["portfolio-ea"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/portfolio/cisco-ea/metering").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "ea" });
  const teamQ = useQuery({ queryKey: ["portfolio-team"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/portfolio/account-team").then(r => r.data), staleTime: 5 * 60 * 1000, enabled: tab === "account-team" });

  const activeQ = { farol: farolQ, companies: companiesQ, ea: eaQ, "account-team": teamQ }[tab];
  const rows = activeQ.data ?? [];

  const TABS: { key: Tab; label: string }[] = [
    { key: "farol", label: "Farol" },
    { key: "companies", label: "Companies" },
    { key: "ea", label: "Cisco EA" },
    { key: "account-team", label: "Account Team" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Client Portfolio — Farol, Companies, Cisco EA, Account Team</p>
        </div>
        <button onClick={() => void activeQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "companies" && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company..." className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {activeQ.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : <TableRows rows={rows} />}
      </div>
    </div>
  );
}
