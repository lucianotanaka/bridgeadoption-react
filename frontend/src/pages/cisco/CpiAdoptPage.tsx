import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Download,
  Filter,
  Layers,
  TrendingDown,
  GitBranch,
  BarChart3,
  List,
  Pencil,
  X,
} from "lucide-react";
import { cpiAdoptApi } from "@/api/cpiAdopt";
import type { CpiAdoptFilters, CpiAdoptRow, CpiAdoptStageRow } from "@/api/cpiAdopt";
import type { ActivityItem, TaskItem } from "@/api/tasks";
import Pagination from "@/components/ui/Pagination";
import { exportToXlsxMultiSheet } from "@/utils/exportXlsx";
import { useAuthStore } from "@/store/authStore";
import TaskDetailPanel from "@/pages/tasks/TaskDetailPanel";

type CpiTabKey = "base" | "tipo" | "pipeline";

type TipoSummaryRow = {
  tipo: "Project" | "Adoption";
  statusBucket: "A iniciar" | "Em andamento" | "Definir alocação";
  count: number;
  usd: number;
  hasAllocatedTeam: boolean;
};

type PipelineMonthRow = {
  fyNtt: number;
  fyCisco: number;
  quarterNtt: "Q1" | "Q2" | "Q3" | "Q4";
  quarterCisco: "Q1" | "Q2" | "Q3" | "Q4";
  quarterNttOrder: number;
  quarterCiscoOrder: number;
  month: string;
  monthOrder: number;
  count: number;
  usd: number;
};

type PipelineQuarterSummaryRow = {
  fyNtt: number;
  fyCisco: number;
  quarterNtt: "Q1" | "Q2" | "Q3" | "Q4";
  quarterCisco: "Q1" | "Q2" | "Q3" | "Q4";
  quarterNttOrder: number;
  quarterCiscoOrder: number;
  count: number;
  usd: number;
  months: PipelineMonthRow[];
};

function fmtUSD(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6) return `$${parseFloat((n / 1e6).toFixed(2))}M`;
  if (Math.abs(n) >= 1e3) return `$${parseFloat((n / 1e3).toFixed(2))}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(v: string | null | undefined, locale?: string): string {
  if (!v) return "—";

  const date = new Date(`${v.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return v.slice(0, 10);

  const effectiveLocale = (locale || "en").toLowerCase();
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());

  const monthMaps: Record<string, string[]> = {
    pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    en: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
    es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  };

  const monthIndex = date.getMonth();
  const monthSet = effectiveLocale.startsWith("pt")
    ? monthMaps.pt
    : effectiveLocale.startsWith("es")
      ? monthMaps.es
      : monthMaps.en;

  return `${day}-${monthSet[monthIndex]}-${year}`;
}

function formatActivityDetails(v: string | null | undefined): string[] {
  if (!v) return ["—"];

  return v
    .replace(/(\s)(\d+\.)\s/g, "\n$2 ")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;

  const normalized = n <= 1 && n >= 0 ? n * 100 : n;
  return Math.max(0, Math.min(100, normalized));
}

function fmtPercent(v: unknown): string {
  return `${Math.round(normalizePercent(v))}%`;
}

function fmtRatio(numerator: number, denominator: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return "—";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}% of Potential`;
}

function getPercent(v: unknown): number {
  return normalizePercent(v);
}

function pickFirstNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function daysColor(days: number | null | undefined): string {
  if (days == null) return "text-gray-500 dark:text-gray-400";
  if (days < 0) return "text-red-600 dark:text-red-400 font-bold";
  if (days <= 30) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-green-600 dark:text-green-400";
}

function getTipo(projectValue: string | null | undefined): "Project" | "Adoption" | null {
  const normalized = (projectValue ?? "").trim().toLowerCase();
  if (normalized === "yes") return "Project";
  if (normalized === "adoption") return "Adoption";
  return null;
}

function hasAllocatedTeam(engineerValue: string | null | undefined): boolean {
  return Boolean(engineerValue && engineerValue.trim());
}

function getStatusBucket(row: CpiAdoptRow): "A iniciar" | "Em andamento" | "Definir alocação" | null {
  const tipo = getTipo(row.project);
  if (!tipo) return null;

  if (!hasAllocatedTeam(row.engineer)) {
    return "Definir alocação";
  }

  const normalizedStatus = (row.task_status ?? "").trim().toUpperCase();

  if (normalizedStatus === "OPEN") {
    return "A iniciar";
  }

  if (
    [
      "IN PROGRESS",
      "ON HOLD",
      "SUBMITTED TO APPROVAL",
      "RESUBMITTED TO APPROVAL",
      "APPROVED TO CLOSE",
    ].includes(normalizedStatus)
  ) {
    return "Em andamento";
  }

  return null;
}

function aggregateTipoSummary(rows: CpiAdoptRow[]): TipoSummaryRow[] {
  const acc = new Map<string, TipoSummaryRow>();

  rows.forEach((row) => {
    const tipo = getTipo(row.project);
    const statusBucket = getStatusBucket(row);
    if (!tipo || !statusBucket) return;

    const key = `${tipo}__${statusBucket}`;
    const current = acc.get(key) ?? {
      tipo,
      statusBucket,
      count: 0,
      usd: 0,
      hasAllocatedTeam: hasAllocatedTeam(row.engineer),
    };

    current.count += 1;
    current.usd += Number(row.remaining_balance_usd) || 0;
    current.hasAllocatedTeam = current.hasAllocatedTeam || hasAllocatedTeam(row.engineer);
    acc.set(key, current);
  });

  const orderTipo = { Project: 0, Adoption: 1 } as const;
  const orderStatus = { "A iniciar": 0, "Em andamento": 1, "Definir alocação": 2 } as const;

  return Array.from(acc.values()).sort((a, b) => {
    const tipoDiff = orderTipo[a.tipo] - orderTipo[b.tipo];
    if (tipoDiff !== 0) return tipoDiff;
    return orderStatus[a.statusBucket] - orderStatus[b.statusBucket];
  });
}

function getFiscalYearQuarterFromDate(value: string | null | undefined): {
  fyNtt: number;
  fyCisco: number;
  quarterNtt: "Q1" | "Q2" | "Q3" | "Q4";
  quarterCisco: "Q1" | "Q2" | "Q3" | "Q4";
  quarterNttOrder: number;
  quarterCiscoOrder: number;
  month: string;
  monthOrder: number;
} | null {
  if (!value) return null;

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const monthLabelMap = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

  const nttConfig = [
    { monthIndex: 3, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1, monthOrder: 1 },
    { monthIndex: 4, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1, monthOrder: 2 },
    { monthIndex: 5, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1, monthOrder: 3 },
    { monthIndex: 6, fyOffset: 1, quarter: "Q2" as const, quarterOrder: 2, monthOrder: 4 },
    { monthIndex: 7, fyOffset: 1, quarter: "Q2" as const, quarterOrder: 2, monthOrder: 5 },
    { monthIndex: 8, fyOffset: 1, quarter: "Q2" as const, quarterOrder: 2, monthOrder: 6 },
    { monthIndex: 9, fyOffset: 1, quarter: "Q3" as const, quarterOrder: 3, monthOrder: 7 },
    { monthIndex: 10, fyOffset: 1, quarter: "Q3" as const, quarterOrder: 3, monthOrder: 8 },
    { monthIndex: 11, fyOffset: 1, quarter: "Q3" as const, quarterOrder: 3, monthOrder: 9 },
    { monthIndex: 0, fyOffset: 0, quarter: "Q4" as const, quarterOrder: 4, monthOrder: 10 },
    { monthIndex: 1, fyOffset: 0, quarter: "Q4" as const, quarterOrder: 4, monthOrder: 11 },
    { monthIndex: 2, fyOffset: 0, quarter: "Q4" as const, quarterOrder: 4, monthOrder: 12 },
  ].find((item) => item.monthIndex === monthIndex);

  const ciscoConfig = [
    { monthIndex: 7, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1 },
    { monthIndex: 8, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1 },
    { monthIndex: 9, fyOffset: 1, quarter: "Q1" as const, quarterOrder: 1 },
    { monthIndex: 10, fyOffset: 1, quarter: "Q2" as const, quarterOrder: 2 },
    { monthIndex: 11, fyOffset: 1, quarter: "Q2" as const, quarterOrder: 2 },
    { monthIndex: 0, fyOffset: 0, quarter: "Q2" as const, quarterOrder: 2 },
    { monthIndex: 1, fyOffset: 0, quarter: "Q3" as const, quarterOrder: 3 },
    { monthIndex: 2, fyOffset: 0, quarter: "Q3" as const, quarterOrder: 3 },
    { monthIndex: 3, fyOffset: 1, quarter: "Q3" as const, quarterOrder: 3 },
    { monthIndex: 4, fyOffset: 1, quarter: "Q4" as const, quarterOrder: 4 },
    { monthIndex: 5, fyOffset: 1, quarter: "Q4" as const, quarterOrder: 4 },
    { monthIndex: 6, fyOffset: 1, quarter: "Q4" as const, quarterOrder: 4 },
  ].find((item) => item.monthIndex === monthIndex);

  if (!nttConfig || !ciscoConfig) return null;

  return {
    fyNtt: year + nttConfig.fyOffset,
    fyCisco: year + ciscoConfig.fyOffset,
    quarterNtt: nttConfig.quarter,
    quarterCisco: ciscoConfig.quarter,
    quarterNttOrder: nttConfig.quarterOrder,
    quarterCiscoOrder: ciscoConfig.quarterOrder,
    month: monthLabelMap[monthIndex],
    monthOrder: nttConfig.monthOrder,
  };
}

function aggregatePipelineOptIn(rows: CpiAdoptRow[]): PipelineQuarterSummaryRow[] {
  const quarterMap = new Map<string, PipelineQuarterSummaryRow>();

  rows
    .filter((row) => row.is_pipeline)
    .forEach((row) => {
      const timeline = getFiscalYearQuarterFromDate(row.task_start || row.task_end);
      if (!timeline) return;

      const quarterKey = `${timeline.fyNtt}__${timeline.fyCisco}__${timeline.quarterNtt}__${timeline.quarterCisco}`;
      const existingQuarter = quarterMap.get(quarterKey) ?? {
        fyNtt: timeline.fyNtt,
        fyCisco: timeline.fyCisco,
        quarterNtt: timeline.quarterNtt,
        quarterCisco: timeline.quarterCisco,
        quarterNttOrder: timeline.quarterNttOrder,
        quarterCiscoOrder: timeline.quarterCiscoOrder,
        count: 0,
        usd: 0,
        months: [],
      };

      existingQuarter.count += 1;
      existingQuarter.usd += Number(row.remaining_balance_usd) || 0;

      const monthKey = `${timeline.fyNtt}__${timeline.fyCisco}__${timeline.quarterNtt}__${timeline.quarterCisco}__${timeline.month}`;
      const existingMonth = existingQuarter.months.find(
        (month) => `${month.fyNtt}__${month.fyCisco}__${month.quarterNtt}__${month.quarterCisco}__${month.month}` === monthKey
      );

      if (existingMonth) {
        existingMonth.count += 1;
        existingMonth.usd += Number(row.remaining_balance_usd) || 0;
      } else {
        existingQuarter.months.push({
          fyNtt: timeline.fyNtt,
          fyCisco: timeline.fyCisco,
          quarterNtt: timeline.quarterNtt,
          quarterCisco: timeline.quarterCisco,
          quarterNttOrder: timeline.quarterNttOrder,
          quarterCiscoOrder: timeline.quarterCiscoOrder,
          month: timeline.month,
          monthOrder: timeline.monthOrder,
          count: 1,
          usd: Number(row.remaining_balance_usd) || 0,
        });
      }

      quarterMap.set(quarterKey, existingQuarter);
    });

  return Array.from(quarterMap.values())
    .map((quarter) => ({
      ...quarter,
      months: [...quarter.months].sort((a, b) => a.monthOrder - b.monthOrder),
    }))
    .sort((a, b) =>
      (a.fyNtt - b.fyNtt) ||
      (a.quarterNttOrder - b.quarterNttOrder) ||
      (a.fyCisco - b.fyCisco) ||
      (a.quarterCiscoOrder - b.quarterCiscoOrder)
    );
}

function optInStatusBadge(
  v: string | null,
  opts?: { highlightAttention?: boolean; highlightOptOutReview?: boolean }
): React.ReactNode {
  if (!v) return <span className="text-gray-400">—</span>;

  const normalized = v.trim().toLowerCase();
  const highlightAttention = opts?.highlightAttention ?? false;
  const highlightOptOutReview = opts?.highlightOptOutReview ?? false;

  if (highlightAttention && normalized === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
        {v}
      </span>
    );
  }

  if (highlightOptOutReview && (normalized === "opted out" || normalized === "opt out")) {
    return (
      <span
        title="Review Opt Out justification to avoid Lost"
        className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 dark:border-orange-700/60 dark:bg-orange-900/30 dark:text-orange-200"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-300" />
        {v}
      </span>
    );
  }

  if (normalized === "yes") {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
        {v}
      </span>
    );
  }

  if (normalized === "no") {
    return (
      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
        {v}
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
      {v}
    </span>
  );
}

function projectBadge(v: string | null): React.ReactNode {
  if (!v) return <span className="text-gray-400">—</span>;
  const colorMap: Record<string, string> = {
    Adoption: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    Yes: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    No: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colorMap[v] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
      }`}
    >
      {v}
    </span>
  );
}

