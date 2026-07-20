import Papa from "papaparse";
import { parse as parseDate } from "date-fns";
import { toCsvParseInput, excelSerialToDate } from "./spreadsheet";
import type { BoletimRow } from "@/types/boletim";

// Interações that represent "no formalized process flow" → grouped as "Outros"
// (see the footnote in the report reference).
const OUTROS_LABEL = "Outros";
const OUTROS_PATTERNS = [/sem intera[çc][ãa]o/i, /uso nqsp/i];

// Find a column by normalized name (case-insensitive, trimmed).
function findColumnByName (headers: string[], targetName: string): string | undefined {
  const normalized = targetName.trim().toLowerCase();
  return headers.find((h) => h.trim().toLowerCase() === normalized);
}

// Formats that are unambiguous regardless of day/month order.
const ISO_FORMATS = [
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
];
// Slash-separated formats, one list per day/month order. The original Interact
// export is `dd/MM/yyyy [HH:mm:ss]`, but a spreadsheet round-trip (Excel /
// LibreOffice / Sheets) can rewrite the "Criado em" column as text in the
// machine's locale — e.g. US `M/d/yy` (`6/30/26`). Which list applies is
// decided per-column by `detectDayFirst`, not per value, so ambiguous rows
// like `1/2/26` stay consistent with the rest of the column.
const DAY_FIRST_FORMATS = [
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd/MM/yy",
  "d/M/yy",
];
const MONTH_FIRST_FORMATS = [
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM/dd/yy",
  "M/d/yy",
];

/**
 * Infers whether a column of slash-dates is day-first (BR, default) or
 * month-first (US). Votes come only from unambiguous rows: a first field > 12
 * must be the day (day-first); a second field > 12 must be the day
 * (month-first). Ties and all-ambiguous columns default to day-first.
 */
export function detectDayFirst (values: string[]): boolean {
  let dayFirstVotes = 0;
  let monthFirstVotes = 0;
  for (const value of values) {
    const m = /^(\d{1,2})\/(\d{1,2})\//.exec((value || "").trim());
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirstVotes++;
    else if (b > 12 && a <= 12) monthFirstVotes++;
  }
  return monthFirstVotes > dayFirstVotes ? false : true;
}

export function parseBrDate (dateStr: string, dayFirst = true): Date | null {
  const trimmed = (dateStr || "").trim();
  if (!trimmed) return null;

  const formats = [
    ...ISO_FORMATS,
    ...(dayFirst ? DAY_FIRST_FORMATS : MONTH_FIRST_FORMATS),
  ];
  for (const fmt of formats) {
    try {
      const d = parseDate(trimmed, fmt, new Date());
      // Guard against a 4-digit-year format greedily matching a 2-digit year
      // (e.g. "01/06/26" under "dd/MM/yyyy" → year 26); let a later format win.
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900) return d;
    } catch { /* empty */ }
  }

  // Bare Excel date serial (e.g. "46174" or "46174.6") as a last resort.
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return excelSerialToDate(Number(trimmed));
  }

  return null;
}

function normalizeInteracao (value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return OUTROS_LABEL;
  if (OUTROS_PATTERNS.some((re) => re.test(trimmed))) return OUTROS_LABEL;
  return trimmed;
}

export async function parseBoletimCSV (
  file: File
): Promise<{ rows: BoletimRow[] }> {
  const input = await toCsvParseInput(file);
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete (results: Papa.ParseResult<Record<string, string>>) {
        const headers = results.meta.fields || [];

        const createdCol = findColumnByName(headers, "Criado em");
        const notificadoCol = findColumnByName(headers, "Setor notificado");
        const notificanteCol = findColumnByName(headers, "Setor notificante");
        const interacaoCol = findColumnByName(headers, "Interação de Processo");
        const tituloCol = findColumnByName(headers, "Título");

        if (!createdCol || !notificadoCol || !notificanteCol || !interacaoCol) {
          reject(
            new Error(
              "Colunas esperadas não encontradas. Verifique se o CSV é a exportação OccurrenceList do Interact (colunas: Criado em, Setor notificado, Setor notificante, Interação de Processo)."
            )
          );
          return;
        }

        const data = results.data as Record<string, string>[];
        // Decide the column's date order once from all rows, then parse each
        // value with it — so a US-locale round-trip (M/d/yy) is read correctly
        // instead of silently dropping every row whose day > 12.
        const dayFirst = detectDayFirst(data.map((r) => r[createdCol] || ""));

        const rows: BoletimRow[] = data
          .map((row): BoletimRow | null => {
            const createdAt = parseBrDate(row[createdCol] || "", dayFirst);
            if (!createdAt) return null;
            return {
              createdAt,
              setorNotificado: (row[notificadoCol] || "").trim(),
              setorNotificante: (row[notificanteCol] || "").trim(),
              interacao: normalizeInteracao(row[interacaoCol]),
              titulo: (tituloCol ? row[tituloCol] || "" : "").trim(),
            };
          })
          .filter((r): r is BoletimRow => r !== null);

        if (rows.length === 0) {
          reject(
            new Error("A planilha não contém dados válidos. Verifique o arquivo e tente novamente.")
          );
          return;
        }

        resolve({ rows });
      },
      error (err) {
        reject(err);
      },
    });
  });
}
