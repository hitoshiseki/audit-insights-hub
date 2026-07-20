import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AuditRow, ParsedQuestion } from "@/types/audit";
import type { ClinicalAuditRow, ClinicalParsedQuestion } from "@/types/clinical-audit";
import type { QualitativeAuditRow, QualitativeParsedQuestion } from "@/types/qualitative-audit";
import type { BoletimRow } from "@/types/boletim";
import type { SegurancaRow } from "@/types/seguranca";
import { parseCSV } from "@/lib/csv-parser";
import { parseClinicalCSV } from "@/lib/csv-parser-clinical";
import { parseQualitativeCSV } from "@/lib/csv-parser-qualitative";
import { parseBoletimCSV } from "@/lib/csv-parser-boletim";
import { parseSegurancaCSV } from "@/lib/csv-parser-seguranca";

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

interface QualitativeState {
  rows: QualitativeAuditRow[];
  questions: QualitativeParsedQuestion[];
  fileName: string;
}

interface BoletimState {
  rows: BoletimRow[];
  fileName: string;
}

interface SegurancaState {
  rows: SegurancaRow[];
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

  qualitative: QualitativeState | null;
  qualitativeLoading: boolean;
  qualitativeError: string | null;
  loadQualitative: (file: File) => Promise<void>;

  boletim: BoletimState | null;
  boletimLoading: boolean;
  boletimError: string | null;
  loadBoletim: (file: File) => Promise<void>;

  seguranca: SegurancaState | null;
  segurancaLoading: boolean;
  segurancaError: string | null;
  loadSeguranca: (file: File) => Promise<void>;

  clearAllData: () => void;
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
  qualitative: null,
  qualitativeLoading: false,
  qualitativeError: null,
  loadQualitative: async () => { },
  boletim: null,
  boletimLoading: false,
  boletimError: null,
  loadBoletim: async () => { },
  seguranca: null,
  segurancaLoading: false,
  segurancaError: null,
  loadSeguranca: async () => { },
  clearAllData: () => { },
});

export function useAppData () {
  return useContext(AppDataContext);
}

// ── localStorage keys ──────────────────────────────────────────────────────────
const KEY_ROPS        = "audit-insights-rops";
const KEY_CLINICAL    = "audit-insights-clinical";
const KEY_QUALITATIVE = "audit-insights-qualitative";
const KEY_BOLETIM     = "audit-insights-boletim";
const KEY_SEGURANCA   = "audit-insights-seguranca";

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

function serializeQualitative (state: QualitativeState): string {
  return JSON.stringify({
    ...state,
    rows: state.rows.map((r) => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
      auditDate: r.auditDate.toISOString(),
    })),
  });
}

