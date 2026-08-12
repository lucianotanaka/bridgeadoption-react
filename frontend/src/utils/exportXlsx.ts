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

/**
 * Exports multiple sets of rows into a single .xlsx workbook, one sheet per
 * set. Useful for reports that need "Approved / Awaiting / In Progress / Lost"
 * (or similar) as separate tabs within the same file.
 */
export function exportToXlsxMultiSheet(
  sheets: {
    sheetName: string;
    rows: Record<string, unknown>[];
    columns: { key: string; label: string }[];
  }[],
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = sheet.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of sheet.columns) {
        out[col.label] = row[col.key] ?? "";
      }
      return out;
    });
    const worksheet = XLSX.utils.json_to_sheet(data, { header: sheet.columns.map((c) => c.label) });
    // Excel sheet names are limited to 31 characters and cannot contain some symbols.
    const safeName = sheet.sheetName.slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  const finalName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}
