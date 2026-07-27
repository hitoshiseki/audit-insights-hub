import type { ParsedQuestion } from "@/types/audit";
import type { RopLevel } from "@/lib/rop-levels";

/** Resposta de um teste após normalização; célula vazia ou valor estranho vira SEM RESPOSTA. */
export type TestAnswer = "CONFORME" | "NÃO CONFORME" | "NÃO SE APLICA" | "SEM RESPOSTA";

/** Classificação da ROP dentro de uma auditoria. */
export type RopResult = "CONFORME" | "NÃO CONFORME" | "NÃO AVALIADA" | "INCOMPLETA";

export interface RopTest {
  question: ParsedQuestion;
  answer: TestAnswer;
}

export interface RopAuditResult {
  /** Índice da linha em rops.rows — identidade da auditoria. */
  auditIndex: number;
  /** Sempre a "Data da Auditoria", nunca o carimbo de envio do formulário. */
  auditDate: Date;
  auditor: string;
  sector: string;
  leadershipPresent: string;
  /** Chave normalizada usada para agrupar. */
  ropKey: string;
  /** Nome original da ROP, para exibição. */
  ropName: string;
  ropLevel: RopLevel | null;
  ropArea: string | null;
  totalTests: number;
  /** totalTests − naoSeAplica (inclui os SEM RESPOSTA). */
  applicable: number;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  semResposta: number;
  result: RopResult;
  /** conforme ÷ applicable × 100 — informativo; null quando applicable === 0. */
  adherencePercent: number | null;
  tests: RopTest[];
}

/**
 * Todo percentual carrega numerador e denominador, para o modo "valores absolutos".
 * evaluated = conforme + naoConforme + incompleta (NÃO AVALIADA fica de fora).
 */
export interface Adherence {
  conforme: number;
  naoConforme: number;
  incompleta: number;
  naoAvaliada: number;
  evaluated: number;
  percent: number | null;
}

export interface AdherenceGroup extends Adherence {
  key: string;
  label: string;
}

export interface RopGlobalKpis extends Adherence {
  totalAudits: number;
  totalSectors: number;
  totalRops: number;
  totalResults: number;
}

/** Tom de cor derivado do percentual de adesão. */
export type AdherenceTone = "good" | "warn" | "bad" | "none";
