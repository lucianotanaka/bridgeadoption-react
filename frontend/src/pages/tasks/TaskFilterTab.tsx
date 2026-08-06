import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search, X, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, FilterRequest } from "@/api/tasks";

interface Props {
  onTasksLoaded: (tasks: TaskItem[]) => void;
  onTaskSelect: (task: TaskItem) => void;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
  noOptionsLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        {selected.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {selected.slice(0, 2).map((s) => (
              <span key={s} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded">
                {s.length > 20 ? s.slice(0, 20) + "…" : s}
              </span>
            ))}
            {selected.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">+{selected.length - 2}</span>
            )}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{placeholder ?? "Select..."}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? "Search..."}
              className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">{noOptionsLabel ?? "No options"}</p>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskFilterTab({ onTasksLoaded, onTaskSelect }: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterRequest>({});
  const [results, setResults] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const optionsQuery = useQuery({
    queryKey: ["tasks", "filter-options"],
    queryFn: () => tasksApi.getFilterOptions().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const filterMutation = useMutation<TaskItem[], Error, FilterRequest>({
    mutationFn: (body: FilterRequest) => tasksApi.filterTasks(body).then((r) => r.data),
    onSuccess: (data: TaskItem[]) => {
      setResults(data);
      onTasksLoaded(data);
    },
  });

  const opts = optionsQuery.data;
  const hasFilters = Object.values(filters).some((v) => v && (v as unknown[]).length > 0);

  const setFilter = <K extends keyof FilterRequest>(key: K, val: FilterRequest[K]) => {
    setFilters((prev: FilterRequest) => ({ ...prev, [key]: val }));
  };

  const clearAll = () => {
    setFilters({});
    setResults([]);
    setSelectedTaskId(null);
  };

  const handleApply = () => {
    if (!hasFilters) return;
    filterMutation.mutate(filters);
  };

  const handleRowClick = (task: TaskItem) => {
    setSelectedTaskId(task.task_id);
    onTaskSelect(task);
  };

  const statusColor = (status?: string) => {
    const s = (status ?? "").toUpperCase();
    if (s.includes("OPEN")) return "text-blue-600 dark:text-blue-400";
    if (s.includes("PROGRESS") || s.includes("IN ")) return "text-yellow-600 dark:text-yellow-400";
    if (s.includes("HOLD")) return "text-orange-600 dark:text-orange-400";
    if (s.includes("DONE") || s.includes("CLOSED") || s.includes("COMPLETED")) return "text-green-600 dark:text-green-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const priorityColor = (priority?: string) => {
    const p = (priority ?? "").toUpperCase();
    if (p === "HIGH") return "text-red-600 dark:text-red-400";
    if (p === "MEDIUM") return "text-yellow-600 dark:text-yellow-400";
    return "text-blue-600 dark:text-blue-400";
  };

  if (optionsQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const msProps = {
    searchPlaceholder: t("task.filterSearchPlaceholder"),
    noOptionsLabel: t("task.filterNoOptions"),
  };

  return (
    <div className="space-y-4">
      {/* Filter Form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {t("task.title")} — {t("common.filter")}
          </button>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearAll} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <X size={12} /> {t("task.clearAll")}
              </button>
            )}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
            >
              {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {panelOpen && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MultiSelect {...msProps} label={t("task.filterOwner")} options={opts?.owners ?? []} selected={filters.owner_names ?? []} onChange={(v) => setFilter("owner_names", v)} placeholder={t("task.filterAllOwners")} />
          <MultiSelect {...msProps} label={t("task.filterTaskType")} options={opts?.task_types ?? []} selected={filters.task_type_names ?? []} onChange={(v) => setFilter("task_type_names", v)} placeholder={t("task.filterAllTypes")} />
          <MultiSelect {...msProps} label={t("task.filterClient")} options={opts?.clients ?? []} selected={filters.client_names ?? []} onChange={(v) => setFilter("client_names", v)} placeholder={t("task.filterAllClients")} />
          <MultiSelect {...msProps} label={t("task.filterWs")} options={opts?.ws_list ?? []} selected={filters.ws_list ?? []} onChange={(v) => setFilter("ws_list", v)} placeholder={t("task.filterAllWs")} />
          <MultiSelect {...msProps} label={t("task.filterTrack")} options={opts?.tracks ?? []} selected={filters.tracks ?? []} onChange={(v) => setFilter("tracks", v)} placeholder={t("task.filterAllTracks")} />
          <MultiSelect {...msProps} label={t("task.filterDealId")} options={opts?.deal_ids ?? []} selected={filters.deal_ids ?? []} onChange={(v) => setFilter("deal_ids", v)} placeholder={t("task.filterAllDeals")} />
          <MultiSelect {...msProps} label={t("task.filterStatus")} options={opts?.statuses ?? []} selected={filters.status_names ?? []} onChange={(v) => setFilter("status_names", v)} placeholder={t("task.filterAllStatuses")} />
        </div>}

        {panelOpen && <div className="flex justify-end">
          <button
            onClick={handleApply}
            disabled={!hasFilters || filterMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {filterMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Filter size={14} />
            )}
            {filterMutation.isPending ? t("task.filtering") : t("common.filter")}
          </button>
        </div>}
      </div>

      {filterMutation.isSuccess && results.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Search size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t("task.noTasksFound")}</p>
        </div>
      )}
    </div>
  );
}
