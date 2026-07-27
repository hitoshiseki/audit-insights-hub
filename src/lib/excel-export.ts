import * as XLSX from "xlsx";

export type CellValue = string | number;

export interface ExcelSheet {
  name: string;
  rows: Record<string, CellValue>[];
}

/** Limite do Excel para nome de aba. */
const MAX_SHEET_NAME = 31;

function safeSheetName (name: string, used: Set<string>): string {
  let base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, MAX_SHEET_NAME) || "Planilha";
  let candidate = base;
  let i = 2;
  while (used.has(candidate)) {
    const suffix = ` ${i++}`;
    base = base.slice(0, MAX_SHEET_NAME - suffix.length);
    candidate = base + suffix;
  }
  used.add(candidate);
  return candidate;
}

/** Larguras automáticas simples, para a planilha não sair com colunas espremidas. */
function columnWidths (rows: Record<string, CellValue>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return headers.map((header) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, String(row[header] ?? "").length),
      header.length
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 60) };
  });
}

export function exportWorkbook (sheets: ExcelSheet[], fileName: string): void {
  const book = XLSX.utils.book_new();
  const used = new Set<string>();

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ Registro: "Nenhum registro" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = columnWidths(rows);
    XLSX.utils.book_append_sheet(book, worksheet, safeSheetName(sheet.name, used));
  }

  XLSX.writeFile(book, fileName);
}