function deserializeQualitative (json: string): QualitativeState {
  const parsed = JSON.parse(json) as {
    rows: (Omit<QualitativeAuditRow, "timestamp" | "auditDate"> & { timestamp: string; auditDate: string })[];
    questions: QualitativeParsedQuestion[];
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

function serializeBoletim (state: BoletimState): string {
  return JSON.stringify({
    ...state,
    rows: state.rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

function deserializeBoletim (json: string): BoletimState {
  const parsed = JSON.parse(json) as {
    rows: (Omit<BoletimRow, "createdAt"> & { createdAt: string })[];
    fileName: string;
  };
  return {
    ...parsed,
    rows: parsed.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    })),
  };
}

function serializeSeguranca (state: SegurancaState): string {
  return JSON.stringify({
    ...state,
    rows: state.rows.map((r) => ({
      ...r,
      notifiedAt: r.notifiedAt.toISOString(),
    })),
  });
}

function deserializeSeguranca (json: string): SegurancaState {
  const parsed = JSON.parse(json) as {
    rows: (Omit<SegurancaRow, "notifiedAt"> & { notifiedAt: string })[];
    fileName: string;
  };
  return {
    ...parsed,
    rows: parsed.rows.map((r) => ({
      ...r,
      notifiedAt: new Date(r.notifiedAt),
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

  const [qualitative, setQualitative] = useState<QualitativeState | null>(null);
  const [qualitativeLoading, setQualitativeLoading] = useState(false);
  const [qualitativeError, setQualitativeError] = useState<string | null>(null);

  const [boletim, setBoletim] = useState<BoletimState | null>(null);
  const [boletimLoading, setBoletimLoading] = useState(false);
  const [boletimError, setBoletimError] = useState<string | null>(null);

  const [seguranca, setSeguranca] = useState<SegurancaState | null>(null);
  const [segurancaLoading, setSegurancaLoading] = useState(false);
  const [segurancaError, setSegurancaError] = useState<string | null>(null);

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

    try {
      const qualitativeJson = localStorage.getItem(KEY_QUALITATIVE);
      if (qualitativeJson) setQualitative(deserializeQualitative(qualitativeJson));
    } catch {
      localStorage.removeItem(KEY_QUALITATIVE);
    }

    try {
      const boletimJson = localStorage.getItem(KEY_BOLETIM);
      if (boletimJson) setBoletim(deserializeBoletim(boletimJson));
    } catch {
      localStorage.removeItem(KEY_BOLETIM);
    }

    try {
      const segurancaJson = localStorage.getItem(KEY_SEGURANCA);
      if (segurancaJson) setSeguranca(deserializeSeguranca(segurancaJson));
    } catch {
      localStorage.removeItem(KEY_SEGURANCA);
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

  const loadQualitative = useCallback(async (file: File) => {
    setQualitativeLoading(true);
    setQualitativeError(null);
    try {
      const result = await parseQualitativeCSV(file);
      const state: QualitativeState = { rows: result.rows, questions: result.questions, fileName: file.name };
      setQualitative(state);
      try {
        localStorage.setItem(KEY_QUALITATIVE, serializeQualitative(state));
      } catch {
        // Storage quota exceeded — silently ignore
      }
    } catch (e) {
      setQualitative(null);
      setQualitativeError(e instanceof Error ? e.message : "Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setQualitativeLoading(false);
    }
  }, []);

  const loadBoletim = useCallback(async (file: File) => {
    setBoletimLoading(true);
    setBoletimError(null);
    try {
      const result = await parseBoletimCSV(file);
      const state: BoletimState = { rows: result.rows, fileName: file.name };
      setBoletim(state);
      try {
        localStorage.setItem(KEY_BOLETIM, serializeBoletim(state));
      } catch {
        // Storage quota exceeded — silently ignore
      }
    } catch (e) {
      setBoletim(null);
      setBoletimError(e instanceof Error ? e.message : "Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setBoletimLoading(false);
    }
  }, []);

  const loadSeguranca = useCallback(async (file: File) => {
    setSegurancaLoading(true);
    setSegurancaError(null);
    try {
      const result = await parseSegurancaCSV(file);
      const state: SegurancaState = { rows: result.rows, fileName: file.name };
      setSeguranca(state);
      try {
        localStorage.setItem(KEY_SEGURANCA, serializeSeguranca(state));
      } catch {
        // Storage quota exceeded — silently ignore
      }
    } catch (e) {
      setSeguranca(null);
      setSegurancaError(e instanceof Error ? e.message : "Erro ao processar o arquivo CSV. Verifique o formato.");
    } finally {
      setSegurancaLoading(false);
    }
  }, []);

  const clearAllData = useCallback(() => {
    setRops(null);
    setClinical(null);
    setQualitative(null);
    setBoletim(null);
    setSeguranca(null);
    setRopsError(null);
    setClinicalError(null);
    setQualitativeError(null);
    setBoletimError(null);
    setSegurancaError(null);
    localStorage.removeItem(KEY_ROPS);
    localStorage.removeItem(KEY_CLINICAL);
    localStorage.removeItem(KEY_QUALITATIVE);
    localStorage.removeItem(KEY_BOLETIM);
    localStorage.removeItem(KEY_SEGURANCA);
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        rops, ropsLoading, ropsError, loadRops,
        clinical, clinicalLoading, clinicalError, loadClinical,
        qualitative, qualitativeLoading, qualitativeError, loadQualitative,
        boletim, boletimLoading, boletimError, loadBoletim,
        seguranca, segurancaLoading, segurancaError, loadSeguranca,
        clearAllData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}
