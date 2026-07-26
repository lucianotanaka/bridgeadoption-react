import { useTranslation } from "react-i18next";
import type { TaskItem, TaskKPI } from "@/api/tasks";
import { Clock, CheckSquare, AlertCircle, TrendingDown, Activity } from "lucide-react";

// ─── helpers ───────────────────────────────────────────────

export function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); }
  catch { return iso; }
}

export function criticalBadge(level?: string | null) {
  if (!level || level.toUpperCase() === "NONE") return null;
  const colors: Record<string, string> = {
    N1: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    N2: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
    N3: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  };
  const cls = colors[level.toUpperCase()] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>CRIT {level.toUpperCase()}</span>;
}

export function priorityColor(priority?: string | null): string {
  switch ((priority ?? "").toUpperCase()) {
    case "HIGH": return "text-red-600 dark:text-red-400";
    case "MEDIUM": return "text-yellow-600 dark:text-yellow-400";
    default: return "text-blue-600 dark:text-blue-400";
  }
}

// ─── KPI Card ──────────────────────────────────────────────

export function KPICard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: "red" | "yellow" | "green" | "blue";
}) {
  const accentMap = {
    red:    "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    green:  "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    blue:   "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  };
  const iconCls = accent ? accentMap[accent] : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconCls}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Monitoring Panel ──────────────────────────────────────

export function MonitoringPanel({ kpi }: { kpi: TaskKPI }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">{t("task.monitoringPanel")}</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t("task.monitoringPanelSubtitle")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          label={t("task.activeTasks")}
          value={kpi.total_active}
          sub={t("task.activeTasksSub", { open: kpi.open_count, inprog: kpi.inprogress_count })}
          icon={<CheckSquare size={16} />}
          accent="blue"
        />
        <KPICard
          label={t("task.criticalRadar")}
          value={`N1: ${kpi.n1_critical}`}
          sub={t("task.criticalRadarSub", { n2: kpi.n2_critical })}
          icon={<AlertCircle size={16} />}
          accent={kpi.n1_critical > 0 ? "red" : kpi.n2_critical > 0 ? "yellow" : "green"}
        />
        <KPICard
          label={t("task.followUps")}
          value={`Today: ${kpi.follow_up_today}`}
          sub={t("task.followUpsSub", { next7d: kpi.follow_up_next_7d })}
          icon={<Clock size={16} />}
          accent={kpi.follow_up_today > 0 ? "yellow" : "green"}
        />
        <KPICard
          label={t("task.plannedOverdue")}
          value={kpi.planned_overdue}
          icon={<TrendingDown size={16} />}
          accent={kpi.planned_overdue > 0 ? "red" : "green"}
        />
        <KPICard
          label={t("task.activityOverdue")}
          value={kpi.activity_overdue_tasks}
          icon={<Activity size={16} />}
          accent={kpi.activity_overdue_tasks > 0 ? "red" : "green"}
        />
      </div>
    </div>
  );
}

// ─── Action Queue Card ─────────────────────────────────────

export function ActionQueueCard({ task }: { task: TaskItem }) {
  const fin = (task.task_finance_type ?? "").toUpperCase();
  const leftBorder = fin === "EXPENSE" ? "border-l-red-400 dark:border-l-red-600" : fin === "REVENUE" ? "border-l-green-400 dark:border-l-green-600" : "border-l-gray-200 dark:border-l-gray-700";
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${leftBorder} p-3 hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{task.task_id}</span>
          {criticalBadge(task.critical_level)}
          {fin !== "NEUTRAL" && fin !== "" && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${fin === "EXPENSE" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"}`}>{fin}</span>
          )}
        </div>
        <span className={`text-xs font-semibold shrink-0 ${priorityColor(task.task_priority)}`}>{task.task_priority}</span>
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.task_customer_name ?? "—"}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.task_type_name ?? "—"} • {task.task_status_name ?? "—"}</p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><Clock size={11} /> {fmtDate(task.next_followup_any_effective)}</span>
        {(task.task_value_brl || task.task_value_usd) ? (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{task.task_value_usd ? `USD ${fmtCurrency(task.task_value_usd)}` : `BRL ${fmtCurrency(task.task_value_brl ?? 0)}`}</span>
        ) : null}
      </div>
      {task.critical_reason && <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">⚠ {task.critical_reason}</p>}
    </div>
  );
}

// ─── Risk Row ──────────────────────────────────────────────

export function RiskRow({ task, badge, badgeColor }: { task: TaskItem; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">#{task.task_id} • {task.task_type_name}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.task_customer_name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{task.task_value_usd ? `USD ${fmtCurrency(task.task_value_usd)}` : task.task_value_brl ? `BRL ${fmtCurrency(task.task_value_brl)}` : "—"}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(task.next_followup_any_effective)}</p>
      </div>
    </div>
  );
}

// ─── Finance Panel ─────────────────────────────────────────

export function FinancePanel({ kpi, expenseTasks }: { kpi: TaskKPI; expenseTasks: TaskItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">{t("task.financeImpact")}</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("task.financeImpactSubtitle")}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t("task.revenuePotential")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpi.revenue_tasks} {t("task.title").toLowerCase()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">BRL {fmtCurrency(kpi.revenue_brl)} • USD {fmtCurrency(kpi.revenue_usd)}</p>
        </div>
        <div className={`rounded-lg border p-3 ${kpi.expense_tasks > 0 ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10" : "border-gray-200 dark:border-gray-700"}`}>
          <p className={`text-xs font-semibold mb-1 ${kpi.expense_tasks > 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>{t("task.riskOfExpense")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpi.expense_tasks} {t("task.title").toLowerCase()}</p>
          {kpi.expense_tasks > 0 && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{t("task.immediateAction")}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400">BRL {fmtCurrency(kpi.expense_brl)} • USD {fmtCurrency(kpi.expense_usd)}</p>
        </div>
      </div>
      {expenseTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t("task.top5ExpenseRisk")}</p>
          {expenseTasks.map((item) => (
            <RiskRow
              key={item.task_id}
              task={item}
              badge="EXPENSE"
              badgeColor="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
            />
          ))}
        </div>
      )}
      {expenseTasks.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">{t("task.noExpenseTasks")}</p>}
    </div>
  );
}

// ─── Service Panel ─────────────────────────────────────────

export function ServicePanel({ kpi, serviceTasks }: { kpi: TaskKPI; serviceTasks: TaskItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">{t("task.serviceImpact")}</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("task.serviceImpactSubtitle")}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t("task.noServiceImpact")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpi.total_active - kpi.service_impact_tasks} {t("task.title").toLowerCase()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("task.noImmediateRisk")}</p>
        </div>
        <div className={`rounded-lg border p-3 ${kpi.service_impact_tasks > 0 ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10" : "border-gray-200 dark:border-gray-700"}`}>
          <p className={`text-xs font-semibold mb-1 ${kpi.service_impact_tasks > 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>{t("task.customerImpactRisk")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpi.service_impact_tasks} {t("task.title").toLowerCase()}</p>
          {kpi.service_impact_tasks > 0 && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{t("task.actionRequiredLabel")}</p>}
        </div>
      </div>
      {serviceTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t("task.top5ServiceRisk")}</p>
          {serviceTasks.map((item) => (
            <RiskRow
              key={item.task_id}
              task={item}
              badge="SERVICE"
              badgeColor="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
            />
          ))}
        </div>
      )}
      {serviceTasks.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">{t("task.noServiceTasks")}</p>}
    </div>
  );
}
