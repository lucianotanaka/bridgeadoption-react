import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, Filter, Plus, Activity, RefreshCw, ArrowUp } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem } from "@/api/tasks";
import { useAuthStore } from "@/store/authStore";
import {
  MonitoringPanel,
  ActionQueueCard,
  FinancePanel,
  ServicePanel,
} from "./TaskOverview";
import TaskFilterTab from "./TaskFilterTab";
import TaskDetailPanel from "./TaskDetailPanel";
import NextFollowUpPanel from "./NextFollowUpPanel";
import LCIViabilityPage from "./LCIViabilityPage";
import NewTaskForm from "./NewTaskForm";
import TaskReportsTab from "./TaskReportsTab";

const CLOSED = new Set([4, 5, 6, 10]);

type TabType = "overview" | "filter" | "next-follow-up" | "lci-viability" | "new" | "reports";

export default function TaskPage() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canViewLciViability = hasPermission("task.task_lci_viability");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [filterResults, setFilterResults] = useState<TaskItem[]>([]);
  const [detailTasks, setDetailTasks] = useState<TaskItem[] | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Mostra o botão "voltar ao topo" quando a página é rolada
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToDetailPanel = () => {
    // Espera o painel renderizar antes de rolar até ele
    requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const kpiQuery = useQuery({
    queryKey: ["tasks", "kpi"],
    queryFn: () => tasksApi.getKPI().then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const actionQueueQuery = useQuery({
    queryKey: ["tasks", "action-queue"],
    queryFn: (): Promise<TaskItem[]> => tasksApi.getActionQueue(10).then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const overviewQuery = useQuery({
    queryKey: ["tasks", "overview"],
    queryFn: () => tasksApi.getOverview().then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === "overview",
  });

  const kpi = kpiQuery.data;
  const actionQueue: TaskItem[] = actionQueueQuery.data ?? [];
  const activeTasks: TaskItem[] = (overviewQuery.data?.tasks ?? []).filter(
    (task: TaskItem) => !CLOSED.has(task.task_status_id ?? 0)
  );

  const expenseTasks: TaskItem[] = activeTasks
    .filter((task: TaskItem) => task.task_finance_type?.toUpperCase() === "EXPENSE")
    .sort((a: TaskItem, b: TaskItem) => (b.task_value_brl ?? 0) - (a.task_value_brl ?? 0))
    .slice(0, 5);

  const serviceTasks: TaskItem[] = activeTasks
    .filter((task: TaskItem) => task.is_service_impacting === 1)
    .sort((a: TaskItem, b: TaskItem) => {
      const da = a.next_followup_any_effective ?? "9999";
      const db = b.next_followup_any_effective ?? "9999";
      return da.localeCompare(db);
    })
    .slice(0, 5);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("task.overview"), icon: <BarChart3 size={14} /> },
    { key: "next-follow-up", label: t("task.nextFollowUp"), icon: <Activity size={14} /> },
    { key: "filter", label: t("task.filter"), icon: <Filter size={14} /> },
    ...(canViewLciViability
      ? [{ key: "lci-viability" as TabType, label: t("task.lciViability"), icon: <Activity size={14} /> }]
      : []),
    { key: "new", label: t("task.new"), icon: <Plus size={14} /> },
    { key: "reports", label: t("task.reports"), icon: <Activity size={14} /> },
  ];

  // Se o usuário estiver na aba LCI Viability sem permissão (ex: permissão perdida), volta para Overview
  useEffect(() => {
    if (activeTab === "lci-viability" && !canViewLciViability) {
      setActiveTab("overview");
    }
  }, [activeTab, canViewLciViability]);

  const isLoading = kpiQuery.isLoading || actionQueueQuery.isLoading;

  const refetch = () => {
    void kpiQuery.refetch();
    void actionQueueQuery.refetch();
    void overviewQuery.refetch();
  };

  const handleTaskSelectFromFilter = (task: TaskItem) => {
    const taskIdx = filterResults.findIndex((t) => t.task_id === task.task_id);
    setDetailTasks(filterResults);
    setDetailIndex(taskIdx >= 0 ? taskIdx : 0);
    scrollToDetailPanel();
  };

  const handleTaskSelectFromQueue = (task: TaskItem) => {
    setDetailTasks([task]);
    setDetailIndex(0);
    scrollToDetailPanel();
  };

  const handleTaskSelectFromFollowUp = (tasks: TaskItem[], _taskId: number) => {
    setDetailTasks(tasks);
    setDetailIndex(0);
    scrollToDetailPanel();
  };

  return (
    <div className="space-y-4">
      {/* Marcador do topo da página */}
      <div ref={topRef} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("task.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("task.subtitle")}</p>
        </div>
      </div>

      {/* Toolbar tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key !== "filter") setDetailTasks(null);
            }}
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {kpi ? (
            <MonitoringPanel kpi={kpi} />
          ) : isLoading ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {kpi && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("task.statusDistribution")}</h4>
                    <div className="space-y-2">
                      {[
                        { label: t("task.statusOpen"), count: kpi.open_count, color: "bg-blue-500" },
                        { label: t("task.statusInProgress"), count: kpi.inprogress_count, color: "bg-yellow-500" },
                        { label: t("task.statusOnHold"), count: kpi.onhold_count, color: "bg-gray-400" },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">{label}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full`} style={{ width: kpi.total_active > 0 ? `${(count / kpi.total_active) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">{t("task.priorityDistribution")}</h4>
                    <div className="space-y-2">
                      {[
                        { label: t("task.priorityHigh"), count: kpi.high_priority, color: "bg-red-500" },
                        { label: t("task.priorityMedium"), count: kpi.medium_priority, color: "bg-yellow-500" },
                        { label: t("task.priorityLow"), count: kpi.low_priority, color: "bg-blue-400" },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">{label}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full`} style={{ width: kpi.total_active > 0 ? `${(count / kpi.total_active) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {kpi && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FinancePanel kpi={kpi} expenseTasks={expenseTasks} onTaskSelect={handleTaskSelectFromQueue} />
                  <ServicePanel kpi={kpi} serviceTasks={serviceTasks} onTaskSelect={handleTaskSelectFromQueue} />
                </div>
              )}
            </div>

            {/* Action Queue */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">{t("task.actionQueue")}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("task.actionQueueSubtitle")}</p>
              <div className="space-y-3 overflow-y-auto max-h-[600px]">
                {actionQueueQuery.isLoading && (
                  <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
                )}
                {!actionQueueQuery.isLoading && actionQueue.length === 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center py-4">{t("task.noCriticalActions")}</p>
                )}
                {actionQueue.map((task) => (
                  <div key={task.task_id} onClick={() => handleTaskSelectFromQueue(task)} className="cursor-pointer">
                    <ActionQueueCard task={task} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Detail from Action Queue click */}
          {detailTasks && activeTab === "overview" && (
            <div ref={detailPanelRef}>
              <TaskDetailPanel
                tasks={detailTasks}
                initialIndex={detailIndex}
                onClose={() => setDetailTasks(null)}
              />
            </div>
          )}
        </>
      )}

      {/* Next Follow-Up Tab */}
      {activeTab === "next-follow-up" && (
        <>
          <NextFollowUpPanel onTaskSelect={handleTaskSelectFromFollowUp} />
          {detailTasks && (
            <div ref={detailPanelRef}>
              <TaskDetailPanel
                tasks={detailTasks}
                initialIndex={detailIndex}
                onClose={() => setDetailTasks(null)}
              />
            </div>
          )}
        </>
      )}

      {/* Filter Tab */}
      {activeTab === "filter" && (
        <>
          <TaskFilterTab
            onTasksLoaded={(tasks) => {
              setFilterResults(tasks);
              if (tasks.length > 0) {
                setDetailTasks(tasks);
                setDetailIndex(0);
              } else {
                setDetailTasks(null);
              }
            }}
            onTaskSelect={handleTaskSelectFromFilter}
          />
          {detailTasks && (
            <div ref={detailPanelRef}>
              <TaskDetailPanel
                tasks={detailTasks}
                initialIndex={detailIndex}
                onClose={() => setDetailTasks(null)}
              />
            </div>
          )}
        </>
      )}

      {/* New Task */}
      {activeTab === "new" && (
        <>
          <NewTaskForm
            onCreated={(task) => {
              setDetailTasks([task]);
              setDetailIndex(0);
              scrollToDetailPanel();
            }}
          />
          {detailTasks && (
            <div ref={detailPanelRef}>
              <TaskDetailPanel
                tasks={detailTasks}
                initialIndex={detailIndex}
                onClose={() => setDetailTasks(null)}
              />
            </div>
          )}
        </>
      )}

      {/* LCI Viability */}
      {activeTab === "lci-viability" && <LCIViabilityPage />}

      {/* Reports */}
      {activeTab === "reports" && <TaskReportsTab />}

      {/* Botão flutuante "voltar ao topo" */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          title={t("task.backToTop", { defaultValue: "Voltar ao topo" })}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all hover:scale-105"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
