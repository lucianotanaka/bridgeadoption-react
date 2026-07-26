import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import Plot from "react-plotly.js";
import apiClient from "@/api/client";

export default function TeamTargetPage() {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains("dark");
  const [selectedFY, setSelectedFY] = useState<number | null>(null);

  const fyQ = useQuery({ queryKey: ["target-fy"], queryFn: () => apiClient.get<number[]>("/adoption/team-target/fiscal-years").then(r => r.data), staleTime: 10 * 60 * 1000 });
  const dataQ = useQuery({
    queryKey: ["team-target", selectedFY],
    queryFn: () => apiClient.get<Record<string, unknown>[]>(`/adoption/team-target${selectedFY ? `?fy=${selectedFY}` : ""}`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const fyList = fyQ.data ?? [];
  const rows = dataQ.data ?? [];

  const plotLayout = { paper_bgcolor: isDark ? "#111827" : "white", plot_bgcolor: isDark ? "#111827" : "white", font: { color: isDark ? "#d1d5db" : "#374151", size: 11 }, margin: { t: 40, b: 60, l: 60, r: 40 } };

  // Build chart from rows
  const owners = [...new Set(rows.map(r => String(r.csm_name ?? r.owner_name ?? r.user_name ?? "")))].filter(Boolean);
  const targets = owners.map(o => {
    const r = rows.find(row => (row.csm_name ?? row.owner_name ?? row.user_name) === o);
    return Number(r?.target ?? r?.target_value ?? r?.goal ?? 0);
  });
  const achieved = owners.map(o => {
    const r = rows.find(row => (row.csm_name ?? row.owner_name ?? row.user_name) === o);
    return Number(r?.achieved ?? r?.achieved_value ?? r?.actual ?? 0);
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Target</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Adoption Team Goals & Achievement</p>
        </div>
        <div className="flex items-center gap-3">
          {fyList.length > 0 && (
            <div className="flex gap-1">
              <button onClick={() => setSelectedFY(null)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedFY === null ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>All</button>
              {fyList.map(fy => (
                <button key={fy} onClick={() => setSelectedFY(fy)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedFY === fy ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>{fy}</button>
              ))}
            </div>
          )}
          <button onClick={() => void dataQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={13} /> {t("common.refresh")}
          </button>
        </div>
      </div>

      {dataQ.isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 dark:text-gray-500">No data available.</p>
        </div>
      ) : (
        <>
          {owners.length > 0 && (targets.some(v => v > 0) || achieved.some(v => v > 0)) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Target vs Achieved by CSM</p>
              <Plot
                data={[
                  { type: "bar" as const, name: "Target", x: owners, y: targets, marker: { color: "#5DADE2" } },
                  { type: "bar" as const, name: "Achieved", x: owners, y: achieved, marker: { color: "#12B76A" } },
                ]}
                layout={{ ...plotLayout, height: 350, barmode: "group" as const }}
                useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{rows.length} records</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {headers.slice(0, 10).map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {headers.slice(0, 10).map(h => <td key={h} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{String(r[h] ?? "—")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
