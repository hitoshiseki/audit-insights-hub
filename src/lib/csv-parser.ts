import Papa from "papaparse";
import type { AuditRow, ParsedQuestion, ResponseValue } from "@/types/audit";
import { toCsvParseInput } from "./spreadsheet";
import { parseBrDate, detectDayFirst, normalizeSector } from "./csv-parser-boletim";

const VALID_RESPONSES: string[] = ["CONFORME", "NÃO CONFORME", "NÃO SE APLICA"];

const QUESTION_PATTERN = /^(.+?)\s*\[(\d+)[-–]\s*(.+)\]$/;

const META_COLUMNS = [
  "Carimbo de data/hora",
  "AUDITOR",
  "Data da Auditoria",
  "Setor Auditado",
  "Liderança presente",
];

// Find column by normalized name (case-insensitive, trimmed)
function findColumnByName (headers: string[], targetName: string): string | undefined {
  const normalized = targetName.trim().toLowerCase();
  return headers.find(h => h.trim().toLowerCase() === normalized);
}

export function parseQuestionHeader (header: string): ParsedQuestion | null {
  const match = header.match(QUESTION_PATTERN);
  if (!match) return null;
  return {
    category: match[1].trim(),
    number: parseInt(match[2], 10),
    text: match[3].trim().replace(/\]$/, ""),
    fullHeader: header,
  };
}

function normalizeResponse (value: string): ResponseValue | null {
  const trimmed = value?.trim()?.toUpperCase();
  if (!trimmed) return null;
  // Handle typo "CONFOME" -> "CONFORME"
  if (trimmed === "CONFOME") return "CONFORME";
  if (VALID_RESPONSES.includes(trimmed)) return trimmed as ResponseValue;
  return null;
}


export async function parseCSV (file: File): Promise<{ rows: AuditRow[]; questions: ParsedQuestion[] }> {
  const input = await toCsvParseInput(file);
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      complete (results: Papa.ParseResult<Record<string, string>>) {
        const headers = results.meta.fields || [];
        const questionHeaders = headers.filter(
          (h) => !META_COLUMNS.includes(h) && QUESTION_PATTERN.test(h)
        );

        const questions: ParsedQuestion[] = questionHeaders
          .map(parseQuestionHeader)
          .filter((q): q is ParsedQuestion => q !== null)
          .sort((a, b) => {
            const catCmp = a.category.localeCompare(b.category);
            return catCmp !== 0 ? catCmp : a.number - b.number;
          });

        // Find columns with flexible name matching
        const timestampCol = findColumnByName(headers, "Carimbo de data/hora");
        const auditorCol = findColumnByName(headers, "AUDITOR");
        const auditDateCol = findColumnByName(headers, "Data da Auditoria");
        const sectorCol = findColumnByName(headers, "Setor Auditado");
        const leadershipCol = findColumnByName(headers, "Liderança presente");

        const data = results.data as Record<string, string>[];
        const tsKey = timestampCol || "Carimbo de data/hora";
        const auditDateKey = auditDateCol || "Data da Auditoria";
        // Day/month order is decided per column: Google Forms exports in the
        // form owner's locale, so dates may arrive as US `M/d/yy`.
        const tsDayFirst = detectDayFirst(data.map((r) => r[tsKey] || ""));
        const auditDayFirst = detectDayFirst(data.map((r) => r[auditDateKey] || ""));

        const rows: AuditRow[] = data.map((row) => {
          const responses: Record<string, ResponseValue | null> = {};
          for (const qh of questionHeaders) {
            responses[qh] = normalizeResponse(row[qh]);
          }
          const timestamp = parseBrDate(row[tsKey] || "", tsDayFirst) ?? new Date();
          return {
            timestamp,
            auditor: row[auditorCol || "AUDITOR"] || "",
            auditDate: parseBrDate(row[auditDateKey] || "", auditDayFirst) ?? timestamp,
            sector: normalizeSector(row[sectorCol || "Setor Auditado"] || ""),
            leadershipPresent: row[leadershipCol || "Liderança presente"] || "",
            responses,
          };
        });

        if (rows.length === 0) {
          reject(new Error("A planilha não contém dados. Verifique o arquivo e tente novamente."));
          return;
        }
        if (questions.length === 0) {
          reject(new Error("Nenhuma coluna de pergunta foi encontrada. Verifique o formato do arquivo."));
          return;
        }

        resolve({ rows, questions });
      },
      error (err) {
        reject(err);
      },
    });
  });
}
