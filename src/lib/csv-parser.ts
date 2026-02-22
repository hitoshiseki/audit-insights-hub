import Papa from "papaparse";
import { parse as parseDate } from "date-fns";
import type { AuditRow, ParsedQuestion, ResponseValue } from "@/types/audit";

const VALID_RESPONSES: string[] = ["CONFORME", "NÃO CONFORME", "NÃO SE APLICA"];

const QUESTION_PATTERN = /^(.+?)\s*\[(\d+)[-–]\s*(.+)\]$/;

const META_COLUMNS = [
  "Carimbo de data/hora",
  "AUDITOR",
  "Data da Auditoria",
  "Setor Auditado",
  "Liderança presente",
];

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

function parseBrDate (dateStr: string): Date {
  if (!dateStr) return new Date();
  // Try "dd/MM/yyyy HH:mm:ss" first
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { }
  // Try "dd/MM/yyyy"
  try {
    const d = parseDate(dateStr, "dd/MM/yyyy", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { }
  return new Date();
}

export function parseCSV (file: File): Promise<{ rows: AuditRow[]; questions: ParsedQuestion[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete (results) {
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

        const rows: AuditRow[] = (results.data as Record<string, string>[]).map((row) => {
          const responses: Record<string, ResponseValue | null> = {};
          for (const qh of questionHeaders) {
            responses[qh] = normalizeResponse(row[qh]);
          }
          return {
            timestamp: parseBrDate(row["Carimbo de data/hora"] || ""),
            auditor: row["AUDITOR"] || "",
            auditDate: parseBrDate(row["Data da Auditoria"] || ""),
            sector: row["Setor Auditado"] || "",
            leadershipPresent: row["Liderança presente"] || "",
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
