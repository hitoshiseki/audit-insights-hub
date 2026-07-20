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
 * Dates are parsed as real cells (`cellDates`) and re-serialized as
 * `dd/MM/yyyy HH:mm:ss` (`dateNF`), so a spreadsheet round-trip that rewrote
 * "Criado em" in a locale display format (`2026-06-01`, `6/1/2026`, serial…)
 * comes back in a format the BR date parser accepts.
 */
export async function toCsvParseInput (file: File): Promise<string | File> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) return file;

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error("A planilha não contém nenhuma aba de dados.");
  }
  return XLSX.utils.sheet_to_csv(sheet, { dateNF: "dd/MM/yyyy HH:mm:ss" });
}

/**
 * Converts an Excel date serial number (days since 1899-12-30) to a `Date`,
 * or `null` when the value isn't a valid serial. Used as a fallback when a
 * round-tripped sheet emits a bare serial instead of formatted text.
 */
export function excelSerialToDate (serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  const d = new Date(
    parsed.y,
    parsed.m - 1,
    parsed.d,
    parsed.H,
    parsed.M,
    parsed.S
  );
  return isNaN(d.getTime()) ? null : d;
}
