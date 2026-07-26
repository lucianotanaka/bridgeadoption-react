import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import DataTablePage from "@/components/ui/DataTablePage";
import apiClient from "@/api/client";

export default function AssetPage() {
  const [customerId, setCustomerId] = useState<string>("");
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const companiesQ = useQuery({ queryKey: ["portfolio-companies-list"], queryFn: () => apiClient.get<{ customer_id?: number; company_id?: number; customer_name?: string; company_name?: string }[]>("/portfolio/companies").then(r => r.data), staleTime: 10 * 60 * 1000 });
  const companies = companiesQ.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio — Assets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customer Asset Portfolio</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">Select Client</label>
        <div className="flex gap-2">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
            <option value="">Select a customer...</option>
            {companies.map((c, i) => {
              const id = c.customer_id ?? c.company_id ?? i;
              const name = c.customer_name ?? c.company_name ?? String(id);
              return <option key={id} value={String(id)}>{name}</option>;
            })}
          </select>
          <button onClick={() => setSubmittedId(customerId ? parseInt(customerId) : null)} disabled={!customerId}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors">
            <Search size={13} /> Load Assets
          </button>
        </div>
      </div>
      {submittedId && (
        <DataTablePage title="" endpoint={`/portfolio/assets?customer_id=${submittedId}`} queryKey={["portfolio-assets", submittedId]} maxCols={12} />
      )}
    </div>
  );
}
