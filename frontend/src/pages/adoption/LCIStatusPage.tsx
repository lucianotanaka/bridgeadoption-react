import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import apiClient from "@/api/client";

export default function LCIStatusPage() {
  const [activeTab, setActiveTab] = useState<"eligible" | "solution">("eligible");

  const eligibleQ = useQuery({ queryKey: ["lci-eligible"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/adoption/lci-status/eligible").then(r => r.data), staleTime: 5 * 60 * 1000 });
  const solutionQ = useQuery({ queryKey: ["lci-solution"], queryFn: () => apiClient.get<Record<string, unknown>[]>("/adoption/lci-status/solution-vs-project").then(r => r.data), staleTime: 5 * 60 * 1000 });

  const rows = activeTab === "eligible" ? (eligibleQ.data ?? []) : (solutionQ.data ?? []);
  const isLoading = activeTab === "eligible" ? eligibleQ.isLoading : solutionQ.isLoading;
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(h => !h.startsWith("__")).slice(0, 12) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LCI Status</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cisco LCI Eligible Status & Solution vs Project</p>
        </div>
        <button onClick={() => { void eligibleQ.refetch(); void solutionQ.refetch(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {(["eligible", "solution"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === tab ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {tab === "eligible" ? "Eligible Status" : "Solution vs Project"}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No data.</p>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">{rows.length} records</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {headers.map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 500).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {headers.map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{r[h] == null ? "—" : String(r[h])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 500 && <p className="text-xs text-gray-400 mt-2 text-center">Showing first 500 of {rows.length} records</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
