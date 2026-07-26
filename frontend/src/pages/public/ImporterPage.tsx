import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import apiClient from "@/api/client";

interface ImportRow {
  importctrl_id: number;
  importctrl_source?: string;
  importctrl_file?: string;
  importctrl_status?: string;
  importctrl_message?: string;
  importctrl_started?: string;
  importctrl_ended?: string;
  importctrl_started_by?: string;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "FINISHED") return <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium"><CheckCircle size={12} /> Finished</span>;
  if (s === "FAILED") return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium"><XCircle size={12} /> Failed</span>;
  if (s === "RUNNING") return <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium"><RefreshCw size={12} className="animate-spin" /> Running</span>;
  if (s === "PENDING") return <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-medium"><Clock size={12} /> Pending</span>;
  return <span className="text-gray-400 text-xs">{status ?? "—"}</span>;
}

export default function ImporterPage() {
  const qc = useQueryClient();
  const [importType, setImportType] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const typesQ = useQuery({ queryKey: ["import-types"], queryFn: () => apiClient.get<string[]>("/importer/types").then(r => r.data), staleTime: 60 * 60 * 1000 });
  const historyQ = useQuery({ queryKey: ["import-history"], queryFn: () => apiClient.get<ImportRow[]>("/importer/history?limit=50").then(r => r.data), staleTime: 30 * 1000, refetchInterval: 30 * 1000 });

  const scheduleMut = useMutation<{ success: boolean; importctrl_id?: number; error?: string }, Error, void>({
    mutationFn: () => apiClient.post("/importer/schedule", { import_type: importType, scheduled_at: scheduledAt || undefined }).then(r => r.data),
    onSuccess: (data) => {
      if (data.success) {
        setSuccessMsg(`✓ Import "${importType}" scheduled (ID: ${data.importctrl_id})`);
        setErrorMsg("");
        setImportType("");
        setScheduledAt("");
        void qc.invalidateQueries({ queryKey: ["import-history"] });
      } else {
        setErrorMsg(data.error ?? "Failed to schedule import");
      }
    },
    onError: (e) => setErrorMsg(e.message),
  });

  const importTypes = typesQ.data ?? [];
  const history = historyQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Import Scheduling Panel — Admin</p>
        </div>
        <button onClick={() => void historyQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} className={historyQ.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Schedule form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">Schedule New Import</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Import Type *</label>
            <select value={importType} onChange={e => setImportType(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select import type...</option>
              {importTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Scheduled At (optional — default: now)</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <button onClick={() => scheduleMut.mutate()} disabled={!importType || scheduleMut.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors">
          {scheduleMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={13} />}
          {scheduleMut.isPending ? "Scheduling..." : "Schedule Import"}
        </button>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-green-700 dark:text-green-300">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Import History */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Import History</h2>
        {historyQ.isLoading ? (
          <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No import history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {["ID", "Source", "File", "Status", "Message", "Started", "Ended", "By"].map(h => <th key={h} className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.importctrl_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-1.5 px-2 font-mono text-gray-500 dark:text-gray-400">{r.importctrl_id}</td>
                    <td className="py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{r.importctrl_source ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{r.importctrl_file ?? "—"}</td>
                    <td className="py-1.5 px-2"><StatusBadge status={r.importctrl_status} /></td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{r.importctrl_message ?? "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.importctrl_started ? String(r.importctrl_started).slice(0, 16) : "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.importctrl_ended ? String(r.importctrl_ended).slice(0, 16) : "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400">{r.importctrl_started_by ?? "—"}</td>
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
