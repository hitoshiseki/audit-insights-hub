import Papa from "papaparse";
import { parse as parseDate } from "date-fns";
import type {
  QualitativeAuditRow,
  QualitativeParsedQuestion,
  ResponseValue,
} from "@/types/qualitative-audit";

const VALID_RESPONSES: string[] = ["CONFORME", "NÃO CONFORME", "NÃO SE APLICA"];

// Matches: "1. CATEGORY  [1.1.  Question text...]" or "1. CATEGORY [1.1 Question]"
const QUESTION_PATTERN = /^(.+?)\s*\[(\d+\.\d+\.?)\s+(.+)\]$/;

// Matches free-text observation columns: "1. ASPECTOS GERAIS - OBSERVAÇÕES" / "- OBSERVAÇÃO"
const OBSERVATION_PATTERN = /^(.+?)\s*-\s*observa[çc]/i;

const QUALITATIVE_META_COLUMNS = [
  "Carimbo de data/hora",
  "RH do paciente",
  "Setor",
];

// Find column by normalized name (case-insensitive, trimmed)
function findColumnByName (headers: string[], targetName: string): string | undefined {
  const normalized = targetName.trim().toLowerCase();
  return headers.find(h => h.trim().toLowerCase() === normalized);
}

export function parseQualitativeQuestionHeader (
  header: string
): QualitativeParsedQuestion | null {
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

function parseBrDate (dateStr: string): Date {
  if (!dateStr) return new Date();
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* empty */ }
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* empty */ }
  return new Date();
}

export function parseQualitativeCSV (
  file: File
): Promise<{ rows: QualitativeAuditRow[]; questions: QualitativeParsedQuestion[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete (results) {
        const headers = results.meta.fields || [];

        const questionHeaders = headers.filter(
          (h) => !QUALITATIVE_META_COLUMNS.includes(h) && QUESTION_PATTERN.test(h)
        );

        // Observation columns: "CATEGORY - OBSERVAÇÕES", mapped category → header
        const observationHeaders = headers.filter(
          (h) => !QUESTION_PATTERN.test(h) && OBSERVATION_PATTERN.test(h)
        );
        const observationByCategory = new Map<string, string>();
        for (const h of observationHeaders) {
          const m = h.match(OBSERVATION_PATTERN);
          if (m) observationByCategory.set(m[1].trim(), h);
        }

        const questions: QualitativeParsedQuestion[] = questionHeaders
          .map(parseQualitativeQuestionHeader)
          .filter((q): q is QualitativeParsedQuestion => q !== null)
          .sort((a, b) => {
            const catCmp = a.category.localeCompare(b.category);
            return catCmp !== 0 ? catCmp : a.sortKey - b.sortKey;
          });

        // Find columns with flexible name matching
        const timestampCol = findColumnByName(headers, "Carimbo de data/hora");
        const sectorCol = findColumnByName(headers, "Setor");
        const prontuarioCol = findColumnByName(headers, "RH do paciente");

        const rows: QualitativeAuditRow[] = (
          results.data as Record<string, string>[]
        ).map((row) => {
          const responses: Record<string, ResponseValue | null> = {};
          for (const qh of questionHeaders) {
            responses[qh] = normalizeResponse(row[qh]);
          }
          const observations: Record<string, string> = {};
          for (const [category, header] of observationByCategory) {
            observations[category] = (row[header] || "").trim();
          }
          const date = parseBrDate(row[timestampCol || "Carimbo de data/hora"] || "");
          return {
            timestamp: date,
            auditDate: date,
            sector: row[sectorCol || "Setor"] || "",
            prontuario: (row[prontuarioCol || "RH do paciente"] || "").trim(),
            responses,
            observations,
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
