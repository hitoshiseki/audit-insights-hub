import type { ResponseValue } from "./audit";
import type { GlobalMetrics } from "./audit";

export type { ResponseValue };

// QualitativeGlobalMetrics has the same shape as GlobalMetrics
export type QualitativeGlobalMetrics = GlobalMetrics;

export interface QualitativeParsedQuestion {
  category: string;
  numberStr: string;   // e.g. "1.1"
  sortKey: number;     // numeric for sorting, e.g. 1.1
  text: string;
  fullHeader: string;
}

export interface QualitativeAuditRow {
  timestamp: Date;
  auditDate: Date;      // = timestamp (CSV only has "Carimbo de data/hora")
  sector: string;       // "Setor"
  prontuario: string;   // "RH do paciente"
  responses: Record<string, ResponseValue | null>;
  observations: Record<string, string>; // keyed by category name → free text
}

export interface QualitativeQuestionStats {
  question: QualitativeParsedQuestion;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  total: number;
  conformePercent: number;
  naoConformePercent: number;
  naoSeAplicaPercent: number;
  isAlert: boolean;
}

export interface QualitativeCategoryGroup {
  category: string;
  questions: QualitativeQuestionStats[];
  avgConforme: number;
  avgNaoConforme: number;
}
