import { useState, useCallback } from "react";
import type { AuditRow, ParsedQuestion } from "@/types/audit";
import { parseCSV } from "@/lib/csv-parser";

export function useCsvData() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseCSV(file);
      setRows(result.rows);
      setQuestions(result.questions);
      setFileName(file.name);
      setIsLoaded(true);
    } catch (e) {
      setError("Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setQuestions([]);
    setIsLoaded(false);
    setFileName("");
    setError(null);
  }, []);

  return { rows, questions, isLoaded, isLoading, error, fileName, loadFile, reset };
}
