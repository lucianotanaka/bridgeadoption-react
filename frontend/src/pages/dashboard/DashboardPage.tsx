import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, RefreshCw, BellOff, Calendar, ArrowRight, ChevronRight, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { tasksApi } from "@/api/tasks";
import type { TaskItem } from "@/api/tasks";
import TodayRightPanel from "./TodayRightPanel";
import type { ImmediateAction, AccountAtRisk } from "./TodayRightPanel";

function firstName(n?: string) { return n ? n.split(" ")[0] : ""; }
function relativeDate(s?: string) { if (!s) return ""; const d = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000); return d === 0 ? "hoje" : d === 1 ? "1 dia atrás" : `${d} dias atrás`; }

interface KpiCardProps { label: string; value: string; sub: string; icon: React.ReactNode; iconClass: string; }
function KpiCard({ label, value, sub, icon, iconClass }: KpiCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-snug">{label}</p>
        <span className={`flex-shrink-0 mt-0.5 ${iconClass}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 leading-none">{sub}</p>
    </div>
  );
}

function WelcomePage({ name }: { name?: string }) {
  const { t } = useTranslation();
  const h = new Date().getHours();
  const greeting = h < 12 ? t("today.greetingMorning") : h < 18 ? t("today.greetingAfternoon") : t("today.greetingEvening");
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">BRIDGE ADOPTION</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{greeting}, {firstName(name)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("today.welcome.subtitle")}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{t("today.welcome.moduleTitle")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t("today.welcome.moduleDesc")}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/portfolio/farol" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("today.welcome.portfolioSection")}</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t("today.welcome.portfolioLink")}</p>
        </Link>
        <Link to="/adoption/forecast" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("today.welcome.adoptionSection")}</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t("today.welcome.forecastLink")}</p>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSeeTasks = hasPermission("task.task");
  if (!canSeeTasks) return <WelcomePage name={user?.full_name} />;
  return <DashboardFull />;
}

function DashboardFull() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const h = new Date().getHours();
  const greeting = h < 12 ? t("today.greetingMorning") : h < 18 ? t("today.greetingAfternoon") : t("today.greetingEvening");

  const { data: taskKpi } = useQuery({ queryKey: ["tasks-kpi-today"], queryFn: () => tasksApi.getKPI().then((r) => r.data), staleTime: 120_000 });
  const { data: actionQueue, isLoading: loadingQueue } = useQuery({ queryKey: ["tasks-action-queue-today"], queryFn: () => tasksApi.getActionQueue(20).then((r) => r.data), staleTime: 120_000 });

  const totalActions = taskKpi?.follow_up_today ?? 0;
  const overdueCount = taskKpi?.activity_overdue_tasks ?? taskKpi?.planned_overdue ?? 0;
  const overdueTasks = useMemo<TaskItem[]>(() => (actionQueue ?? []).slice(0, 10), [actionQueue]);

  const immediateActions: ImmediateAction[] = [];
  const accountsAtRisk: AccountAtRisk[] = [];

  return (
    <div className="space-y-5">
      {/* ROW 1: greeting + buttons */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">
            {t("today.portfolio")}&nbsp;·&nbsp;<span className="text-gray-400 dark:text-gray-500">— {t("today.accounts")}</span>
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{greeting}, {firstName(user?.full_name)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalActions > 0
              ? <span className="font-semibold text-gray-700 dark:text-gray-200">{t("today.actionsCount", { count: totalActions })}</span>
              : <span className="italic">{t("today.actionsToImplement")}</span>}
            <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
            <span className="italic">{t("today.accountsNeedAttention")}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-center">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Calendar size={15} />{t("today.scheduleQbr")}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm">
            {t("today.submitEvidence")}<ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ROW 2: KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label={t("today.kpi.incentivesAtRisk")} value="—" sub={t("today.kpi.toImplement")} icon={<AlertTriangle size={15} />} iconClass="text-amber-500" />
        <KpiCard label={t("today.kpi.capturedYtd")} value="—" sub={t("today.kpi.toImplement")} icon={<CheckCircle2 size={15} />} iconClass="text-emerald-500" />
        <KpiCard label={t("today.kpi.renewalValue")} value="—" sub={t("today.kpi.toImplement")} icon={<RefreshCw size={15} />} iconClass="text-blue-400" />
        <KpiCard label={t("today.kpi.linesAtRisk")} value="—" sub={t("today.kpi.toImplement")} icon={<BellOff size={15} />} iconClass="text-rose-500" />
      </div>

      {/* ROW 3: tasks + right panels */}
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span className="text-gray-400 font-normal text-base leading-none">≡</span>{t("today.yourTasks")}
            </h2>
            <Link to="/tasks" className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              {t("today.allAccounts")}<ChevronRight size={12} />
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">{t("today.overdue")}</span>
              {overdueCount > 0 && <span className="text-[11px] font-bold bg-rose-500 text-white rounded-full px-2 py-0.5 min-w-[20px] text-center">{overdueCount}</span>}
            </div>
            {loadingQueue ? (
              <div className="px-4 pb-4 flex flex-col gap-2">{[1,2,3].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
            ) : overdueTasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center italic">{t("today.noOverdueTasks")}</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {overdueTasks.map((task) => (
                  <div key={task.task_id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 min-w-[90px] mt-0.5 capitalize truncate">{task.task_type_name ?? "—"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.task_description || task.task_reference || `Tarefa #${task.task_id}`}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{task.task_customer_name ?? "—"}{task.task_end ? ` · ${relativeDate(task.task_end)}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <TodayRightPanel immediateActions={immediateActions} accountsAtRisk={accountsAtRisk} />
      </div>
    </div>
  );
}
