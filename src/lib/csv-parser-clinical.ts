import Papa from "papaparse";
import { parse as parseDate } from "date-fns";
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

function parseBrDate (dateStr: string): Date {
  if (!dateStr) return new Date();
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { }
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { }
  return new Date();
}

export function parseClinicalCSV (
  file: File
): Promise<{ rows: ClinicalAuditRow[]; questions: ClinicalParsedQuestion[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete (results) {
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

        const rows: ClinicalAuditRow[] = (
          results.data as Record<string, string>[]
        ).map((row) => {
          const responses: Record<string, ResponseValue | null> = {};
          for (const qh of questionHeaders) {
            responses[qh] = normalizeResponse(row[qh]);
          }
          return {
            timestamp: parseBrDate(row["Carimbo de data/hora"] || ""),
            auditor: row["Auditor"] || "",
            auditDate: parseBrDate(row["Data da auditoria"] || ""),
            sector: row["Setor/ prontuário da Auditoria"] || "",
            prontuario: (row["RH do paciente"] || "").trim(),
            auditType: (row["Tipo de auditoria"] || "").trim(),
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
