/**
 * Reusable DataTablePage — generic table + optional search for any API endpoint.
 * Used for LCI Status, Rebate sub-tabs, Projects, Renewals, etc.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import apiClient from "@/api/client";

interface Props {
  title: string;
  subtitle?: string;
  endpoint: string;
  queryKey: string[];
  maxCols?: number;
  searchField?: string;
}

export default function DataTablePage({ title, subtitle, endpoint, queryKey, maxCols = 12, searchField }: Props) {
  const [search, setSearch] = useState("");

  const dataQ = useQuery({
    queryKey,
    queryFn: () => apiClient.get<Record<string, unknown>[]>(endpoint).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const rows = dataQ.data ?? [];
  const headers = rows.length > 0 ? Object.keys(rows[0]).slice(0, maxCols) : [];

  const filtered = search && searchField
    ? rows.filter(r => String(r[searchField] ?? "").toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={() => void dataQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} className={dataQ.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {searchField && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search by ${searchField}...`}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {dataQ.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8">No data available.</p>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">{filtered.length} records</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {headers.map(h => (
                        <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                          {r[h] == null ? "—" : String(r[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
