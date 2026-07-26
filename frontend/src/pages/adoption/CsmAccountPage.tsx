import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw, Download } from "lucide-react";
import apiClient from "@/api/client";

interface AccountRow { csm_name: string; client_name: string; client_type: string; [key: string]: unknown; }
interface Summary { total_accounts: number; total_csms: number; total_clients: number; types: { type: string; count: number }[]; }

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
    </div>
  );
}

export default function CsmAccountPage() {
  const { t } = useTranslation();
  const [filterCSM, setFilterCSM] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState("");

  const accountsQ = useQuery({ queryKey: ["csm-accounts"], queryFn: () => apiClient.get<AccountRow[]>("/adoption/csm-account/accounts").then(r => r.data), staleTime: 5 * 60 * 1000 });
  const summaryQ = useQuery({ queryKey: ["csm-summary"], queryFn: () => apiClient.get<Summary>("/adoption/csm-account/summary").then(r => r.data), staleTime: 5 * 60 * 1000 });

  const rows = accountsQ.data ?? [];
  const summary = summaryQ.data;

  const csms = [...new Set(rows.map(r => r.csm_name))].sort();
  const clients = [...new Set(rows.filter(r => !filterCSM || r.csm_name === filterCSM).map(r => r.client_name))].sort();
  const types = [...new Set(rows.map(r => r.client_type))].sort();

  const filtered = rows.filter(r =>
    (!filterCSM || r.csm_name === filterCSM) &&
    (!filterClient || r.client_name === filterClient) &&
    (!filterType || r.client_type === filterType)
  );

  const refetch = () => { void accountsQ.refetch(); void summaryQ.refetch(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CSM Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customer Success Manager — Account Portfolio</p>
        </div>
        <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> {t("common.refresh")}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI label="Total Accounts" value={summary.total_accounts} />
          <KPI label="CSMs" value={summary.total_csms} />
          <KPI label="Unique Clients" value={summary.total_clients} />
          {summary.types[0] && <KPI label={`Top Type: ${summary.types[0].type}`} value={summary.types[0].count} />}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">CSM</label>
            <select value={filterCSM} onChange={e => { setFilterCSM(e.target.value); setFilterClient(""); }}
              className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
              <option value="">All CSMs</option>
              {csms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Client</label>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
              <option value="">All Clients</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{filtered.length} records</p>
        </div>
        {accountsQ.isLoading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {["#", "CSM", "Client", "Type"].map(h => <th key={h} className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-1.5 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 px-3 font-medium text-gray-700 dark:text-gray-300">{r.csm_name}</td>
                    <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">{r.client_name}</td>
                    <td className="py-1.5 px-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">{r.client_type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
