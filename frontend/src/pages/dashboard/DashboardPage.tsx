import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw, BellOff, Calendar, ArrowRight, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { tasksApi } from "@/api/tasks";
import type { TaskItem } from "@/api/tasks";
import TodayRightPanel from "./TodayRightPanel";
import type { ImmediateAction, AccountAtRisk } from "./TodayRightPanel";

function getGreeting() { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; }
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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // TODO: GET /tasks/kpi — métricas do dia
  const { data: taskKpi } = useQuery({ queryKey: ["tasks-kpi-today"], queryFn: () => tasksApi.getKPI().then((r) => r.data), staleTime: 120_000 });
  // TODO: GET /tasks/action-queue — tarefas prioritárias
  const { data: actionQueue, isLoading: loadingQueue } = useQuery({ queryKey: ["tasks-action-queue-today"], queryFn: () => tasksApi.getActionQueue(20).then((r) => r.data), staleTime: 120_000 });

  const totalActions = taskKpi?.follow_up_today ?? 0;
  const overdueCount = taskKpi?.activity_overdue_tasks ?? taskKpi?.planned_overdue ?? 0;
  const overdueTasks = useMemo<TaskItem[]>(() => (actionQueue ?? []).slice(0, 10), [actionQueue]);

  // TODO: GET /today/immediate-actions
  const immediateActions: ImmediateAction[] = [];
  // TODO: GET /today/accounts-at-risk
  const accountsAtRisk: AccountAtRisk[] = [];

  return (
    <div className="space-y-5">

      {/* ROW 1: greeting (left) + action buttons (right) — full width */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* TODO: "CARTEIRA · X CONTAS CISCO" — GET /portfolio/summary */}
          <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">
            CARTEIRA&nbsp;·&nbsp;<span className="text-gray-400 dark:text-gray-500">— CONTAS</span>
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{getGreeting()}, {firstName(user?.full_name)}</h1>
          {/* TODO: totalActions → /tasks/kpi; "Y contas em atenção" → endpoint a implementar */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalActions > 0
              ? <><span className="font-semibold text-gray-700 dark:text-gray-200">{totalActions} {totalActions === 1 ? "ação" : "ações"}</span>{" "}pra hoje</>
              : <span className="italic">— ações do dia a implementar</span>}
            <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
            <span className="italic">— contas precisam da sua atenção</span>
          </p>
        </div>
        {/* TODO: Agendar QBR → fluxo a definir; Submeter evidência → fluxo a definir */}
        <div className="flex items-center gap-3 shrink-0 self-center">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Calendar size={15} />Agendar QBR
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm">
            Submeter evidência<ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ROW 2: 4 KPI cards — full width */}
      {/* TODO: dados de cada card — ver comentários no TodayRightPanel e abaixo */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* TODO: GET /adoption/rebate/summary ou /adoption/incentives/at-risk */}
        <KpiCard label="INCENTIVOS EM RISCO" value="—" sub="a implementar" icon={<AlertTriangle size={15} />} iconClass="text-amber-500" />
        {/* TODO: GET /adoption/forecast/summary → { captured_ytd, capture_rate } */}
        <KpiCard label="CAPTURADOS (YTD)" value="—" sub="a implementar" icon={<CheckCircle2 size={15} />} iconClass="text-emerald-500" />
        {/* TODO: GET /renewals/summary → { total_usd, client_count } */}
        <KpiCard label="VALOR EM RENOVAÇÃO" value="—" sub="a implementar" icon={<RefreshCw size={15} />} iconClass="text-blue-400" />
        {/* TODO: GET /adoption/cisco-lci/at-risk ou /adoption/lci-status/summary */}
        <KpiCard label="LINHAS EM RISCO" value="—" sub="a implementar" icon={<BellOff size={15} />} iconClass="text-rose-500" />
      </div>

      {/* ROW 3: tasks (left flex-1) + right panels (fixed width) */}
      <div className="flex gap-5 items-start">

        {/* LEFT: Suas tarefas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span className="text-gray-400 font-normal text-base leading-none">≡</span>Suas tarefas
            </h2>
            <Link to="/tasks" className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
              todas as contas<ChevronRight size={12} />
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">VENCIDAS</span>
              {overdueCount > 0 && (
                <span className="text-[11px] font-bold bg-rose-500 text-white rounded-full px-2 py-0.5 min-w-[20px] text-center">{overdueCount}</span>
              )}
            </div>
            {loadingQueue ? (
              <div className="px-4 pb-4 flex flex-col gap-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
              </div>
            ) : overdueTasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center italic">Sem tarefas vencidas — fonte de dados a implementar</p>
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

        {/* RIGHT: Ações Imediatas + Contas em risco */}
        <TodayRightPanel immediateActions={immediateActions} accountsAtRisk={accountsAtRisk} />

      </div>
    </div>
  );
}
