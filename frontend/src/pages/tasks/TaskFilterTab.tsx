import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search, X, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem, FilterRequest } from "@/api/tasks";

interface Props {
  initialTasks?: TaskItem[];
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const sortedFiltered = [...filtered].sort((a, b) => a.localeCompare(b));

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current?.contains(target ?? null)) return;

      const menuElement = document.getElementById(`task-filter-multiselect-${label}`);
      if (menuElement?.contains(target ?? null)) return;

      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, label]);

  const dropdownContent: ReactNode = (
    <div
      className="z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-hidden flex flex-col"
      style={menuStyle ? { width: `${menuStyle.width}px` } : { width: "100%" }}
    >
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
        {sortedFiltered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">{noOptionsLabel ?? "No options"}</p>
        ) : (
          sortedFiltered.map((opt) => (
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
  );

  return (
    <div ref={containerRef} className="relative">
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

      {open && menuStyle
        ? createPortal(
            <div
              id={`task-filter-multiselect-${label}`}
              className="fixed z-[9999]"
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
            >
              {dropdownContent}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function TaskFilterTab({ initialTasks = [], onTasksLoaded, onTaskSelect }: Props) {
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

  const statusTypesQuery = useQuery({
    queryKey: ["tasks", "status-types"],
    queryFn: () => tasksApi.getStatusTypes().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const taskTypesQuery = useQuery({
    queryKey: ["tasks", "task-types"],
    queryFn: () => tasksApi.getTaskTypes().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const source = results.length > 0 ? results : initialTasks;

  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

  const applyLocalFilters = (tasks: TaskItem[], body: FilterRequest): TaskItem[] => {
    return tasks.filter((task) => {
      if (body.owner_names?.length && !body.owner_names.some((value) => normalize(task.task_owner_name) === normalize(value))) {
        return false;
      }
      if (body.task_type_names?.length && !body.task_type_names.some((value) => normalize(task.task_type_name) === normalize(value))) {
        return false;
      }
      if (body.client_names?.length && !body.client_names.some((value) => normalize(task.task_customer_name) === normalize(value))) {
        return false;
      }
      if (body.ws_list?.length && !body.ws_list.some((value) => normalize(task.task_ws) === normalize(value))) {
        return false;
      }
      if (body.tracks?.length && !body.tracks.some((value) => normalize(task.task_track) === normalize(value))) {
        return false;
      }
      if (body.deal_ids?.length && !body.deal_ids.some((value) => normalize(task.task_deal_id) === normalize(value))) {
        return false;
      }
      if (
        body.status_names?.length &&
        !body.status_names.some(
          (value) =>
            normalize(task.task_status_reclassified) === normalize(value) ||
            normalize(task.task_status_name) === normalize(value)
        )
      ) {
        return false;
      }
      if (
        body.task_ids?.length &&
        !body.task_ids.some((value) => Number(task.task_id) === Number(value))
      ) {
        return false;
      }
      return true;
    });
  };

  const filterMutation = useMutation<TaskItem[], Error, FilterRequest>({
    mutationFn: async (body: FilterRequest) => {
      const response = await tasksApi.filterTasks(body);
      return response.data;
    },
  });

  const apiOptions = optionsQuery.data;

  const opts = useMemo(() => {
    const fromApi = {
      owners: apiOptions?.owners ?? [],
      task_types: apiOptions?.task_types ?? [],
      clients: apiOptions?.clients ?? [],
      ws_list: apiOptions?.ws_list ?? [],
      tracks: apiOptions?.tracks ?? [],
      deal_ids: apiOptions?.deal_ids ?? [],
      statuses: apiOptions?.statuses ?? [],
    };

    const unique = (values: Array<string | number | null | undefined>) =>
      Array.from(
        new Set(
          values
            .map((value) => String(value ?? "").trim())
            .filter((value) => value.length > 0 && value.toLowerCase() !== "none")
        )
      ).sort((a, b) => a.localeCompare(b));

    const fromInitialTasks = {
      owners: unique(initialTasks.map((task) => task.task_owner_name as string | undefined)),
      task_types: unique(initialTasks.map((task) => task.task_type_name as string | undefined)),
      clients: unique(initialTasks.map((task) => task.task_customer_name as string | undefined)),
      ws_list: unique(initialTasks.map((task) => task.task_ws as string | undefined)),
      tracks: unique(initialTasks.map((task) => task.task_track as string | undefined)),
      deal_ids: unique(initialTasks.map((task) => task.task_deal_id as string | undefined)),
      statuses: unique(
        initialTasks.map(
          (task) =>
            (task.task_status_reclassified as string | undefined) ??
            (task.task_status_name as string | undefined)
        )
      ),
    };

    const mergeUnique = (preferred: string[], fallback: string[]) =>
      Array.from(new Set([...preferred, ...fallback])).sort((a, b) => a.localeCompare(b));

    const fromTaskTypes = (taskTypesQuery.data ?? [])
      .map((tt) => String(tt.tasktype_name ?? "").trim())
      .filter((v) => v.length > 0);

    return {
      owners: mergeUnique(fromApi.owners, fromInitialTasks.owners),
      task_types: mergeUnique(
        mergeUnique(fromTaskTypes, fromApi.task_types),
        fromInitialTasks.task_types
      ),
      clients: mergeUnique(fromApi.clients, fromInitialTasks.clients),
      ws_list: mergeUnique(fromApi.ws_list, fromInitialTasks.ws_list),
      tracks: mergeUnique(fromApi.tracks, fromInitialTasks.tracks),
      deal_ids: mergeUnique(fromApi.deal_ids, fromInitialTasks.deal_ids),
      statuses: (() => {
        const fromStatusTypes = (statusTypesQuery.data ?? [])
          .map((st) => String(st.statustype_name ?? "").trim())
          .filter((v) => v.length > 0);

        const merged = mergeUnique(
          mergeUnique(fromStatusTypes, fromApi.statuses),
          fromInitialTasks.statuses
        );
        return merged;
      })(),
    };
  }, [apiOptions, initialTasks, statusTypesQuery.data, taskTypesQuery.data]);

  const hasFilters = Object.values(filters).some((v) => v && (v as unknown[]).length > 0);

  const setFilter = <K extends keyof FilterRequest>(key: K, val: FilterRequest[K]) => {
    setFilters((prev: FilterRequest) => ({ ...prev, [key]: val }));
  };

  const clearAll = () => {
    setFilters({});
    setResults([]);
    setSelectedTaskId(null);
    onTasksLoaded([]);
  };

  const handleApply = () => {
    if (!hasFilters) return;

    const localMatches = applyLocalFilters(initialTasks, filters);
    setResults(localMatches);
    onTasksLoaded(localMatches);

    filterMutation.mutate(filters, {
      onSuccess: (data) => {
        if (data.length === 0 && localMatches.length > 0) {
          return;
        }
        setResults(data);
        onTasksLoaded(data);
      },
      onError: () => {
        setResults(localMatches);
        onTasksLoaded(localMatches);
      },
    });
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
