import { createContext, useContext, useState, useCallback } from "react";
import type { AuditRow, ParsedQuestion } from "@/types/audit";
import type { ClinicalAuditRow, ClinicalParsedQuestion } from "@/types/clinical-audit";
import { parseCSV } from "@/lib/csv-parser";
import { parseClinicalCSV } from "@/lib/csv-parser-clinical";

interface RopsState {
  rows: AuditRow[];
  questions: ParsedQuestion[];
  fileName: string;
}

interface ClinicalState {
  rows: ClinicalAuditRow[];
  questions: ClinicalParsedQuestion[];
  fileName: string;
}

interface AppDataContextValue {
  rops: RopsState | null;
  ropsLoading: boolean;
  ropsError: string | null;
  loadRops: (file: File) => Promise<void>;

  clinical: ClinicalState | null;
  clinicalLoading: boolean;
  clinicalError: string | null;
  loadClinical: (file: File) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue>({
  rops: null,
  ropsLoading: false,
  ropsError: null,
  loadRops: async () => { },
  clinical: null,
  clinicalLoading: false,
  clinicalError: null,
  loadClinical: async () => { },
});

export function useAppData () {
  return useContext(AppDataContext);
}

export function AppDataProvider ({ children }: { children: React.ReactNode }) {
  const [rops, setRops] = useState<RopsState | null>(null);
  const [ropsLoading, setRopsLoading] = useState(false);
  const [ropsError, setRopsError] = useState<string | null>(null);

  const [clinical, setClinical] = useState<ClinicalState | null>(null);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalError, setClinicalError] = useState<string | null>(null);

  const loadRops = useCallback(async (file: File) => {
    setRopsLoading(true);
    setRopsError(null);
    try {
      const result = await parseCSV(file);
      setRops({ rows: result.rows, questions: result.questions, fileName: file.name });
    } catch {
      setRopsError("Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setRopsLoading(false);
    }
  }, []);

  const loadClinical = useCallback(async (file: File) => {
    setClinicalLoading(true);
    setClinicalError(null);
    try {
      const result = await parseClinicalCSV(file);
      setClinical({ rows: result.rows, questions: result.questions, fileName: file.name });
    } catch {
      setClinicalError("Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setClinicalLoading(false);
    }
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        rops, ropsLoading, ropsError, loadRops,
        clinical, clinicalLoading, clinicalError, loadClinical,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}
