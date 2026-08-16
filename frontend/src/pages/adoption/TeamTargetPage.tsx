/**
 * TeamTargetPage — Adoption: Team Target
 * Migração completa do Streamlit report_team_target.py para React.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import Plot from "react-plotly.js";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";

// ─── Types ───────────────────────────────────────────────
interface TargetItem {
  id: number; fy: number; name: string; description: string;
  tasks_list: string; task_names: string[];
  users_list: string; user_ids: number[]; user_names: string[];
  measure_by_counting: number; measure_by_sum: number;
  points: number; multiplier: number; value: number; individual: number;
}
interface MeasureRow {
  target_id?: number; target_value?: number; target_individual?: number;
  target_measurement_by_sum?: number; target_measurement_by_counting?: number;
  task_owner_id?: number; task_owner_name?: string;
  activity_approved_value?: number; target_point?: number; target_multiplier?: number;
  [key: string]: unknown;
}
type MeasureMethod = "sum" | "counting";

// ─── Helpers ─────────────────────────────────────────────
function formatK(n: number): string {
  if (n == null || isNaN(n)) return "";
  if (n >= 1000) { const s = (n / 1000).toFixed(1); return s.endsWith(".0") ? `${Math.floor(n / 1000)}k` : `${s}k`; }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
function mkLayout(isDark: boolean, height: number, margin: { l: number; r: number; t: number; b: number }) {
  const bg = isDark ? "#111827" : "white";
  const grid = isDark ? "#374151" : "#e5e7eb";
  return { paper_bgcolor: bg, plot_bgcolor: bg, font: { color: isDark ? "#d1d5db" : "#374151", size: 11 }, margin, height, xaxis: { gridcolor: grid }, yaxis: { gridcolor: grid } };
}
const selectCls = "text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500";
const cardCls = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4";

// ─── FieldRow ─────────────────────────────────────────────
function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="w-32 flex-shrink-0 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="flex-1 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{value}</span>
    </div>
  );
}

// ─── TargetDetailPanel ────────────────────────────────────
function TargetDetailPanel({ target, isManager }: { target: TargetItem; isManager: boolean }) {
  const { t } = useTranslation();
  const measureLabel = target.measure_by_counting !== 0
    ? t("adoption.teamTarget.byCounting")
    : t("adoption.teamTarget.bySum");
  const taskText = target.task_names.length > 0 ? target.task_names.map(n => `- ${n}`).join("\n") : "—";
  return (
    <div className={cardCls}>
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
        {t("adoption.teamTarget.detailsTitle")}
      </p>
      <FieldRow label={t("adoption.teamTarget.target")} value={target.name} />
      <FieldRow label={t("common.description")} value={target.description || "—"} />
      <FieldRow label={t("adoption.teamTarget.taskTypes")} value={taskText} />
      <FieldRow label={t("adoption.teamTarget.measurement")} value={measureLabel} />
      <FieldRow label={t("adoption.teamTarget.value")} value={formatK(target.value)} />
      <FieldRow label={t("adoption.teamTarget.individual")} value={target.individual !== 0 ? t("common.yes") : t("common.no")} />
      <FieldRow label={t("adoption.teamTarget.weightPts")} value={String(target.points)} />
      {isManager && target.user_names.length > 0 && (
        <FieldRow label={t("adoption.teamTarget.employees")} value={target.user_names.map(u => `- ${u}`).join("\n")} />
      )}
    </div>
  );
}

// ─── GroupTargetChart (individual === 0) ──────────────────
function GroupTargetChart({ measureRows, totalTarget, method, isManager, userId, isDark, t }: {
  measureRows: MeasureRow[]; totalTarget: number; method: MeasureMethod;
  isManager: boolean; userId: number; isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const achieved = method === "sum"
    ? measureRows.reduce((s, r) => s + (Number(r.activity_approved_value) || 0), 0)
    : measureRows.filter(r => r.task_owner_id != null).length;
  const pct = totalTarget > 0 ? ((achieved / totalTarget) * 100).toFixed(2) : "0.00";

  const filteredRows = isManager ? measureRows : measureRows.filter(r => r.task_owner_id === userId);
  const ownerMap: Record<string, number> = {};
  filteredRows.forEach(r => {
    const name = String(r.task_owner_name ?? "Unknown");
    if (ownerMap[name] == null) ownerMap[name] = 0;
    if (method === "sum") { ownerMap[name] += Number(r.activity_approved_value) || 0; }
    else if (r.task_owner_id != null) { ownerMap[name] += 1; }
  });
  const owners = Object.entries(ownerMap)
    .map(([name, val]) => ({ name, val, pct: totalTarget > 0 ? (val / totalTarget) * 100 : 0 }))
    .sort((a, b) => b.val - a.val);
  const ownerText = owners.map(o => `${formatK(o.val)} (${o.pct.toFixed(2).replace(/\.00$/, "")}%)`);
  const ownerH = Math.max(220, owners.length * 34 + 60);

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t("adoption.teamTarget.targetProgress")}</p>
        <Plot
          data={[{ type: "bar", orientation: "h",
            y: [`Target ($)`, `Achieved ($) (${pct}%)`],
            x: [totalTarget, achieved],
            marker: { color: ["#A0D8B4", "#5CB85C"] },
            text: [formatK(totalTarget), formatK(achieved)],
            textposition: "outside", cliponaxis: false,
            hovertemplate: "%{y}: %{x:,.2f}<extra></extra>",
          }]}
          layout={mkLayout(isDark, 180, { l: 220, r: 80, t: 16, b: 24 })}
          useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
        />
      </div>
      {owners.length > 0 ? (
        <div className={cardCls}>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t("adoption.teamTarget.individualAppraisal")}</p>
          <Plot
            data={[{ type: "bar", orientation: "h",
              y: owners.map(o => o.name), x: owners.map(o => o.val),
              marker: { color: "#5CB85C" },
              text: ownerText, textposition: "inside", insidetextanchor: "end",
              textfont: { color: "black", size: 10 },
              hovertemplate: "%{y}: %{x:,.2f}<extra></extra>",
            }]}
            layout={{ ...mkLayout(isDark, ownerH, { l: 160, r: 110, t: 16, b: 24 }), yaxis: { autorange: "reversed", gridcolor: isDark ? "#374151" : "#e5e7eb" } }}
            useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
          />
        </div>
      ) : (
        <div className={`${cardCls} text-center text-xs text-gray-400`}>{t("adoption.teamTarget.noIndividualProgress")}</div>
      )}
    </div>
  );
}

// ─── IndividualTargetChart (individual !== 0) ─────────────
function IndividualTargetChart({ measureRows, totalTarget, method, isManager, userId, isDark, t }: {
  measureRows: MeasureRow[]; totalTarget: number; method: MeasureMethod;
  isManager: boolean; userId: number; isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const filtered = isManager ? measureRows : measureRows.filter(r => r.task_owner_id === userId);
  const hasData = filtered.some(r => r.task_owner_id != null);
  const ownerMap: Record<string, { achieved: number; point: number; multiplier: number }> = {};
  filtered.forEach(r => {
    const name = String(r.task_owner_name ?? "Unknown");
    if (!ownerMap[name]) ownerMap[name] = { achieved: 0, point: Number(r.target_point) || 0, multiplier: Number(r.target_multiplier) || 0 };
    if (method === "sum") { ownerMap[name].achieved += Number(r.activity_approved_value) || 0; }
    else if (r.task_owner_id != null) { ownerMap[name].achieved += 1; }
  });
  const entries = Object.entries(ownerMap).map(([name, d]) => {
    let evaluation = 0;
    if (hasData) {
      const gte = d.achieved >= totalTarget;
      if (method === "sum") { evaluation = gte ? d.point : 0; }
      else { evaluation = gte ? (d.multiplier !== 0 ? d.achieved * d.point : d.point) : 0; }
    }
    return { name, achieved: d.achieved, evaluation };
  });

  const labels = ["TARGET ($)", ...entries.map(e => e.name)];
  const values = [totalTarget, ...entries.map(e => e.achieved)];
  const colors = ["red", ...entries.map(() => "lightgreen")];
  const texts = [`${totalTarget.toFixed(2)} (0 pt)`, ...entries.map(e => `${e.achieved.toFixed(2)} (${e.evaluation.toFixed(0)} pt)`)];
  const chartH = Math.max(260, labels.length * 36 + 60);

  return (
    <div className={cardCls}>
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t("adoption.teamTarget.individualAppraisal")}</p>
      <Plot
        data={[{ type: "bar", orientation: "h",
          y: labels, x: values,
          marker: { color: colors },
          text: texts, textposition: "outside", cliponaxis: false,
          textfont: { color: isDark ? "#9ca3af" : "#4b5563", size: 10 },
          hovertemplate: "%{y}: %{x:,.2f}<extra></extra>",
        }]}
        layout={{ ...mkLayout(isDark, chartH, { l: 160, r: 120, t: 16, b: 24 }), yaxis: { autorange: "reversed", gridcolor: isDark ? "#374151" : "#e5e7eb" } }}
        useResizeHandler style={{ width: "100%" }} config={{ displayModeBar: false }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function TeamTargetPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;
  // isManager: ADMIN always; otherwise determined by role name
  // (mirrors Streamlit: permission "full"/"manage" → manager; "view" → employee view)
  const isManager: boolean = (() => {
    if (isAdmin) return true;
    const role = (user?.role ?? "").toUpperCase();
    return role.includes("ADMIN") || role.includes("MANAGER") || role.includes("FULL");
  })();

  const userId = user?.id ?? 0;
  const isDark = document.documentElement.classList.contains("dark");
  const currentYear = new Date().getFullYear();

  const [selectedFY, setSelectedFY] = useState<number>(currentYear);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(0);

  // --- Queries ---
  const fyQ = useQuery({
    queryKey: ["team-target-fy"],
    queryFn: () => apiClient.get<number[]>("/adoption/team-target/fiscal-years").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const targetsQ = useQuery({
    queryKey: ["team-target-targets", selectedFY],
    queryFn: () => apiClient.get<TargetItem[]>(`/adoption/team-target/targets?fy=${selectedFY}`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedFY,
  });

  const measureQ = useQuery({
    queryKey: ["team-target-measure", selectedTargetId],
    queryFn: () => apiClient.get<MeasureRow[]>(`/adoption/team-target/${selectedTargetId}/measure`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: selectedTargetId > 0,
  });

  const fyList = fyQ.data ?? [];

  // Auto-sync selectedFY: when the API returns a list that doesn't include
  // the current default (e.g. currentYear=2026 but DB only has 2025),
  // select the most recent available FY.
  useEffect(() => {
    if (fyList.length > 0 && !fyList.includes(selectedFY)) {
      setSelectedFY(fyList[fyList.length - 1]);
      setSelectedTargetId(0);
    }
  }, [fyList]);

  const allTargets = targetsQ.data ?? [];

  // Filter targets by user_id when not manager
  const visibleTargets = isManager
    ? allTargets
    : allTargets.filter(t => t.user_ids.includes(userId));

  const selectedTarget = visibleTargets.find(t => t.id === selectedTargetId) ?? null;
  const measureRows = measureQ.data ?? [];

  // Resolve measure method from DB rows (authoritative source)
  const measureMethod: MeasureMethod | null =
    measureRows.length > 0
      ? (Number(measureRows[0].target_measurement_by_sum) !== 0 ? "sum" : "counting")
      : selectedTarget
        ? (selectedTarget.measure_by_counting !== 0 ? "counting" : "sum")
        : null;

  const totalTargetValue = measureRows.length > 0
    ? Number(measureRows[0].target_value) || 0
    : selectedTarget?.value ?? 0;

  const isIndividual = measureRows.length > 0
    ? Number(measureRows[0].target_individual) !== 0
    : (selectedTarget?.individual ?? 0) !== 0;

  const refetchAll = () => {
    void targetsQ.refetch();
    void measureQ.refetch();
  };

  // When FY changes, reset selected target
  const handleFYChange = (fy: number) => {
    setSelectedFY(fy);
    setSelectedTargetId(0);
  };

  const spinner = <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("adoption.teamTarget.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("adoption.teamTarget.subtitle")}</p>
        </div>
        <button
          onClick={refetchAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={13} /> {t("common.refresh")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* FY Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("adoption.teamTarget.fiscalYear")}
            </label>
            {fyQ.isLoading ? (
              <div className="flex items-center gap-2">{spinner}</div>
            ) : (
              <select
                value={selectedFY}
                onChange={e => handleFYChange(Number(e.target.value))}
                className={selectCls}
              >
                {fyList.length === 0 && (
                  <option value={currentYear}>{currentYear}</option>
                )}
                {fyList.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            )}
          </div>

          {/* Target Select */}
          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("adoption.teamTarget.target")}
            </label>
            {targetsQ.isLoading ? (
              <div className="flex items-center gap-2">{spinner}</div>
            ) : (
              <select
                value={selectedTargetId}
                onChange={e => setSelectedTargetId(Number(e.target.value))}
                className={selectCls}
                disabled={visibleTargets.length === 0}
              >
                <option value={0}>{t("adoption.teamTarget.selectTargetPlaceholder")}</option>
                {visibleTargets.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {visibleTargets.length === 0 && !targetsQ.isLoading && (
          <p className="mt-2 text-xs text-gray-400">{t("adoption.teamTarget.noTargetsFound", { fy: selectedFY })}</p>
        )}
      </div>

      {/* Content: detail + chart */}
      {selectedTarget && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left: detail */}
          <TargetDetailPanel target={selectedTarget} isManager={isManager} />

          {/* Right: chart */}
          <div>
            {measureQ.isLoading ? (
              <div className={`${cardCls} flex justify-center py-12`}>{spinner}</div>
            ) : measureRows.length === 0 ? (
              <div className={`${cardCls} text-center text-xs text-gray-400 py-8`}>
                {t("adoption.teamTarget.noMeasureData")}
              </div>
            ) : measureMethod ? (
              isIndividual ? (
                <IndividualTargetChart
                  measureRows={measureRows}
                  totalTarget={totalTargetValue}
                  method={measureMethod}
                  isManager={isManager}
                  userId={userId}
                  isDark={isDark}
                  t={t}
                />
              ) : (
                <GroupTargetChart
                  measureRows={measureRows}
                  totalTarget={totalTargetValue}
                  method={measureMethod}
                  isManager={isManager}
                  userId={userId}
                  isDark={isDark}
                  t={t}
                />
              )
            ) : (
              <div className={`${cardCls} text-center text-xs text-gray-400 py-8`}>
                {t("adoption.teamTarget.methodNotDetermined")}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedTarget && !targetsQ.isLoading && visibleTargets.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
          {t("adoption.teamTarget.selectTargetHint")}
        </div>
      )}
    </div>
  );
}
