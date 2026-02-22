export type ResponseValue = "CONFORME" | "NÃO CONFORME" | "NÃO SE APLICA";

export interface ParsedQuestion {
  category: string;
  number: number;
  text: string;
  fullHeader: string;
}

export interface AuditRow {
  timestamp: Date;
  auditor: string;
  auditDate: Date;
  sector: string;
  leadershipPresent: string;
  responses: Record<string, ResponseValue | null>;
}

export interface QuestionStats {
  question: ParsedQuestion;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  total: number;
  conformePercent: number;
  naoConformePercent: number;
  naoSeAplicaPercent: number;
  isAlert: boolean;
}

export interface CategoryGroup {
  category: string;
  questions: QuestionStats[];
  avgConforme: number;
  avgNaoConforme: number;
}

export interface GlobalMetrics {
  avgConforme: number;
  avgNaoConforme: number;
  totalResponses: number;
  worstCategory: string;
  worstCategoryPercent: number;
}
