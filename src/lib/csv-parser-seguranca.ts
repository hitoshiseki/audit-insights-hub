import Papa from "papaparse";
import { toCsvParseInput } from "./spreadsheet";
import { parseBrDate, detectDayFirst } from "./csv-parser-boletim";
import type { SegurancaRow } from "@/types/seguranca";

// Find a column by normalized name (case-insensitive, trimmed).
function findColumnByName (headers: string[], targetName: string): string | undefined {
  const normalized = targetName.trim().toLowerCase();
  return headers.find((h) => h.trim().toLowerCase() === normalized);
}

/**
 * Normalizes the raw "Classificação da Notificação" value into the fixed
 * gravity ladder shown in the report reference. Unknown non-empty values are
 * kept as-is (trimmed) so nothing is silently dropped; empty → "".
 * Relabels per the report: "Incidente (circunstância de risco ou condições
 * inseguras)" is shown simply as "Circunstância de risco".
 */
export function normalizeClassificacao (value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("incidente (circunst")) return "Circunstância de risco";
  if (lower === "near miss") return "Quase evento";
  if (lower === "incidente sem dano") return "Incidente sem dano";
  if (lower === "evento adverso") return "Evento adverso";
  if (lower === "outra natureza") return "Outra natureza";
  if (lower === "queixa técnica" || lower === "queixa tecnica") return "Queixa técnica";
  return trimmed;
}

export async function parseSegurancaCSV (
  file: File
): Promise<{ rows: SegurancaRow[] }> {
  const input = await toCsvParseInput(file);
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete (results: Papa.ParseResult<Record<string, string>>) {
        const headers = results.meta.fields || [];

        const dataCol = findColumnByName(headers, "Data da notificação");
        const turnoCol = findColumnByName(headers, "Turno");
        const notificanteCol = findColumnByName(headers, "Setor notificante");
        const localCol = findColumnByName(headers, "Local de ocorrência");
        const taxonomiaCol = findColumnByName(headers, "Taxonomia");
        const classificacaoCol = findColumnByName(headers, "Classificação da Notificação");

        if (!dataCol || !turnoCol || !notificanteCol || !localCol || !taxonomiaCol || !classificacaoCol) {
          reject(
            new Error(
              "Colunas esperadas não encontradas. Verifique se a planilha é a exportação de notificações de incidentes (colunas: Data da notificação, Turno, Setor notificante, Local de ocorrência, Taxonomia, Classificação da Notificação)."
            )
          );
          return;
        }

        const data = results.data as Record<string, string>[];
        // Decide the column's date order once from all rows, then parse each
        // value with it — matching the Boletim de NC parser's locale robustness.
        const dayFirst = detectDayFirst(data.map((r) => r[dataCol] || ""));

        const rows: SegurancaRow[] = data
          .map((row): SegurancaRow | null => {
            const notifiedAt = parseBrDate(row[dataCol] || "", dayFirst);
            if (!notifiedAt) return null;
            return {
              notifiedAt,
              turno: (row[turnoCol] || "").trim(),
              setorNotificante: (row[notificanteCol] || "").trim(),
              localOcorrencia: (row[localCol] || "").trim(),
              taxonomia: (row[taxonomiaCol] || "").trim(),
              classificacao: normalizeClassificacao(row[classificacaoCol] || ""),
            };
          })
          .filter((r): r is SegurancaRow => r !== null);

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