function getTimelineTone(value: number, progressValue?: number): {
  text: string;
  fill: string;
  track: string;
} {
  if (progressValue === 100) {
    return {
      text: "text-gray-500 dark:text-gray-400",
      fill: "bg-gray-400 dark:bg-gray-500",
      track: "bg-gray-200 dark:bg-gray-800",
    };
  }

  if (value >= 75) {
    return {
      text: "text-red-600 dark:text-red-400",
      fill: "bg-red-600",
      track: "bg-red-100 dark:bg-red-950/40",
    };
  }

  if (value >= 50) {
    return {
      text: "text-yellow-500 dark:text-yellow-300",
      fill: "bg-yellow-400",
      track: "bg-yellow-100 dark:bg-yellow-950/40",
    };
  }

  return {
    text: "text-green-600 dark:text-green-400",
    fill: "bg-green-500",
    track: "bg-green-100 dark:bg-green-950/40",
  };
}

function getProgressTone(value: number): {
  text: string;
  fill: string;
  track: string;
} {
  if (value >= 75) {
    return {
      text: "text-green-600 dark:text-green-400",
      fill: "bg-green-500",
      track: "bg-green-100 dark:bg-green-950/40",
    };
  }

  if (value >= 50) {
    return {
      text: "text-yellow-500 dark:text-yellow-300",
      fill: "bg-yellow-400",
      track: "bg-yellow-100 dark:bg-yellow-950/40",
    };
  }

  return {
    text: "text-red-600 dark:text-red-400",
    fill: "bg-red-600",
    track: "bg-red-100 dark:bg-red-950/40",
  };
}

function ProgressBar({
  value,
  compact = false,
  mode = "progress",
  progressValue,
}: {
  value: unknown;
  compact?: boolean;
  mode?: "timeline" | "progress";
  progressValue?: unknown;
}) {
  const pct = getPercent(value);
  const relatedProgressPct = progressValue == null ? undefined : getPercent(progressValue);
  const tone =
    mode === "timeline" ? getTimelineTone(pct, relatedProgressPct) : getProgressTone(pct);

  return (
    <div className={`flex items-center gap-2 ${compact ? "min-w-[140px]" : "min-w-[180px]"}`}>
      <div className={`h-3 flex-1 overflow-hidden rounded-full ${tone.track}`}>
        <div
          className={`h-full rounded-full ${tone.fill} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-10 text-right text-[11px] font-semibold ${tone.text}`}>
        {fmtPercent(pct)}
      </span>
    </div>
  );
}

