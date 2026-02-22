import type { ResponseValue } from "./audit";
import type { GlobalMetrics } from "./audit";

export type { ResponseValue };

// ClinicalGlobalMetrics has the same shape as GlobalMetrics
export type ClinicalGlobalMetrics = GlobalMetrics;

export interface ClinicalParsedQuestion {
  category: string;
  numberStr: string;   // e.g. "1.1"
  sortKey: number;     // numeric for sorting, e.g. 1.1
  text: string;
  fullHeader: string;
}

export interface ClinicalAuditRow {
  timestamp: Date;
  auditor: string;
  auditDate: Date;
  sector: string;       // "Setor/ prontuário da Auditoria"
  prontuario: string;   // "RH do paciente"
  auditType: string;    // "Tipo de auditoria": "Retroativa" | "Prospectiva"
  responses: Record<string, ResponseValue | null>;
}

export interface ClinicalQuestionStats {
  question: ClinicalParsedQuestion;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  total: number;
  conformePercent: number;
  naoConformePercent: number;
  naoSeAplicaPercent: number;
  isAlert: boolean;
}

export interface ClinicalCategoryGroup {
  category: string;
  questions: ClinicalQuestionStats[];
  avgConforme: number;
  avgNaoConforme: number;
}

export interface AuditTypeStats {
  retroativa: number;
  prospectiva: number;
  total: number;
  retroativaPercent: number;
  prospectivaPercent: number;
}
