import * as XLSX from "xlsx";

/**
 * Exports an array of row objects to an .xlsx file using the given column
 * definitions (key -> label). Numeric-looking values are preserved as numbers.
 */
export function exportToXlsx(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  fileName: string,
  sheetName = "Sheet1"
) {
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      out[col.label] = row[col.key] ?? "";
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}
