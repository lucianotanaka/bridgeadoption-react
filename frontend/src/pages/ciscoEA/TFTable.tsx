/**
 * TFTable — paginated data table for True Forward report.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import type { Col } from "./TFHelpers";

export type { Col };

export function Tbl({ rows, cols, title, onExport }: {
  rows: Record<string, unknown>[];
  cols: Col[];
  title?: string;
  onExport?: () => void;
}) {
  const { t } = useTranslation();
  const [pg, setPg] = useState(1);
  const [ps, setPs] = useState(25);
  const tp = Math.max(1, Math.ceil(rows.length / ps));
  const paged = rows.slice((pg - 1) * ps, pg * ps);
  let ws = Math.max(1, pg - 2);
  const we = Math.min(tp, ws + 4);
  if (we - ws < 4) ws = Math.max(1, we - 4);
  const pages = Array.from({ length: we - ws + 1 }, (_, i) => ws + i);
  const bB = "flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg transition-colors";
  const bA = bB + " bg-blue-600 text-white";
  const bI = bB + " border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";
  const fr = rows.length === 0 ? 0 : (pg - 1) * ps + 1;
  const to = Math.min(pg * ps, rows.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        {title && <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title} ({rows.length})</p>}
        {onExport && (
          <button onClick={onExport} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg ml-auto">
            <Download size={13} /> Excel
          </button>
        )}
      </div>
      {rows.length === 0
        ? <p className="text-center text-xs text-gray-400 py-8">{t("common.noData")}</p>
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-2 text-gray-500 font-semibold w-8">#</th>
                    {cols.map(c => (
                      <th key={c.key} className={"py-2 px-2 text-gray-500 font-semibold whitespace-nowrap " + (c.right ? "text-right" : "text-left")}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-1.5 px-2 text-gray-400">{(pg - 1) * ps + i + 1}</td>
                      {cols.map(c => {
                        const v = row[c.key];
                        return (
                          <td key={c.key} className={"py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] overflow-hidden text-ellipsis " + (c.right ? "text-right" : "")}>
                            {c.render ? c.render(row) : c.fmt ? c.fmt(v) : v == null ? "–" : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {t("common.showing")} <b>{fr}</b>–<b>{to}</b> {t("common.of")} <b>{rows.length}</b>
                </span>
                <select value={ps} onChange={e => { setPs(Number(e.target.value)); setPg(1); }}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {[25, 50, 100, 200].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPg(1)} disabled={pg === 1} className={bI}>«</button>
                <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={pg === 1} className={bI}>‹</button>
                {ws > 1 && <span className="text-xs text-gray-400 px-1">…</span>}
                {pages.map(p => <button key={p} onClick={() => setPg(p)} className={p === pg ? bA : bI}>{p}</button>)}
                {we < tp && <span className="text-xs text-gray-400 px-1">…</span>}
                <button onClick={() => setPg(p => Math.min(tp, p + 1))} disabled={pg >= tp} className={bI}>›</button>
                <button onClick={() => setPg(tp)} disabled={pg >= tp} className={bI}>»</button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

export function xlsxExport(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  // Dynamic import to avoid direct xlsx dependency at module level
  import("xlsx").then(XLSX => {
    const wb = XLSX.utils.book_new();
    for (const { name, rows } of sheets) {
      if (rows.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    }
    XLSX.writeFile(wb, filename);
  });
}
