import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AuditRow, ParsedQuestion } from "@/types/audit";
import type {
  Adherence,
  AdherenceGroup,
  AdherenceTone,
  RopAuditResult,
  RopGlobalKpis,
  RopResult,
  RopTest,
  TestAnswer,
} from "@/types/rops-compliance";
import { ropMetaOf } from "@/lib/rop-levels";

/**
 * Consolidação por ROP. A unidade de análise aqui é a ROP dentro de uma auditoria,
 * e não o teste individual (que é o que src/lib/aggregators.ts calcula).
 *
 * Regra: a ROP só é CONFORME quando TODOS os testes aplicáveis estão conformes.
 * "NÃO SE APLICA" sai do cálculo; uma ROP com todos os testes "NÃO SE APLICA" é
 * NÃO AVALIADA e fica fora do numerador e do denominador da adesão.
 */

/** Agrupa cabeçalhos ignorando espaços extras/duplicados e diferenças de caixa. */
export function normalizeRopKey (name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * A resposta já chega normalizada de csv-parser.ts (trim, caixa alta e correção do
 * typo "CONFOME"); null significa célula vazia ou valor fora das três opções.
 */
export function answerOf (row: AuditRow, question: ParsedQuestion): TestAnswer {
  return row.responses[question.fullHeader] ?? "SEM RESPOSTA";
}

interface AnswerCounts {
  totalTests: number;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  semResposta: number;
}

/** A ordem de precedência importa: INCOMPLETA vence NÃO AVALIADA. */
export function classifyRop (counts: AnswerCounts): RopResult {
  if (counts.semResposta > 0) return "INCOMPLETA";
  if (counts.naoSeAplica === counts.totalTests) return "NÃO AVALIADA";
  if (counts.naoConforme > 0) return "NÃO CONFORME";
  return "CONFORME";
}

/** Agrupa as perguntas por ROP, preservando o nome original para exibição. */
export function groupQuestionsByRop (
  questions: ParsedQuestion[]
): { key: string; name: string; questions: ParsedQuestion[] }[] {
  const map = new Map<string, { key: string; name: string; questions: ParsedQuestion[] }>();
  for (const q of questions) {
    const key = normalizeRopKey(q.category);
    const existing = map.get(key);
    if (existing) existing.questions.push(q);
    else map.set(key, { key, name: q.category.trim().replace(/\s+/g, " "), questions: [q] });
  }
  return Array.from(map.values());
}

export function computeRopResults (
  rows: AuditRow[],
  questions: ParsedQuestion[]
): RopAuditResult[] {
  const rops = groupQuestionsByRop(questions);
  const results: RopAuditResult[] = [];

  rows.forEach((row, auditIndex) => {
    for (const rop of rops) {
      const tests: RopTest[] = rop.questions.map((question) => ({
        question,
        answer: answerOf(row, question),
      }));

      const counts: AnswerCounts = {
        totalTests: tests.length,
        conforme: 0,
        naoConforme: 0,
        naoSeAplica: 0,
        semResposta: 0,
      };
      for (const t of tests) {
        if (t.answer === "CONFORME") counts.conforme++;
        else if (t.answer === "NÃO CONFORME") counts.naoConforme++;
        else if (t.answer === "NÃO SE APLICA") counts.naoSeAplica++;
        else counts.semResposta++;
      }

      const applicable = counts.totalTests - counts.naoSeAplica;
      const meta = ropMetaOf(rop.key);

      results.push({
        auditIndex,
        auditDate: row.auditDate,
        auditor: row.auditor,
        sector: row.sector,
        leadershipPresent: row.leadershipPresent,
        ropKey: rop.key,
        ropName: rop.name,
        ropLevel: meta?.level ?? null,
        ropArea: meta?.area ?? null,
        totalTests: counts.totalTests,
        applicable,
        conforme: counts.conforme,
        naoConforme: counts.naoConforme,
        naoSeAplica: counts.naoSeAplica,
        semResposta: counts.semResposta,
        result: classifyRop(counts),
        adherencePercent: applicable > 0 ? (counts.conforme / applicable) * 100 : null,
        tests,
      });
    }
  });

  return results;
}

/**
 * Adesão = ROPs CONFORMES ÷ ROPs avaliadas.
 * NÃO CONFORME e INCOMPLETA entram só no denominador; NÃO AVALIADA fica fora dos dois.
 */
export function adherenceOf (results: RopAuditResult[]): Adherence {
  let conforme = 0;
  let naoConforme = 0;
  let incompleta = 0;
  let naoAvaliada = 0;

  for (const r of results) {
    if (r.result === "CONFORME") conforme++;
    else if (r.result === "NÃO CONFORME") naoConforme++;
    else if (r.result === "INCOMPLETA") incompleta++;
    else naoAvaliada++;
  }

  const evaluated = conforme + naoConforme + incompleta;
  return {
    conforme,
    naoConforme,
    incompleta,
    naoAvaliada,
    evaluated,
    percent: evaluated > 0 ? (conforme / evaluated) * 100 : null,
  };
}

export function groupAdherence (
  results: RopAuditResult[],
  keyFn: (r: RopAuditResult) => string,
  labelFn: (r: RopAuditResult) => string
): AdherenceGroup[] {
  const buckets = new Map<string, { label: string; items: RopAuditResult[] }>();
  for (const r of results) {
    const key = keyFn(r);
    const bucket = buckets.get(key);
    if (bucket) bucket.items.push(r);
    else buckets.set(key, { label: labelFn(r), items: [r] });
  }
  return Array.from(buckets.entries()).map(([key, { label, items }]) => ({
    key,
    label,
    ...adherenceOf(items),
  }));
}

export const dateKeyOf = (r: RopAuditResult) => format(r.auditDate, "yyyy-MM-dd");
export const monthKeyOf = (r: RopAuditResult) => format(r.auditDate, "yyyy-MM");

export function groupByRop (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(results, (r) => r.ropKey, (r) => r.ropName);
}

export function groupByArea (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(results, (r) => r.ropArea ?? "—", (r) => r.ropArea ?? "Sem categoria");
}

export function groupBySector (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(results, (r) => r.sector, (r) => r.sector);
}

export function groupByDate (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(results, dateKeyOf, (r) => format(r.auditDate, "dd/MM/yyyy"))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByMonth (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(results, monthKeyOf, (r) =>
    format(r.auditDate, "MMM/yyyy", { locale: ptBR })
  ).sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByAudit (results: RopAuditResult[]): AdherenceGroup[] {
  return groupAdherence(
    results,
    (r) => String(r.auditIndex),
    (r) => `${format(r.auditDate, "dd/MM/yyyy")} — ${r.sector}`
  ).sort((a, b) => Number(a.key) - Number(b.key));
}

export function globalKpis (results: RopAuditResult[]): RopGlobalKpis {
  const audits = new Set<number>();
  const sectors = new Set<string>();
  const rops = new Set<string>();
  for (const r of results) {
    audits.add(r.auditIndex);
    if (r.sector) sectors.add(r.sector);
    rops.add(r.ropKey);
  }
  return {
    ...adherenceOf(results),
    totalAudits: audits.size,
    totalSectors: sectors.size,
    totalRops: rops.size,
    totalResults: results.length,
  };
}

export interface RopTestBreakdown {
  question: ParsedQuestion;
  conforme: number;
  naoConforme: number;
  naoSeAplica: number;
  semResposta: number;
}

export interface RopDetail {
  ropKey: string;
  ropName: string;
  adherence: Adherence;
  tests: RopTestBreakdown[];
  /** Setores ordenados pelo nº de testes não conformes, decrescente. */
  sectorsWithNonConformities: { sector: string; naoConforme: number }[];
  /** Histórico da ROP por data da auditoria. */
  history: { key: string; label: string; sector: string; result: RopResult }[];
}

export function ropDetail (results: RopAuditResult[], ropKey: string): RopDetail | null {
  const items = results.filter((r) => r.ropKey === ropKey);
  if (items.length === 0) return null;

  const tests = new Map<string, RopTestBreakdown>();
  const sectors = new Map<string, number>();

  for (const item of items) {
    for (const t of item.tests) {
      let entry = tests.get(t.question.fullHeader);
      if (!entry) {
        entry = { question: t.question, conforme: 0, naoConforme: 0, naoSeAplica: 0, semResposta: 0 };
        tests.set(t.question.fullHeader, entry);
      }
      if (t.answer === "CONFORME") entry.conforme++;
      else if (t.answer === "NÃO CONFORME") entry.naoConforme++;
      else if (t.answer === "NÃO SE APLICA") entry.naoSeAplica++;
      else entry.semResposta++;
    }
    if (item.naoConforme > 0) {
      sectors.set(item.sector, (sectors.get(item.sector) ?? 0) + item.naoConforme);
    }
  }

  return {
    ropKey,
    ropName: items[0].ropName,
    adherence: adherenceOf(items),
    tests: Array.from(tests.values()).sort((a, b) => a.question.number - b.question.number),
    sectorsWithNonConformities: Array.from(sectors.entries())
      .map(([sector, naoConforme]) => ({ sector, naoConforme }))
      .sort((a, b) => b.naoConforme - a.naoConforme),
    history: items
      .slice()
      .sort((a, b) => a.auditDate.getTime() - b.auditDate.getTime())
      .map((r) => ({
        key: `${r.auditIndex}`,
        label: format(r.auditDate, "dd/MM/yyyy"),
        sector: r.sector,
        result: r.result,
      })),
  };
}

/** Uma casa decimal, no padrão pt-BR. */
export function formatPct (value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Percentual com os valores absolutos que o originaram, ex.: "79,1% (110/139)". */
export function formatPctWithCounts (
  value: number | null,
  numerator: number,
  denominator: number,
  showAbsolute: boolean
): string {
  const pct = formatPct(value);
  return showAbsolute ? `${pct} (${numerator}/${denominator})` : pct;
}

export function adherenceTone (percent: number | null): AdherenceTone {
  if (percent === null) return "none";
  if (percent >= 70) return "good";
  if (percent >= 50) return "warn";
  return "bad";
}

/** Ordena por adesão; ROPs sem avaliação (percent null) sempre no fim. */
export function sortByAdherence (groups: AdherenceGroup[], direction: "asc" | "desc"): AdherenceGroup[] {
  return groups.slice().sort((a, b) => {
    if (a.percent === null && b.percent === null) return a.label.localeCompare(b.label);
    if (a.percent === null) return 1;
    if (b.percent === null) return -1;
    if (a.percent === b.percent) return a.label.localeCompare(b.label);
    return direction === "asc" ? a.percent - b.percent : b.percent - a.percent;
  });
}
