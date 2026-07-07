import Papa from "papaparse";
import { parse as parseDate } from "date-fns";
import { toCsvParseInput } from "./spreadsheet";
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

function parseBrDate (dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const d = parseDate(dateStr.trim(), "dd/MM/yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* empty */ }
  try {
    const d = parseDate(dateStr.trim(), "dd/MM/yyyy", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* empty */ }
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

        const rows: BoletimRow[] = (results.data as Record<string, string>[])
          .map((row): BoletimRow | null => {
            const createdAt = parseBrDate(row[createdCol] || "");
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
