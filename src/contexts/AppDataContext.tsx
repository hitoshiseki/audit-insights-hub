import { createContext, useContext, useState, useCallback, useEffect } from "react";
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

// ── localStorage keys ──────────────────────────────────────────────────────────
const KEY_ROPS     = "audit-insights-rops";
const KEY_CLINICAL = "audit-insights-clinical";

// ── Serialization helpers ──────────────────────────────────────────────────────

function serializeRops (state: RopsState): string {
  return JSON.stringify({
    ...state,
    rows: state.rows.map((r) => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
      auditDate: r.auditDate.toISOString(),
    })),
  });
}

function deserializeRops (json: string): RopsState {
  const parsed = JSON.parse(json) as {
    rows: (Omit<AuditRow, "timestamp" | "auditDate"> & { timestamp: string; auditDate: string })[];
    questions: ParsedQuestion[];
    fileName: string;
  };
  return {
    ...parsed,
    rows: parsed.rows.map((r) => ({
      ...r,
      timestamp: new Date(r.timestamp),
      auditDate: new Date(r.auditDate),
    })),
  };
}

function serializeClinical (state: ClinicalState): string {
  return JSON.stringify({
    ...state,
    rows: state.rows.map((r) => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
      auditDate: r.auditDate.toISOString(),
    })),
  });
}

function deserializeClinical (json: string): ClinicalState {
  const parsed = JSON.parse(json) as {
    rows: (Omit<ClinicalAuditRow, "timestamp" | "auditDate"> & { timestamp: string; auditDate: string })[];
    questions: ClinicalParsedQuestion[];
    fileName: string;
  };
  return {
    ...parsed,
    rows: parsed.rows.map((r) => ({
      ...r,
      timestamp: new Date(r.timestamp),
      auditDate: new Date(r.auditDate),
    })),
  };
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AppDataProvider ({ children }: { children: React.ReactNode }) {
  const [rops, setRops] = useState<RopsState | null>(null);
  const [ropsLoading, setRopsLoading] = useState(false);
  const [ropsError, setRopsError] = useState<string | null>(null);

  const [clinical, setClinical] = useState<ClinicalState | null>(null);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalError, setClinicalError] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const ropsJson = localStorage.getItem(KEY_ROPS);
      if (ropsJson) setRops(deserializeRops(ropsJson));
    } catch {
      localStorage.removeItem(KEY_ROPS);
    }

    try {
      const clinicalJson = localStorage.getItem(KEY_CLINICAL);
      if (clinicalJson) setClinical(deserializeClinical(clinicalJson));
    } catch {
      localStorage.removeItem(KEY_CLINICAL);
    }
  }, []);

  const loadRops = useCallback(async (file: File) => {
    setRopsLoading(true);
    setRopsError(null);
    try {
      const result = await parseCSV(file);
      const state: RopsState = { rows: result.rows, questions: result.questions, fileName: file.name };
      setRops(state);
      try {
        localStorage.setItem(KEY_ROPS, serializeRops(state));
      } catch {
        // Storage quota exceeded — silently ignore
      }
    } catch (e) {
      setRops(null);
      setRopsError(e instanceof Error ? e.message : "Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setRopsLoading(false);
    }
  }, []);

  const loadClinical = useCallback(async (file: File) => {
    setClinicalLoading(true);
    setClinicalError(null);
    try {
      const result = await parseClinicalCSV(file);
      const state: ClinicalState = { rows: result.rows, questions: result.questions, fileName: file.name };
      setClinical(state);
      try {
        localStorage.setItem(KEY_CLINICAL, serializeClinical(state));
      } catch {
        // Storage quota exceeded — silently ignore
      }
    } catch (e) {
      setClinical(null);
      setClinicalError(e instanceof Error ? e.message : "Erro ao processar o arquivo CSV. Verifique o formato.");
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
