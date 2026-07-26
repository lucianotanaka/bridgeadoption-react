import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, AlertCircle, Calendar, ChevronRight } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { FollowUpItem, TaskItem } from "@/api/tasks";

interface Props {
  onTaskSelect: (tasks: TaskItem[], taskId: number) => void;
}

const PERIOD_CONFIG = [
  {
    key: "delayed" as const,
    labelKey: "task.periodDelayed",
    emoji: "🔴",
    headerBg: "bg-red-600",
    headerText: "text-white",
    colBorder: "border-red-500/40 dark:border-red-500/30",
    cardBorder: "border-l-red-500",
    dateBg: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    urgencyKey: "task.urgencyOverdue",
    urgencyClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  },
  {
    key: "today" as const,
    labelKey: "task.periodToday",
    emoji: "🟡",
    headerBg: "bg-yellow-500",
    headerText: "text-white",
    colBorder: "border-yellow-400/40 dark:border-yellow-500/30",
    cardBorder: "border-l-yellow-500",
    dateBg: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
    urgencyKey: "task.urgencyToday",
    urgencyClass: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  },
  {
    key: "current_week" as const,
    labelKey: "task.periodThisWeek",
    emoji: "🟢",
    headerBg: "bg-green-600",
    headerText: "text-white",
    colBorder: "border-green-500/40 dark:border-green-500/30",
    cardBorder: "border-l-green-500",
    dateBg: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    urgencyKey: "task.urgencyThisWeek",
    urgencyClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  {
    key: "next_week" as const,
    labelKey: "task.periodNextWeek",
    emoji: "⚪",
    headerBg: "bg-gray-500 dark:bg-gray-600",
    headerText: "text-white",
    colBorder: "border-gray-300/60 dark:border-gray-600/40",
    cardBorder: "border-l-gray-400",
    dateBg: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    urgencyKey: "task.urgencyNextWeek",
    urgencyClass: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  },
];

function TicketCard({
  item,
  cardBorder,
  dateBg,
  urgencyLabel,
  urgencyClass,
  onSelect,
}: {
  item: FollowUpItem;
  cardBorder: string;
  dateBg: string;
  urgencyLabel: string;
  urgencyClass: string;
  onSelect: (taskId: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.task_id)}
      className={`w-full text-left group border-l-4 ${cardBorder} bg-white dark:bg-gray-900 rounded-r-lg border border-l-0 border-gray-200 dark:border-gray-700 p-3 hover:shadow-md dark:hover:shadow-gray-900 hover:translate-x-0.5 transition-all duration-150`}
    >
      {/* Header row: Task ID + urgency badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">#{item.task_id}</span>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${urgencyClass}`}>
            {urgencyLabel}
          </span>
          <ChevronRight size={10} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
        </div>
      </div>

      {/* Client name — main title */}
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight mb-1 line-clamp-2">
        {item.task_customer_name ?? "—"}
      </p>

      {/* Task type */}
      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1.5">
        {item.task_type_name ?? "—"}
      </p>

      {/* Activity */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5">
        <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate">
          ↳ {item.activity_name ?? "—"}
        </p>
      </div>

      {/* Follow-up date */}
      {item.follow_up_date && (
        <div className={`flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md w-fit ${dateBg}`}>
          <Calendar size={10} />
          <span className="text-[10px] font-medium">{String(item.follow_up_date).slice(0, 10)}</span>
        </div>
      )}
    </button>
  );
}

function KanbanColumn({
  config,
  items,
  onSelect,
}: {
  config: typeof PERIOD_CONFIG[0];
  items: FollowUpItem[];
  onSelect: (taskId: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col rounded-xl border ${config.colBorder} bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden min-h-[520px]`}>
      {/* Column header */}
      <div className={`${config.headerBg} px-4 py-3 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${config.headerText}`}>
            {t(config.labelKey)}
          </span>
          <span className={`text-lg font-black ${config.headerText} tabular-nums`}>
            {items.length}
          </span>
        </div>
        {items.length > 0 && config.key === "delayed" && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle size={11} className="text-red-200" />
            <span className="text-[10px] text-red-200">{t("task.followUpDatePassed")}</span>
          </div>
        )}
        {config.key === "today" && items.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Clock size={11} className="text-yellow-200" />
            <span className="text-[10px] text-yellow-200">{t("task.contactRequiredToday")}</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[460px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-300 dark:text-gray-600">
            <div className="text-2xl mb-1">✓</div>
            <p className="text-xs">{t("task.allClear")}</p>
          </div>
        ) : (
          items.map((item) => (
            <TicketCard
              key={`${item.activity_id}-${item.task_id}`}
              item={item}
              cardBorder={config.cardBorder}
              dateBg={config.dateBg}
              urgencyLabel={t(config.urgencyKey)}
              urgencyClass={config.urgencyClass}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function NextFollowUpPanel({ onTaskSelect }: Props) {
  const { t } = useTranslation();
  const followUpQuery = useQuery({
    queryKey: ["tasks", "follow-up"],
    queryFn: () => tasksApi.getFollowUp().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const handleSelect = async (taskId: number) => {
    try {
      const taskResp = await tasksApi.getTask(taskId);
      if (taskResp.data) {
        onTaskSelect([taskResp.data], taskId);
      }
    } catch {
      // ignore
    }
  };

  const data = followUpQuery.data;

  if (followUpQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = PERIOD_CONFIG.reduce((acc, p) => acc + (data?.[p.key]?.length ?? 0), 0);
  const delayedCount = data?.delayed?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("task.followUpBoard")}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t("task.activitiesPending", { count: total })}
            {delayedCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                {t("task.overdueWarning", { count: delayedCount })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-red-500" /> {t("task.periodDelayedLabel")} <strong className="text-red-600 dark:text-red-400">{data?.delayed?.length ?? 0}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-yellow-500" /> {t("task.periodTodayLabel")} <strong className="text-yellow-600 dark:text-yellow-400">{data?.today?.length ?? 0}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500" /> {t("task.periodThisWeekLabel")} <strong className="text-green-600 dark:text-green-400">{data?.current_week?.length ?? 0}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-400" /> {t("task.periodNextWeekLabel")} <strong className="text-gray-600 dark:text-gray-300">{data?.next_week?.length ?? 0}</strong>
          </span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PERIOD_CONFIG.map((config) => (
          <KanbanColumn
            key={config.key}
            config={config}
            items={data?.[config.key] ?? []}
            onSelect={(taskId) => void handleSelect(taskId)}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {t("task.clickToOpenTask")}
      </p>
    </div>
  );
}
