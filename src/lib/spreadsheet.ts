import * as XLSX from "xlsx";

/** Extensions accepted by the file uploads across all dashboards. */
export const SPREADSHEET_ACCEPT = ".csv,.xls,.xlsx";

const SPREADSHEET_EXTS = [".csv", ".xls", ".xlsx"];

/** True when the file name ends in one of the accepted spreadsheet extensions. */
export function hasSpreadsheetExt (name: string): boolean {
  const lower = name.toLowerCase();
  return SPREADSHEET_EXTS.some((ext) => lower.endsWith(ext));
}

/**
 * Normalizes any accepted upload into a form PapaParse can read directly:
 * - `.csv` → the original `File` (Papa streams it, unchanged behavior).
 * - `.xls` / `.xlsx` → the first worksheet converted to a CSV string via SheetJS.
 *
 * `sheet_to_csv` emits each cell's formatted text, so Brazilian dates stay as
 * `dd/MM/yyyy` and existing parsers work without changes.
 */
export async function toCsvParseInput (file: File): Promise<string | File> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) return file;

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error("A planilha não contém nenhuma aba de dados.");
  }
  return XLSX.utils.sheet_to_csv(sheet);
}
