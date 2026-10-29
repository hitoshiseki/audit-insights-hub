import Papa from "papaparse";
import { toCsvParseInput } from "./spreadsheet";
import { parseBrDate, detectDayFirst, normalizeSector } from "./csv-parser-boletim";
import type {
  ClinicalAuditRow,
  ClinicalParsedQuestion,
  ResponseValue,
} from "@/types/clinical-audit";

const VALID_RESPONSES: string[] = ["CONFORME", "NÃO CONFORME", "NÃO SE APLICA"];

// Matches: "1. CATEGORY  [1.1.  Question text...]" or "1. CATEGORY [1.1 Question]"
const QUESTION_PATTERN = /^(.+?)\s*\[(\d+\.\d+\.?)\s+(.+)\]$/;

const CLINICAL_META_COLUMNS = [
  "Carimbo de data/hora",
  "Data da auditoria",
  "Auditor",
  "Setor/ prontuário da Auditoria",
  "RH do paciente",
  "Tipo de auditoria",
];

// Find column by normalized name (case-insensitive, trimmed)
function findColumnByName (headers: string[], targetName: string): string | undefined {
  const normalized = targetName.trim().toLowerCase();
  return headers.find(h => h.trim().toLowerCase() === normalized);
}

export function parseClinicalQuestionHeader (
  header: string
): ClinicalParsedQuestion | null {
  const match = header.match(QUESTION_PATTERN);
  if (!match) return null;
  const numberStr = match[2].replace(/\.$/, "").trim(); // "1.1." → "1.1"
  return {
    category: match[1].trim(),
    numberStr,
    sortKey: parseFloat(numberStr),
    text: match[3].trim().replace(/\]$/, ""),
    fullHeader: header,
  };
}

function normalizeResponse (value: string): ResponseValue | null {
  const trimmed = value?.trim()?.toUpperCase();
  if (!trimmed) return null;
  if (trimmed === "CONFOME") return "CONFORME";
  if (VALID_RESPONSES.includes(trimmed)) return trimmed as ResponseValue;
  return null;
}


export async function parseClinicalCSV (
  file: File
): Promise<{ rows: ClinicalAuditRow[]; questions: ClinicalParsedQuestion[] }> {
  const input = await toCsvParseInput(file);
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete (results: Papa.ParseResult<Record<string, string>>) {
        const headers = results.meta.fields || [];

        const questionHeaders = headers.filter(
          (h) => !CLINICAL_META_COLUMNS.includes(h) && QUESTION_PATTERN.test(h)
        );

        const questions: ClinicalParsedQuestion[] = questionHeaders
          .map(parseClinicalQuestionHeader)
          .filter((q): q is ClinicalParsedQuestion => q !== null)
          .sort((a, b) => {
            const catCmp = a.category.localeCompare(b.category);
            return catCmp !== 0 ? catCmp : a.sortKey - b.sortKey;
          });

        // Find columns with flexible name matching
        const timestampCol = findColumnByName(headers, "Carimbo de data/hora");
        const auditDateCol = findColumnByName(headers, "Data da auditoria");
        const auditorCol = findColumnByName(headers, "Auditor");
        const sectorCol = findColumnByName(headers, "Setor/ prontuário da Auditoria");
        const prontuarioCol = findColumnByName(headers, "RH do paciente");
        const auditTypeCol = findColumnByName(headers, "Tipo de auditoria");

        const data = results.data as Record<string, string>[];
        const tsKey = timestampCol || "Carimbo de data/hora";
        const auditDateKey = auditDateCol || "Data da auditoria";
        // Day/month order is decided per column: Google Forms exports in the
        // form owner's locale, so dates may arrive as US `M/d/yy`.
        const tsDayFirst = detectDayFirst(data.map((r) => r[tsKey] || ""));
        const auditDayFirst = detectDayFirst(data.map((r) => r[auditDateKey] || ""));

        const rows: ClinicalAuditRow[] = data.map((row) => {
          const responses: Record<string, ResponseValue | null> = {};
          for (const qh of questionHeaders) {
            responses[qh] = normalizeResponse(row[qh]);
          }
          const timestamp = parseBrDate(row[tsKey] || "", tsDayFirst) ?? new Date();
          return {
            timestamp,
            auditor: row[auditorCol || "Auditor"] || "",
            auditDate: parseBrDate(row[auditDateKey] || "", auditDayFirst) ?? timestamp,
            sector: normalizeSector(row[sectorCol || "Setor/ prontuário da Auditoria"] || ""),
            prontuario: (row[prontuarioCol || "RH do paciente"] || "").trim(),
            auditType: (row[auditTypeCol || "Tipo de auditoria"] || "").trim(),
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