function toggleSelection(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

type MultiSelectOption = string | { value: string; label: string };

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  searchable = false,
  searchPlaceholder = "Type to filter…",
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  const filteredOptions = !searchable || !search.trim()
    ? normalizedOptions
    : normalizedOptions.filter((option) =>
        option.label.toLowerCase().includes(search.trim().toLowerCase())
      );

  const selectedLabels = normalizedOptions
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (selectedLabels[0] ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        <span className="truncate text-left" title={summary}>{summary}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {selected.length ? `${selected.length} selected` : "All"}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear
            </button>
          </div>

          {searchable && (
            <div className="border-b border-gray-100 px-2 py-2 dark:border-gray-700">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-2">
            <div className="space-y-1">
              {filteredOptions.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={`${label}-option-${option.value}`}
                    title={option.label}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500">
                  No options found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TruncatedCell({
  value,
  widthClass = "max-w-[220px]",
}: {
  value: string | null | undefined;
  widthClass?: string;
}) {
  if (!value) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div
      title={value}
      className={`${widthClass} overflow-hidden text-ellipsis whitespace-nowrap`}
    >
      {value}
    </div>
  );
}

function KPICard({
  label,
  value,
  sub,
  accent,
  icon,
  help,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "purple" | "red";
  icon?: React.ReactNode;
  help?: string;
}) {
  const cls = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    purple: "text-purple-600 dark:text-purple-400",
    red: "text-red-600 dark:text-red-400",
  }[accent ?? "blue"];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          {help && (
            <span
              title={help}
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500 dark:border-gray-600 dark:text-gray-400"
            >
              ?
            </span>
          )}
        </div>
        {icon && <span className={cls}>{icon}</span>}
      </div>
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function TipoSummaryGrid({
  rows,
}: {
  rows: TipoSummaryRow[];
}) {
  const totalUsd = rows.reduce((sum, row) => sum + row.usd, 0);
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        No Tipo x Incentivos data available for the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Tipo</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Status Bucket</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Allocated Team</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Count of Incentivo</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">% Count</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Sum of Valor Restante</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">% USD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const pctCount = totalCount > 0 ? ((row.count / totalCount) * 100).toFixed(1) : "0.0";
            const pctUsd = totalUsd > 0 ? ((row.usd / totalUsd) * 100).toFixed(1) : "0.0";
            return (
              <tr
                key={`${row.tipo}-${row.statusBucket}-${index}`}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{row.tipo}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.statusBucket}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {row.hasAllocatedTeam ? "Yes" : "No"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{row.count}</td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{pctCount}%</td>
                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{fmtUSD(row.usd)}</td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{pctUsd}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineOptInGrid({
  rows,
}: {
  rows: PipelineQuarterSummaryRow[];
}) {
  const totalUsd = rows.reduce((sum, row) => sum + row.usd, 0);
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        No pipeline opt-in data available for the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">FY NTT / Cisco</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Q NTT / Cisco</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Month</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Count of Incentivo</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">% Count</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Sum of Valor Restante</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">% USD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((quarter) => {
            const quarterPctCount = totalCount > 0 ? ((quarter.count / totalCount) * 100).toFixed(1) : "0.0";
            const quarterPctUsd = totalUsd > 0 ? ((quarter.usd / totalUsd) * 100).toFixed(1) : "0.0";

            return (
              <Fragment
                key={`pipeline-quarter-${quarter.fyNtt}-${quarter.quarterNtt}-${quarter.fyCisco}-${quarter.quarterCisco}`}
              >
                <tr className="border-b border-blue-100 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/10">
                  <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">
                    {quarter.fyNtt} / {quarter.fyCisco}
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">
                    {quarter.quarterNtt} / {quarter.quarterCisco}
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">Quarter Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">{quarter.count}</td>
                  <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{quarterPctCount}%</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">{fmtUSD(quarter.usd)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{quarterPctUsd}%</td>
                </tr>

                {quarter.months.map((month) => {
                  const monthPctCount = totalCount > 0 ? ((month.count / totalCount) * 100).toFixed(1) : "0.0";
                  const monthPctUsd = totalUsd > 0 ? ((month.usd / totalUsd) * 100).toFixed(1) : "0.0";

                  return (
                    <tr
                      key={`pipeline-month-${month.fyNtt}-${month.quarterNtt}-${month.fyCisco}-${month.quarterCisco}-${month.month}`}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                        {month.fyNtt} / {month.fyCisco}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                        {month.quarterNtt} / {month.quarterCisco}
                      </td>
                      <td className="px-3 py-2 pl-8 text-gray-700 dark:text-gray-300">{month.month}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{month.count}</td>
                      <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{monthPctCount}%</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{fmtUSD(month.usd)}</td>
                      <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{monthPctUsd}%</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];
const TIMELINE_STAGE_OPTIONS = [
  { value: "Early", label: "Early (<50%)" },
  { value: "Mid", label: "Mid (50–74%)" },
  { value: "Late", label: "Late (75%+)" },
  { value: "Completed", label: "Completed (Progress 100%)" },
];

function buildExportRows(rows: CpiAdoptRow[]) {
  const parentRows = rows.map((row) => ({
    task_id: row.task_id,
    task_ws: row.task_ws,
    deal_id: row.deal_id,
    cr_party_id: row.cr_party_id,
    client: row.client,
    solution: row.solution,
    use_case: row.use_case,
    opt_in: row.opt_in,
    opt_in_status: row.opt_in_status,
    is_potential: row.is_potential,
    is_lost: row.is_lost,
    is_at_risk: row.is_at_risk,
    is_pipeline: row.is_pipeline,
    total_amount_usd: row.total_amount_usd,
    lost_amount_usd: row.lost_amount_usd,
    claim_approved_amount_usd: row.claim_approved_amount_usd,
    payment_approved_amount_usd: row.payment_approved_amount_usd,
    remaining_balance_usd: row.remaining_balance_usd,
    task_start: row.task_start,
    task_end: row.task_end,
    days_remaining: row.days_remaining,
    task_status: row.task_status,
    project: row.project,
    project_ov: row.project_ov,
    engineer: row.engineer,
    pm_csm: row.pm_csm,
    time_elapsed_pct: row.time_elapsed_pct ?? null,
    task_completed: row.task_completed ?? null,
  }));

  const stageRows = rows.flatMap((row) =>
    (row.stages ?? []).map((stage) => {
      const stageData = stage as Record<string, unknown>;
      return {
        task_id: row.task_id,
        client: row.client,
        solution: row.solution,
        activity_id: stage.activity_id,
        activity_seq: pickFirstNumber(stageData, ["activity_seq", "stage_seq"]),
        activity_name: pickFirstString(stageData, ["activity_name", "stage_name", "name"]),
        activity_status: pickFirstString(stageData, ["activity_status", "stage_status", "status"]),
        activity_start: pickFirstString(stageData, ["activity_start", "stage_start", "start_date"]),
        activity_end: pickFirstString(stageData, ["activity_end", "stage_end", "end_date"]),
        time_elapsed_pct: pickFirstNumber(stageData, ["time_elapsed_pct", "time_elapsed %", "time_elapsed"]),
        activity_completed: pickFirstNumber(stageData, [
          "activity_completed",
          "completed_pct",
          "completion_pct",
          "activity_completed_pct",
        ]),
      };
    })
  );

  return { parentRows, stageRows };
}

function StageTable({
  stages,
  locale,
  canEdit = false,
  onEditStage,
}: {
  stages: CpiAdoptStageRow[];
  locale?: string;
  canEdit?: boolean;
  onEditStage?: (activityId: number | null) => void;
}) {
  if (!stages.length) {
    return <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">No activities found for this task.</p>;
  }

  return (
    <div className="px-4 pb-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2672px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/70">
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Activity ID</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Step</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Name</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Start</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">End</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Start Performed</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">End Performed</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Activity WS</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Timeline</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Progress</th>
            <th className="px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Total</th>
            <th className="px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Claim Approved</th>
            <th className="px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Payment Approved</th>
            <th className="px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400">Remaining</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Stage Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Claim Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Payment Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Latest Info</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Next Follow Up Info</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Latest Issue</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Latest Issue Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Next Follow Up Issue</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Latest Blocker</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Latest Blocker Status</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Next Follow Up Blocker</th>
            <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Details</th>
            <th className="sticky right-0 z-10 min-w-[72px] px-2 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-gray-800/70 border-l border-gray-200 dark:border-gray-700 shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.35)]">
              Edit
            </th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage, index) => {
            const stageData = stage as Record<string, unknown>;
            const seq = pickFirstNumber(stageData, ["activity_seq", "stage_seq"]);
            const activityWs = pickFirstString(stageData, ["activity_ws"]);
            const name = pickFirstString(stageData, ["activity_name", "stage_name", "name"]);
            const status = pickFirstString(stageData, ["activity_status", "stage_status", "status"]);
            const stageStatus = pickFirstString(stageData, ["stage_status", "status"]);
            const claimStatus = pickFirstString(stageData, ["claim_status"]);
            const paymentStatus = pickFirstString(stageData, ["payment_status"]);
            const activityDetails = pickFirstString(stageData, ["activity_details"]);
            const latestInfo = pickFirstString(stageData, ["lastest_info"]);
            const nextFollowUpInfo = pickFirstString(stageData, ["next_follow_up_info"]);
            const latestIssue = pickFirstString(stageData, ["lastest_issue"]);
            const latestIssueStatus = pickFirstString(stageData, ["lastest_issue_status"]);
            const nextFollowUpIssue = pickFirstString(stageData, ["next_follow_up_issue"]);
            const latestBlocker = pickFirstString(stageData, ["lastest_blocker"]);
            const latestBlockerStatus = pickFirstString(stageData, ["lastest_blocker_status"]);
            const nextFollowUpBlocker = pickFirstString(stageData, ["next_follow_up_blocker"]);
            const start = pickFirstString(stageData, ["activity_start", "stage_start", "start_date"]);
            const end = pickFirstString(stageData, ["activity_end", "stage_end", "end_date"]);
            const startPerformed = pickFirstString(stageData, ["activity_start_performed"]);
            const endPerformed = pickFirstString(stageData, ["activity_end_performed"]);
            const elapsed = pickFirstNumber(stageData, ["time_elapsed_pct", "time_elapsed %", "time_elapsed"]);
            const completed = pickFirstNumber(stageData, [
              "activity_completed",
              "completed_pct",
              "completion_pct",
              "activity_completed_pct",
            ]);
            const activityValue = pickFirstNumber(stageData, ["activity_value"]);
            const activityApprovedValue = pickFirstNumber(stageData, ["activity_approved_value"]);
            const paymentApprovedValue = pickFirstNumber(stageData, [
              "payment_approved_value",
              "payment_approved_amount",
              "payment_approved_amount_usd",
            ]);
            const remainingValue =
              activityValue != null && activityApprovedValue != null
                ? activityValue - activityApprovedValue
                : null;

            return (
              <tr
                key={`${stage.task_id ?? "task"}-${stage.activity_id ?? index}`}
                className="border-b border-gray-100 bg-white/70 dark:border-gray-800 dark:bg-gray-900/40"
              >
                <td className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {stage.activity_id ?? "—"}
                </td>
                <td className="px-2 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {seq != null ? seq : "—"}
                </td>
                <td className="px-2 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{name ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(start, locale)}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(end, locale)}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(startPerformed, locale)}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(endPerformed, locale)}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{activityWs ?? "—"}</td>
                <td className="px-2 py-2">
                  <ProgressBar
                    value={elapsed ?? 0}
                    compact
                    mode="timeline"
                    progressValue={completed ?? 0}
                  />
                </td>
                <td className="px-2 py-2">
                  <ProgressBar value={completed ?? 0} compact />
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {activityValue != null ? fmtUSD(activityValue) : "—"}
                </td>
                <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                  {activityApprovedValue != null ? fmtUSD(activityApprovedValue) : "—"}
                </td>
                <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                  {paymentApprovedValue != null ? fmtUSD(paymentApprovedValue) : "—"}
                </td>
                <td className="px-2 py-2 text-right text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                  {remainingValue != null ? fmtUSD(remainingValue) : "—"}
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{status ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{stageStatus ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{claimStatus ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{paymentStatus ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={latestInfo} />
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={nextFollowUpInfo} />
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={latestIssue} />
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{latestIssueStatus ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={nextFollowUpIssue} />
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={latestBlocker} />
                </td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{latestBlockerStatus ?? "—"}</td>
                <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                  <TruncatedCell value={nextFollowUpBlocker} />
                </td>
                <td className="max-w-[320px] px-2 py-2 text-gray-500 dark:text-gray-400">
                  <div className="space-y-1">
                    {formatActivityDetails(activityDetails).map((item, itemIndex) => {
                      const isClosedStage = ["cancelled", "declined", "expired", "completed/closed"].includes(
                        (status ?? "").trim().toLowerCase()
                      );
                      const isPending = /\s-\sN$/i.test(item) && !isClosedStage;
                      return (
                        <div
                          key={`${stage.task_id ?? "task"}-${stage.activity_id ?? index}-detail-${itemIndex}`}
                          className={`break-words whitespace-normal ${
                            isPending
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : ""
                          }`}
                        >
                          {item}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="sticky right-0 z-10 min-w-[72px] border-l border-gray-200 bg-white/95 px-2 py-2 text-center shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.35)] dark:border-gray-700 dark:bg-gray-900/95">
                  <button
                    type="button"
                    onClick={() => canEdit && onEditStage?.(stage.activity_id ?? null)}
                    disabled={!canEdit || stage.activity_id == null}
                    title={canEdit ? "Open Activity Detail" : "No permission to open Activity Detail"}
                    className="inline-flex items-center justify-center text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
      </div>
    </div>
  );
}

function CpiAdoptDetailOverlay({
  row,
  locale,
  onClose,
}: {
  row: CpiAdoptRow;
  locale: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const meta: { label: string; value: React.ReactNode }[] = [
    { label: "Task ID", value: row.task_id ?? "—" },
    { label: "Client", value: row.client ?? "—" },
    { label: "Solution", value: row.solution ?? "—" },
    { label: "Use Case", value: row.use_case ?? "—" },
    { label: "Incentive (WS)", value: row.task_ws ?? "—" },
    { label: "Deal ID", value: row.deal_id ?? "—" },
    { label: "CR Party ID", value: row.cr_party_id ?? "—" },
    { label: "Start", value: fmtDate(row.task_start, locale) },
    { label: "End", value: fmtDate(row.task_end, locale) },
    { label: "Days Remaining", value: <span className={daysColor(row.days_remaining)}>{row.days_remaining ?? "—"}</span> },
    { label: "Status", value: row.task_status ?? "—" },
    { label: "Task Eligible", value: (row as Record<string, unknown>)["task_eligible"] as string ?? "—" },
    { label: "Opt In", value: row.opt_in ?? "—" },
    { label: "Opt In Status", value: optInStatusBadge(row.opt_in_status ?? null) },
    { label: "Project", value: projectBadge(row.project ?? null) },
    { label: "Project OV", value: row.project_ov ?? "—" },
    { label: "Engineer", value: row.engineer ?? "—" },
    { label: "PM / CSM", value: row.pm_csm ?? "—" },
    { label: "Total", value: fmtUSD(row.total_amount_usd) },
    { label: "Lost", value: <span className="text-red-600 dark:text-red-400">{fmtUSD(row.lost_amount_usd)}</span> },
    { label: "Claim Approved", value: <span className="text-green-600 dark:text-green-400">{fmtUSD(row.claim_approved_amount_usd)}</span> },
    { label: "Payment Approved", value: <span className="text-green-600 dark:text-green-400">{fmtUSD(row.payment_approved_amount_usd)}</span> },
    { label: "Remaining Balance", value: <span className="text-yellow-600 dark:text-yellow-400">{fmtUSD(row.remaining_balance_usd)}</span> },
    { label: "Potential", value: row.is_potential ? "Yes" : "No" },
    { label: "At Risk", value: row.is_at_risk ? "Yes" : "No" },
    { label: "Pipeline", value: row.is_pipeline ? "Yes" : "No" },
    { label: "Lost Flag", value: row.is_lost ? "Yes" : "No" },
  ];

  const stages = Array.isArray(row.stages) ? row.stages : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Task {row.task_id} — {row.client ?? ""}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {row.solution ?? ""}{row.task_ws ? ` · ${row.task_ws}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Metadata grid */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Task Metadata
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-4">
              {meta.map(({ label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
                  <span className="mt-0.5 text-xs font-medium text-gray-800 dark:text-gray-200 break-words">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline & Progress */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Progress
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Timeline Elapsed</span>
                <ProgressBar value={row.time_elapsed_pct ?? 0} mode="timeline" progressValue={row.task_completed ?? 0} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Task Completed</span>
                <ProgressBar value={row.task_completed ?? 0} />
              </div>
            </div>
          </div>

          {/* Activities */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Child Activities ({stages.length})
            </p>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700">
              <StageTable stages={stages} locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function CpiAdoptPage() {
  const { i18n } = useTranslation();
  const [clientSearch, setClientSearch] = useState("");
  const [taskIdSearch, setTaskIdSearch] = useState("");
  const [taskWsSearch, setTaskWsSearch] = useState("");
  const [dealIdSearch, setDealIdSearch] = useState("");
  const [solution, setSolution] = useState<string[]>([]);
  const [taskStatus, setTaskStatus] = useState<string[]>([]);
  const [optIn, setOptIn] = useState<string[]>([]);
  const [project, setProject] = useState<string[]>([]);
  const [timelineStage, setTimelineStage] = useState<string[]>([]);
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<CpiAdoptFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<CpiTabKey>("base");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  const fyRangeQuery = useQuery({
    queryKey: ["cpi-adopt", "fy-range"],
    queryFn: () => cpiAdoptApi.getFyRange().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const reportQuery = useQuery({
    queryKey: ["cpi-adopt", "report", appliedFilters],
    queryFn: () => cpiAdoptApi.getReport(appliedFilters).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ["cpi-adopt", "summary", appliedFilters],
    queryFn: () => cpiAdoptApi.getSummary(appliedFilters).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const filtersQuery = useQuery({
    queryKey: ["cpi-adopt", "filters", appliedFilters.fy_start ?? null, appliedFilters.fy_end ?? null],
    queryFn: () =>
      cpiAdoptApi
        .getFilters({ fy_start: appliedFilters.fy_start, fy_end: appliedFilters.fy_end })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const rows = reportQuery.data ?? [];
  const summary = summaryQuery.data;
  const filterOptions = filtersQuery.data;
  const fyRange = fyRangeQuery.data;
  const isDark = document.documentElement.classList.contains("dark");
  const hasTaskPermission = useAuthStore((s) => s.hasPermission("task.task"));

  const selectedTaskForPanel = useMemo<TaskItem | null>(() => {
    if (selectedTaskId == null) return null;
    const sourceRow = rows.find((row) => row.task_id === selectedTaskId);
    if (!sourceRow) return null;

    const parseStatusId = (statusName: string | null | undefined): number | undefined => {
      const normalized = (statusName ?? "").trim().toUpperCase();
      if (!normalized) return undefined;
      if (normalized === "OPEN") return 1;
      if (normalized === "IN PROGRESS") return 2;
      if (normalized === "ON HOLD") return 3;
      if (normalized === "CANCELLED" || normalized === "CANCELED") return 4;
      if (normalized === "SUBMITTED TO APPROVAL") return 7;
      if (normalized === "RESUBMITTED TO APPROVAL") return 8;
      if (normalized === "APPROVED TO CLOSE") return 9;
      if (normalized === "CLOSED" || normalized === "DONE" || normalized === "COMPLETED") return 10;
      return undefined;
    };

    const preloadedActivities: ActivityItem[] = Array.isArray(sourceRow.stages)
      ? sourceRow.stages.map((stage) => {
          const stageData = stage as Record<string, unknown>;
          const completedValue = pickFirstNumber(stageData, [
            "activity_completed",
            "completed_pct",
            "completion_pct",
            "activity_completed_pct",
          ]);
          const normalizedCompleted =
            completedValue == null
              ? 0
              : completedValue > 1
                ? completedValue / 100
                : completedValue;

          const activityStatusName = pickFirstString(stageData, ["activity_status", "stage_status", "status"]) ?? undefined;

          return {
            activity_id: Number(stage.activity_id ?? 0),
            activity_task_id: sourceRow.task_id ?? undefined,
            activity_seq: pickFirstNumber(stageData, ["activity_seq", "stage_seq"]) ?? undefined,
            activity_name: pickFirstString(stageData, ["activity_name", "stage_name", "name"]) ?? undefined,
            activity_status: parseStatusId(activityStatusName),
            activity_status_name: activityStatusName,
            activity_start: pickFirstString(stageData, ["activity_start", "stage_start", "start_date"]) ?? undefined,
            activity_end: pickFirstString(stageData, ["activity_end", "stage_end", "end_date"]) ?? undefined,
            activity_start_performed: pickFirstString(stageData, ["activity_start_performed"]) ?? undefined,
            activity_end_performed: pickFirstString(stageData, ["activity_end_performed"]) ?? undefined,
            activity_completed: normalizedCompleted,
            activity_ws: pickFirstString(stageData, ["activity_ws"]) ?? undefined,
            activity_deal_id: sourceRow.deal_id ?? undefined,
            activity_value: pickFirstNumber(stageData, ["activity_value"]) ?? undefined,
            activity_approved_value: pickFirstNumber(stageData, ["activity_approved_value"]) ?? undefined,
            activity_currency: "USD",
            activity_approved_currency: "USD",
            activity_objective: pickFirstString(stageData, ["activity_objective"]) ?? undefined,
            activity_scope: pickFirstString(stageData, ["activity_scope"]) ?? undefined,
            activity_expected_results: pickFirstString(stageData, ["activity_expected_results"]) ?? undefined,
            activity_track: sourceRow.solution ?? undefined,
            activity_sub_track: sourceRow.use_case ?? undefined,
          };
        })
      : [];

    return {
      task_id: sourceRow.task_id ?? 0,
      task_customer_name: sourceRow.client ?? undefined,
      task_type_name: "CPI Adopt",
      task_status_id: parseStatusId(sourceRow.task_status),
      task_status_name: sourceRow.task_status ?? undefined,
      task_ws: sourceRow.task_ws ?? undefined,
      task_deal_id: sourceRow.deal_id ?? undefined,
      task_start: sourceRow.task_start ?? undefined,
      task_end: sourceRow.task_end ?? undefined,
      task_end_performed: sourceRow.task_end ?? undefined,
      task_completed:
        typeof sourceRow.task_completed === "number"
          ? sourceRow.task_completed
          : typeof sourceRow.task_completed === "string"
            ? Number(sourceRow.task_completed)
            : 0,
      task_track: sourceRow.solution ?? undefined,
      task_subtrack: sourceRow.use_case ?? undefined,
      task_reference: sourceRow.cr_party_id ?? undefined,
      task_description: sourceRow.project_ov ?? undefined,
      task_eligible: (sourceRow as Record<string, unknown>)["task_eligible"] as string | undefined,
      task_value: typeof sourceRow.total_amount_usd === "number" ? sourceRow.total_amount_usd : Number(sourceRow.total_amount_usd) || 0,
      task_currency: "USD",
      task_activities_preloaded: preloadedActivities,
    };
  }, [rows, selectedTaskId]);

  const fyOptions = useMemo(() => {
    const min = fyRange?.min_fy;
    const max = fyRange?.max_fy;
    if (min == null || max == null || min > max) return [];
    return Array.from({ length: max - min + 1 }, (_, idx) => min + idx);
  }, [fyRange]);

  const filteredRows = useMemo(() => {
    const baseRows = !clientSearch.trim()
      ? rows
      : rows.filter((r) => (r.client ?? "").toLowerCase().includes(clientSearch.toLowerCase()));

    return [...baseRows].sort((a, b) => {
      const incentiveA = (a.task_ws ?? "").toLowerCase();
      const incentiveB = (b.task_ws ?? "").toLowerCase();
      return incentiveA.localeCompare(incentiveB);
    });
  }, [rows, clientSearch]);

  const summaryByVisibleRows = useMemo(() => {
    const potentialRows = filteredRows.filter((row) => row.is_potential);
    const lostRows = potentialRows.filter((row) => row.is_lost);
    const atRiskRows = potentialRows.filter((row) => row.is_at_risk);
    const pipelineRows = potentialRows.filter((row) => row.is_pipeline);

    return {
      total_tasks: filteredRows.length,
      with_project_count: filteredRows.filter((row) => {
        const value = (row.project ?? "").trim().toLowerCase();
        return value !== "" && value !== "no";
      }).length,
      potential_count: potentialRows.length,
      potential_value_usd: potentialRows.reduce((sum, row) => sum + (Number(row.total_amount_usd) || 0), 0),
      claim_approved_amount_usd: potentialRows.reduce((sum, row) => sum + (Number(row.claim_approved_amount_usd) || 0), 0),
      paid_amount_usd: potentialRows.reduce((sum, row) => sum + (Number(row.payment_approved_amount_usd) || 0), 0),
      lost_amount_usd: lostRows.reduce((sum, row) => sum + (Number(row.total_amount_usd) || Number(row.lost_amount_usd) || 0), 0),
      at_risk_amount_usd: atRiskRows.reduce((sum, row) => sum + (Number(row.total_amount_usd) || 0), 0),
      pipeline_amount_usd: pipelineRows.reduce((sum, row) => sum + (Number(row.remaining_balance_usd) || Number(row.total_amount_usd) || 0), 0),
    };
  }, [filteredRows]);

  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );

  const displaySummary = summary ?? summaryByVisibleRows;

  const potentialBaseValue = Number(displaySummary?.potential_value_usd) || 0;
  const potentialBaseCount = Number(displaySummary?.potential_count) || 0;

  const claimApprovedSub = fmtRatio(
    Number(displaySummary?.claim_approved_amount_usd) || 0,
    potentialBaseValue
  );
  const paidSub = fmtRatio(
    Number(displaySummary?.paid_amount_usd) || 0,
    potentialBaseValue
  );
  const lostSub = fmtRatio(
    Number(displaySummary?.lost_amount_usd) || 0,
    potentialBaseValue
  );
  const atRiskCount = filteredRows.filter((row) => row.is_at_risk).length;
  const atRiskSub =
    potentialBaseCount > 0
      ? `${atRiskCount} at risk task${atRiskCount === 1 ? "" : "s"}`
      : `${atRiskCount} task${atRiskCount === 1 ? "" : "s"}`;

  const tipoSummaryRows = useMemo(() => aggregateTipoSummary(filteredRows), [filteredRows]);
  const pipelineOptInRows = useMemo(() => aggregatePipelineOptIn(filteredRows), [filteredRows]);

  const allocatedInProgressRows = useMemo(
    () =>
      tipoSummaryRows.filter(
        (row) => row.statusBucket === "Em andamento" && row.hasAllocatedTeam
      ),
    [tipoSummaryRows]
  );

  const tipoColorMap: Record<string, string> = {
    "Project|A iniciar": "#0EA5E9",
    "Project|Em andamento": "#22C55E",
    "Project|Definir alocação": "#F59E0B",
    "Adoption|A iniciar": "#2563EB",
    "Adoption|Em andamento": "#86EFAC",
    "Adoption|Definir alocação": "#FECACA",
  };

  const pieLabels = tipoSummaryRows.map((row) => `${row.tipo} ${row.statusBucket}`);
  const pieColors = tipoSummaryRows.map((row) => tipoColorMap[`${row.tipo}|${row.statusBucket}`] ?? "#94A3B8");
  const pieInsideLabels = tipoSummaryRows.map((row) => `${row.tipo}<br>${row.statusBucket}`);

  const usdPieValues = tipoSummaryRows.map((row) => row.usd);
  const countPieValues = tipoSummaryRows.map((row) => row.count);
  const usdPieText = tipoSummaryRows.map(
    (row) => `${row.tipo}<br>${row.statusBucket}<br>${fmtUSD(row.usd)}`
  );
  const countPieText = tipoSummaryRows.map(
    (row) => `${row.tipo}<br>${row.statusBucket}<br>${row.count}`
  );

  const plotLayoutBase = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: isDark ? "#E5E7EB" : "#374151" },
    margin: { t: 32, b: 24, l: 24, r: 24 },
  };

  const pieLegendFontColor = isDark ? "#FFFFFF" : "#000000";
  const pieInsideTextColor = "#000000";

  const handleApply = () => {
    const f: CpiAdoptFilters = {};
    if (clientSearch.trim()) f.client = clientSearch.trim();
    if (taskIdSearch.trim()) f.task_id = taskIdSearch.trim();
    if (taskWsSearch.trim()) f.task_ws = taskWsSearch.trim();
    if (dealIdSearch.trim()) f.deal_id = dealIdSearch.trim();
    if (solution.length) f.solution = solution;
    if (taskStatus.length) f.task_status = taskStatus;
    if (optIn.length) f.opt_in = optIn;
    if (project.length) f.project = project;
    if (timelineStage.length) f.timeline_stage = timelineStage;
    if (fyStart) f.fy_start = Number(fyStart);
    if (fyEnd) f.fy_end = Number(fyEnd);
    setAppliedFilters(f);
    setExpandedTaskIds([]);
    setPage(1);
  };

  const handleClear = () => {
    setSolution([]);
    setTaskStatus([]);
    setOptIn([]);
    setProject([]);
    setTimelineStage([]);
    setClientSearch("");
    setTaskIdSearch("");
    setTaskWsSearch("");
    setDealIdSearch("");
    setFyStart("");
    setFyEnd("");
    setAppliedFilters({});
    setExpandedTaskIds([]);
    setPage(1);
  };

  const toggleTask = (taskId: number | null) => {
    if (taskId == null) return;
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { parentRows, stageRows } = buildExportRows(filteredRows);
      exportToXlsxMultiSheet(
        [
          { sheetName: "CPI Adopt Tasks", rows: parentRows as Record<string, unknown>[], columns: Object.keys(parentRows[0] ?? {}).map((key) => ({ key, label: key })) },
          { sheetName: "CPI Adopt Stages", rows: stageRows as Record<string, unknown>[], columns: Object.keys(stageRows[0] ?? {}).map((key) => ({ key, label: key })) },
        ],
        "cpi_adopt_report"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = reportQuery.isLoading || summaryQuery.isLoading || filtersQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CPI Adopt</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Cisco Partner Incentive — executive funnel view with parent tasks and child activities
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || !filteredRows.length}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Download size={13} />
          {isExporting ? "Exporting…" : "Export Excel"}
        </button>
      </div>

      {displaySummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KPICard
            label="Potential"
            value={fmtUSD(displaySummary.potential_value_usd)}
            sub={`${displaySummary.potential_count} potential tasks`}
            accent="blue"
            icon={<Layers size={16} />}
            help="Potential considera tasks classificadas no funil CPI Adopt após deduplicação por customer + solution. Se existir Opt In/Opt Out, essas tasks prevalecem; se houver apenas Pending, é escolhida a task pendente de menor valor no grupo."
          />
          <KPICard
            label="Claim Approved"
            value={fmtUSD(displaySummary.claim_approved_amount_usd)}
            accent="green"
            icon={<CheckCircle size={16} />}
            sub={claimApprovedSub}
            help="Claim Approved soma o valor de claim aprovado das tasks classificadas como Potential."
          />
          <KPICard
            label="Paid"
            value={fmtUSD(displaySummary.paid_amount_usd)}
            accent="green"
            icon={<DollarSign size={16} />}
            sub={paidSub}
            help="Paid soma o valor de payment approved das tasks classificadas como Potential."
          />
          <KPICard
            label="Lost"
            value={fmtUSD(displaySummary.lost_amount_usd)}
            accent="red"
            icon={<TrendingDown size={16} />}
            sub={lostSub}
            help="Lost considera tasks Potential que entraram em perda por Opt Out válido, task pending expirada sem child activities, child activities expiradas em aberto ou cenário em que todas as child activities foram canceladas/expired."
          />
          <KPICard
            label="At Risk"
            value={fmtUSD(displaySummary.at_risk_amount_usd)}
            accent="yellow"
            icon={<AlertTriangle size={16} />}
            sub={atRiskSub}
            help="At Risk considera tasks Potential que não estão Lost nem Paid e já consumiram 75% ou mais da timeline sem progresso compatível. Para tasks com child activities, compara timeline x progress; para pending sem child activity, usa a proximidade do vencimento."
          />
          <KPICard
            label="Pipeline"
            value={fmtUSD(displaySummary.pipeline_amount_usd)}
            sub={`${displaySummary.total_tasks} visible tasks`}
            accent="purple"
            icon={<GitBranch size={16} />}
            help="Pipeline considera tasks Potential que permanecem ativas no funil e não foram classificadas como Lost, At Risk ou Paid. O valor usa remaining balance quando disponível; caso contrário, usa o total da task."
          />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Refine the CPI Adopt report using text, FY and multiselect filters
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Filter size={14} />
            {showFilters ? "Hide filters" : "Show filters"}
            <ChevronDown
              size={14}
              className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {showFilters && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Client</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search client…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Task ID</label>
                <input
                  type="text"
                  value={taskIdSearch}
                  onChange={(e) => setTaskIdSearch(e.target.value)}
                  placeholder="Search task id…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Task WS</label>
                <input
                  type="text"
                  value={taskWsSearch}
                  onChange={(e) => setTaskWsSearch(e.target.value)}
                  placeholder="Search task ws…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Deal ID</label>
                <input
                  type="text"
                  value={dealIdSearch}
                  onChange={(e) => setDealIdSearch(e.target.value)}
                  placeholder="Search deal id…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Tasks Ending From FY</label>
                <select
                  value={fyStart}
                  onChange={(e) => setFyStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="">All</option>
                  {fyOptions.map((fy) => (
                    <option key={`fy-start-${fy}`} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Tasks Ending Until FY</label>
                <select
                  value={fyEnd}
                  onChange={(e) => setFyEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="">All</option>
                  {fyOptions.map((fy) => (
                    <option key={`fy-end-${fy}`} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
              </div>

              <MultiSelect
                label="Solution"
                options={filterOptions?.solutions ?? []}
                selected={solution}
                onToggle={(value) => setSolution((prev) => toggleSelection(prev, value))}
                onClear={() => setSolution([])}
                searchable
                searchPlaceholder="Type solution name…"
              />

              <MultiSelect
                label="Status"
                options={filterOptions?.statuses ?? []}
                selected={taskStatus}
                onToggle={(value) => setTaskStatus((prev) => toggleSelection(prev, value))}
                onClear={() => setTaskStatus([])}
              />

              <MultiSelect
                label="Opt In Status"
                options={filterOptions?.opt_in_statuses ?? []}
                selected={optIn}
                onToggle={(value) => setOptIn((prev) => toggleSelection(prev, value))}
                onClear={() => setOptIn([])}
              />

              <MultiSelect
                label="Project"
                options={filterOptions?.projects ?? []}
                selected={project}
                onToggle={(value) => setProject((prev) => toggleSelection(prev, value))}
                onClear={() => setProject([])}
              />

              <MultiSelect
                label="Timeline"
                options={TIMELINE_STAGE_OPTIONS}
                selected={timelineStage}
                onToggle={(value) => setTimelineStage((prev) => toggleSelection(prev, value))}
                onClear={() => setTimelineStage([])}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("base")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "base"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <List size={14} />
          Parent Tasks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tipo")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "tipo"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <BarChart3 size={14} />
          Type x USD / Incentives
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "pipeline"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <BarChart3 size={14} />
          Pipeline / Opt-In
        </button>
      </div>

      {activeTab === "tipo" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Total - USD
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Sum of Valor Restante by Tipo and status bucket
                </p>
              </div>
              {tipoSummaryRows.length === 0 ? (
                <p className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">No chart data found.</p>
              ) : (
                <Plot
                  data={[
                    {
                      type: "pie",
                      labels: pieLabels,
                      values: usdPieValues,
                      hole: 0.45,
                      marker: { colors: pieColors },
                      textinfo: "text",
                      textposition: "inside",
                      texttemplate: "%{text}<br>%{percent}",
                      text: usdPieText,
                      insidetextorientation: "radial",
                      textfont: { size: 11, color: pieInsideTextColor },
                      hovertemplate: "%{label}<br>USD: %{value:$,.2f}<br>%{percent}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...plotLayoutBase,
                    height: 360,
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      x: 1.02,
                      y: 0.5,
                      font: { color: pieLegendFontColor, size: 12 },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Count of Incentive
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Count of tasks by Tipo and status bucket
                </p>
              </div>
              {tipoSummaryRows.length === 0 ? (
                <p className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">No chart data found.</p>
              ) : (
                <Plot
                  data={[
                    {
                      type: "pie",
                      labels: pieLabels,
                      values: countPieValues,
                      hole: 0.45,
                      marker: { colors: pieColors },
                      textinfo: "text",
                      textposition: "inside",
                      texttemplate: "%{text}<br>%{percent}",
                      text: countPieText,
                      insidetextorientation: "radial",
                      textfont: { size: 11, color: pieInsideTextColor },
                      hovertemplate: "%{label}<br>Count: %{value}<br>%{percent}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...plotLayoutBase,
                    height: 360,
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      x: 1.02,
                      y: 0.5,
                      font: { color: pieLegendFontColor, size: 12 },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Tipo x Incentivos — Summary Grid
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Consolidated view of Project vs Adoption by business status bucket
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
                {allocatedInProgressRows.length > 0
                  ? `Em andamento + time alocado: ${allocatedInProgressRows.reduce((sum, row) => sum + row.count, 0)} tasks • ${fmtUSD(
                      allocatedInProgressRows.reduce((sum, row) => sum + row.usd, 0)
                    )}`
                  : "Em andamento + time alocado: no matching tasks"}
              </div>
            </div>
            <TipoSummaryGrid rows={tipoSummaryRows} />
          </div>
        </div>
      ) : activeTab === "pipeline" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Pipeline / Opt-In by FY → Quarter → Month
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Consolidated view inspired by the Excel Pipeline_Optin tab showing FY NTT and FY Cisco, grouped by task start date
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
                FY NTT: Q1 Apr–Jun • Q2 Jul–Sep • Q3 Oct–Dec • Q4 Jan–Mar • FY Cisco: Q1 Aug–Oct • Q2 Nov–Jan • Q3 Feb–Apr • Q4 May–Jul
              </div>
            </div>
            <PipelineOptInGrid rows={pipelineOptInRows} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Pipeline / Opt-In Chart
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sum of Valor Restante by fiscal month, ordered by NTT fiscal year and quarter using task start date
              </p>
            </div>
            {pipelineOptInRows.length === 0 ? (
              <p className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">No chart data found.</p>
            ) : (
              <Plot
                data={[
                  {
                    type: "bar",
                    x: pipelineOptInRows.flatMap((quarter) =>
                      quarter.months.map(
                        (month) =>
                          `NTT FY${month.fyNtt} ${month.quarterNtt} • Cisco FY${month.fyCisco} ${month.quarterCisco} • ${month.month}`
                      )
                    ),
                    y: pipelineOptInRows.flatMap((quarter) => quarter.months.map((month) => month.usd)),
                    text: pipelineOptInRows.flatMap((quarter) =>
                      quarter.months.map((month) => fmtUSD(month.usd))
                    ),
                    textposition: "outside",
                    marker: {
                      color: pipelineOptInRows.flatMap((quarter) =>
                        quarter.months.map(() => {
                          if (quarter.quarterCisco === "Q1") return "#2563EB";
                          if (quarter.quarterCisco === "Q2") return "#0EA5E9";
                          if (quarter.quarterCisco === "Q3") return "#14B8A6";
                          return "#8B5CF6";
                        })
                      ),
                    },
                    hovertemplate:
                      "Period: %{x}<br>USD: %{y:$,.2f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...plotLayoutBase,
                  height: 420,
                  xaxis: {
                    tickangle: -45,
                    automargin: true,
                  },
                  yaxis: {
                    title: "USD",
                    automargin: true,
                  },
                  margin: { t: 32, b: 120, l: 56, r: 24 },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ displayModeBar: false, responsive: true }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              Results — {filteredRows.length} parent tasks
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">No data found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1560px] text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <th className="w-8 px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">#</th>
                      <th className="w-10 px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400" />
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Task ID</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Client</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Solution</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Use Case</th>
                      <th className="min-w-[110px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Incentive</th>
                      <th className="min-w-[96px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">DID</th>
                      <th className="min-w-[110px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Start</th>
                      <th className="min-w-[110px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">End</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Timeline</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Progress</th>
                      <th className="min-w-[96px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Potential</th>
                      <th className="min-w-[96px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">At Risk</th>
                      <th className="min-w-[96px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Pipeline</th>
                      <th className="min-w-[104px] px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Total</th>
                      <th className="min-w-[104px] px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Lost</th>
                      <th className="min-w-[104px] px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Claim Approved</th>
                      <th className="min-w-[104px] px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Paid</th>
                      <th className="min-w-[104px] px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Remaining</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Days Left</th>
                      <th className="min-w-[170px] px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status Justification</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Task Eligible</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Opt In Status</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Project</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Project OV</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Engineer</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">PM / CSM</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Latest Info</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Next Follow Up Info</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Latest Issue</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Latest Issue Status</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Next Follow Up Issue</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Latest Blocker</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Latest Blocker Status</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Next Follow Up Blocker</th>
                      <th className="sticky right-0 z-10 px-2 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, index) => {
                      const expanded = row.task_id != null && expandedTaskIds.includes(row.task_id);
                      const hasAnyExpandedRow = expandedTaskIds.length > 0;
                      const dimNonExpandedRow = hasAnyExpandedRow && !expanded;
                      const taskData = row as Record<string, unknown>;
                      const stages = Array.isArray(row.stages) ? row.stages : [];
                      const timelinePct = pickFirstNumber(taskData, ["time_elapsed_pct", "time_elapsed %", "time_elapsed"]);
                      const completedPct = pickFirstNumber(taskData, [
                        "task_completed",
                        "completed_pct",
                        "completion_pct",
                        "task_completed_pct",
                      ]);
                      const taskEligible = pickFirstString(taskData, ["task_eligible"]);
                      const optInStatus = pickFirstString(taskData, ["opt_in_status", "opt_in"]);
                      const normalizedOptInStatus = (optInStatus ?? "").trim().toLowerCase();
                      const normalizedTaskEligible = (taskEligible ?? "").trim().toLowerCase();
                      const isEligiblePendingAttention =
                        normalizedTaskEligible === "eligible" && normalizedOptInStatus === "pending";
                      const isOptOutReviewAttention =
                        normalizedTaskEligible === "eligible" &&
                        (normalizedOptInStatus === "opted out" || normalizedOptInStatus === "opt out");
                      const latestInfo = pickFirstString(taskData, ["lastest_info"]);
                      const nextFollowUpInfo = pickFirstString(taskData, ["next_follow_up_info"]);
                      const latestIssue = pickFirstString(taskData, ["lastest_issue"]);
                      const latestIssueStatus = pickFirstString(taskData, ["lastest_issue_status"]);
                      const nextFollowUpIssue = pickFirstString(taskData, ["next_follow_up_issue"]);
                      const latestBlocker = pickFirstString(taskData, ["lastest_blocker"]);
                      const latestBlockerStatus = pickFirstString(taskData, ["lastest_blocker_status"]);
                      const nextFollowUpBlocker = pickFirstString(taskData, ["next_follow_up_blocker"]);

                      return (
                        <Fragment key={`task-fragment-${row.task_id ?? index}`}>
                          <tr
                            key={`task-row-${row.task_id ?? index}`}
                            className={`cursor-pointer border-b border-gray-100 transition-all dark:border-gray-800 ${
                              expanded
                                ? "border-l-2 border-l-blue-500 bg-blue-50/90 opacity-100 ring-1 ring-inset ring-blue-300 dark:border-l-blue-400 dark:bg-blue-950/35 dark:ring-blue-700/60"
                                : dimNonExpandedRow
                                  ? "opacity-45 hover:bg-gray-50 hover:opacity-70 dark:hover:bg-gray-800 dark:hover:opacity-70"
                                  : "opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                            onClick={() => toggleTask(row.task_id)}
                          >
                            <td className="px-2 py-2 text-gray-400">{(page - 1) * pageSize + index + 1}</td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                                  expanded
                                    ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700/70 dark:bg-blue-900/40 dark:text-blue-300"
                                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                }`}
                              >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-semibold text-blue-700 dark:text-blue-300">{row.task_id ?? "—"}</td>
                            <td className="px-2 py-2 font-medium text-gray-700 dark:text-gray-300">
                              <TruncatedCell value={row.client} widthClass="max-w-[180px]" />
                            </td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                              <TruncatedCell value={row.solution} widthClass="max-w-[160px]" />
                            </td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-300">
                              <TruncatedCell value={row.use_case} widthClass="max-w-[180px]" />
                            </td>
                            <td className="min-w-[110px] px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.task_ws ?? "—"}</td>
                            <td className="min-w-[96px] px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.cr_party_id ?? "—"}</td>
                            <td className="min-w-[110px] px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(row.task_start, i18n.language)}</td>
                            <td className="min-w-[110px] px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(row.task_end, i18n.language)}</td>
                            <td className="px-2 py-2">
                              <ProgressBar
                                value={timelinePct ?? 0}
                                mode="timeline"
                                progressValue={completedPct ?? 0}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <ProgressBar value={completedPct ?? 0} />
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {row.is_potential ? (
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">Yes</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">No</span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {row.is_at_risk ? (
                                <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">Yes</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">No</span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {row.is_pipeline ? (
                                <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">Yes</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">No</span>
                              )}
                            </td>
                            <td className="min-w-[104px] px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtUSD(row.total_amount_usd)}</td>
                            <td className="min-w-[104px] px-2 py-2 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">{fmtUSD(row.lost_amount_usd)}</td>
                            <td className="min-w-[104px] px-2 py-2 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">{fmtUSD(row.claim_approved_amount_usd)}</td>
                            <td className="min-w-[104px] px-2 py-2 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">{fmtUSD(row.payment_approved_amount_usd)}</td>
                            <td className="min-w-[104px] px-2 py-2 text-right text-yellow-600 dark:text-yellow-400 whitespace-nowrap">{fmtUSD(row.remaining_balance_usd)}</td>
                            <td className={`px-2 py-2 text-right ${daysColor(row.days_remaining)}`}>
                              {row.days_remaining != null ? row.days_remaining : "—"}
                            </td>
                            <td className="min-w-[170px] px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.task_status ?? "—"}</td>
                            <td className="max-w-[220px] px-2 py-2 text-gray-600 dark:text-gray-400">
                              {pickFirstString(taskData, ["task_status_justification"]) ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                              {taskEligible ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              {optInStatusBadge(optInStatus ?? null, {
                                highlightAttention: isEligiblePendingAttention,
                                highlightOptOutReview: isOptOutReviewAttention,
                              })}
                            </td>
                            <td className="px-2 py-2">{projectBadge(row.project ?? null)}</td>
                            <td className="max-w-[140px] px-2 py-2 text-gray-500 dark:text-gray-400">{row.project_ov ?? "—"}</td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                              <TruncatedCell value={row.engineer} widthClass="max-w-[160px]" />
                            </td>
                            <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                              <TruncatedCell value={row.pm_csm} widthClass="max-w-[160px]" />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={latestInfo} />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={nextFollowUpInfo} />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={latestIssue} />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{latestIssueStatus ?? "—"}</td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={nextFollowUpIssue} />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={latestBlocker} />
                            </td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{latestBlockerStatus ?? "—"}</td>
                            <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                              <TruncatedCell value={nextFollowUpBlocker} />
                            </td>
                            <td className="sticky right-0 z-10 px-2 py-2 text-center bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (row.task_id != null && hasTaskPermission) {
                                    setSelectedActivityId(null);
                                    setSelectedTaskId(row.task_id);
                                  }
                                }}
                                disabled={!hasTaskPermission || row.task_id == null}
                                title={hasTaskPermission ? "Open Task Detail" : "No permission to open Task Detail"}
                                className="inline-flex items-center justify-center text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Pencil size={14} />
                              </button>
                            </td>
                          </tr>

                          {expanded && (
                            <tr key={`task-stage-${row.task_id ?? index}`} className="border-b border-gray-100 dark:border-gray-800">
                              <td colSpan={38} className="p-0">
                                <div className="border-l-4 border-blue-500 bg-blue-50/40 shadow-inner overflow-visible dark:bg-blue-950/10">
                                  <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3 dark:border-blue-900/40">
                                    <div>
                                      <p className="text-xs font-semibold tracking-wide text-blue-700 dark:text-blue-300">
                                        {`Child Activities — ${row.task_ws ?? "—"}`}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        {`Task ${row.task_id ?? "—"} · ${row.client ?? "Client not informed"}`}
                                      </p>
                                      {stages.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          0 activity
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <StageTable
                                    stages={stages}
                                    locale={i18n.language}
                                    canEdit={hasTaskPermission}
                                    onEditStage={(activityId) => {
                                      if (row.task_id != null && hasTaskPermission) {
                                        setSelectedActivityId(activityId);
                                        setSelectedTaskId(row.task_id);
                                      }
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredRows.length}
                  onPageChange={setPage}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {selectedTaskId != null && hasTaskPermission && selectedTaskForPanel && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setSelectedTaskId(null);
              setSelectedActivityId(null);
            }}
          />
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <div className="h-full w-full max-w-[1400px] overflow-y-auto border-l border-gray-200 bg-gray-50 p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-950 sm:w-[92vw] lg:w-[88vw]">
              <TaskDetailPanel
                tasks={[selectedTaskForPanel]}
                initialIndex={0}
                initialSelectedActivityId={selectedActivityId}
                onClose={() => {
                  setSelectedTaskId(null);
                  setSelectedActivityId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
