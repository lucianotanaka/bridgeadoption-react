import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, TrendingUp, BarChart3, Layers } from "lucide-react";
import { ciscoLciApi } from "@/api/ciscoLci";
import { lciEligibleStatusApi } from "@/api/lciEligibleStatus";
import { useAuthStore } from "@/store/authStore";
import CiscoLCIReportPage from "./CiscoLCIReportPage";
import CiscoLCIForecastPage from "./CiscoLCIForecastPage";
import CiscoLCIEligibleStatusPage from "./CiscoLCIEligibleStatusPage";
import CiscoLCISolutionVsProjectPage from "./CiscoLCISolutionVsProjectPage";

type TabType = "report" | "forecast" | "eligible" | "solution";

function currentNttFy(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 4 ? year : year - 1;
}

export default function CiscoLCIPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes("ADMIN") ?? false);

  const allTabs: { key: TabType; label: string; icon: React.ReactNode; resourceKey: string }[] = [
    { key: "report", label: "Cisco LCI Report", icon: <FileText size={14} />, resourceKey: "adoption.report_cisco_lci" },
    { key: "forecast", label: "Forecast", icon: <TrendingUp size={14} />, resourceKey: "adoption.report_forecast" },
    { key: "eligible", label: "Eligible Status", icon: <BarChart3 size={14} />, resourceKey: "adoption.report_lci_eligible_status" },
    { key: "solution", label: "Solution vs Project", icon: <Layers size={14} />, resourceKey: "adoption.report_lci_solution_vs_project" },
  ];

  // Only show tabs the user is explicitly authorized for (ADMIN sees all).
  const tabs = useMemo(
    () => allTabs.filter((tab) => isAdmin || hasPermission(tab.resourceKey)),
    [isAdmin, hasPermission]
  );

  const [activeTab, setActiveTab] = useState<TabType>(tabs[0]?.key ?? "report");
  const [selectedFY, setSelectedFY] = useState<number | null>(null);

  // ─── Shared NTT Fiscal Year (FY) — filters all 4 Cisco LCI components ───
  const fy1Query = useQuery({
    queryKey: ["cisco-lci-module", "fy-1"],
    queryFn: () => ciscoLciApi.getFiscalYears().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const fy2Query = useQuery({
    queryKey: ["cisco-lci-module", "fy-2"],
    queryFn: () => lciEligibleStatusApi.getFiscalYears().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const fyList = [...new Set([...(fy1Query.data ?? []), ...(fy2Query.data ?? [])])]
    .filter((fy) => fy >= 2025)
    .sort((a, b) => a - b);

  const current = currentNttFy();
  const effectiveFY = selectedFY !== null && fyList.includes(selectedFY)
    ? selectedFY
    : (fyList.includes(current) ? current : (fyList[fyList.length - 1] ?? current));

  return (
    <div className="space-y-4">
      {/* Toolbar tabs + shared NTT Fiscal Year selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {fyList.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">NTT Fiscal Year</label>
            <select
              value={effectiveFY}
              onChange={(e) => setSelectedFY(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fyList.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === "report" && <CiscoLCIReportPage fy={effectiveFY} />}
      {activeTab === "forecast" && <CiscoLCIForecastPage fy={effectiveFY} />}
      {activeTab === "eligible" && <CiscoLCIEligibleStatusPage fy={effectiveFY} />}
      {activeTab === "solution" && <CiscoLCISolutionVsProjectPage fy={effectiveFY} />}
    </div>
  );
}
