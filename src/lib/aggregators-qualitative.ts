import type {
  QualitativeAuditRow,
  QualitativeParsedQuestion,
  QualitativeQuestionStats,
  QualitativeCategoryGroup,
  QualitativeGlobalMetrics,
} from "@/types/qualitative-audit";

export function computeQualitativeQuestionStats (
  question: QualitativeParsedQuestion,
  rows: QualitativeAuditRow[]
): QualitativeQuestionStats {
  let conforme = 0;
  let naoConforme = 0;
  let naoSeAplica = 0;

  for (const row of rows) {
    const val = row.responses[question.fullHeader];
    if (val === "CONFORME") conforme++;
    else if (val === "NÃO CONFORME") naoConforme++;
    else if (val === "NÃO SE APLICA") naoSeAplica++;
  }

  const total = conforme + naoConforme + naoSeAplica;
  const validTotal = conforme + naoConforme; // Valid items only (exclude N/A)

  return {
    question,
    conforme,
    naoConforme,
    naoSeAplica,
    total,
    conformePercent: validTotal > 0 ? (conforme / validTotal) * 100 : 0,
    naoConformePercent: validTotal > 0 ? (naoConforme / validTotal) * 100 : 0,
    naoSeAplicaPercent: total > 0 ? (naoSeAplica / total) * 100 : 0,
    isAlert: validTotal > 0 && (naoConforme / validTotal) * 100 > 30,
  };
}

export function groupQualitativeByCategory (
  questions: QualitativeParsedQuestion[],
  rows: QualitativeAuditRow[]
): QualitativeCategoryGroup[] {
  const categoryMap = new Map<string, QualitativeParsedQuestion[]>();

  for (const q of questions) {
    const existing = categoryMap.get(q.category) || [];
    existing.push(q);
    categoryMap.set(q.category, existing);
  }

  const groups: QualitativeCategoryGroup[] = [];

  for (const [category, qs] of categoryMap) {
    const sorted = qs.sort((a, b) => a.sortKey - b.sortKey);
    const stats = sorted.map((q) => computeQualitativeQuestionStats(q, rows));

    const withData = stats.filter((s) => s.total > 0);
    const avgConforme =
      withData.length > 0
        ? withData.reduce((sum, s) => sum + s.conformePercent, 0) /
        withData.length
        : 0;
    const avgNaoConforme =
      withData.length > 0
        ? withData.reduce((sum, s) => sum + s.naoConformePercent, 0) /
        withData.length
        : 0;

    groups.push({ category, questions: stats, avgConforme, avgNaoConforme });
  }

  return groups.sort((a, b) => a.category.localeCompare(b.category));
}

export function computeQualitativeGlobalMetrics (
  groups: QualitativeCategoryGroup[],
  totalRows: number
): QualitativeGlobalMetrics {
  const allStats = groups
    .flatMap((g) => g.questions)
    .filter((s) => s.total > 0);

  const avgConforme =
    allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.conformePercent, 0) /
      allStats.length
      : 0;
  const avgNaoConforme =
    allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.naoConformePercent, 0) /
      allStats.length
      : 0;

  let worstCategory = "—";
  let worstCategoryPercent = 0;

  for (const g of groups) {
    if (g.avgNaoConforme > worstCategoryPercent) {
      worstCategoryPercent = g.avgNaoConforme;
      worstCategory = g.category;
    }
  }

  return {
    avgConforme,
    avgNaoConforme,
    totalResponses: totalRows,
    worstCategory,
    worstCategoryPercent,
  };
}

export interface CategoryObservation {
  sector: string;
  prontuario: string;
  date: Date;
  text: string;
}

export interface ObservationGroup {
  category: string;
  items: CategoryObservation[];
}

export function collectObservations (
  rows: QualitativeAuditRow[]
): ObservationGroup[] {
  const byCategory = new Map<string, CategoryObservation[]>();

  for (const row of rows) {
    for (const [category, text] of Object.entries(row.observations)) {
      if (!text || !text.trim()) continue;
      const items = byCategory.get(category) || [];
      items.push({
        sector: row.sector,
        prontuario: row.prontuario,
        date: row.auditDate,
        text: text.trim(),
      });
      byCategory.set(category, items);
    }
  }

  return Array.from(byCategory.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

// ─── Observation analytics ──────────────────────────────────────────────────

export interface ObservationMetrics {
  totalObservations: number;
  categoriesWithObs: number;
  rowsWithObs: number;
  pctRowsWithObs: number;
  topCategory: string;
  topCategoryCount: number;
}

export function computeObservationMetrics (
  rows: QualitativeAuditRow[],
  observations: ObservationGroup[]
): ObservationMetrics {
  const totalObservations = observations.reduce((sum, g) => sum + g.items.length, 0);

  let rowsWithObs = 0;
  for (const row of rows) {
    const has = Object.values(row.observations).some((t) => t && t.trim());
    if (has) rowsWithObs++;
  }

  let topCategory = "—";
  let topCategoryCount = 0;
  for (const g of observations) {
    if (g.items.length > topCategoryCount) {
      topCategoryCount = g.items.length;
      topCategory = g.category;
    }
  }

  return {
    totalObservations,
    categoriesWithObs: observations.length,
    rowsWithObs,
    pctRowsWithObs: rows.length > 0 ? (rowsWithObs / rows.length) * 100 : 0,
    topCategory,
    topCategoryCount,
  };
}

export function countObservationsByCategory (
  observations: ObservationGroup[]
): { category: string; count: number }[] {
  return observations
    .map((g) => ({ category: g.category, count: g.items.length }))
    .sort((a, b) => b.count - a.count);
}

// Portuguese stopwords + audit-domain filler — excluded from recurring terms.
const PT_STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "o", "a", "os", "as", "em", "no", "na",
  "nos", "nas", "um", "uma", "uns", "umas", "para", "pra", "por", "com", "sem",
  "que", "se", "ao", "aos", "à", "às", "ou", "mas", "como", "mais", "menos",
  "não", "nao", "sim", "foi", "foram", "ser", "está", "esta", "estão", "estao",
  "ter", "tem", "têm", "tinha", "há", "ha", "já", "ja", "também", "tambem",
  "este", "esse", "essa", "esta", "isto", "isso", "aquele", "aquela", "seu",
  "sua", "seus", "suas", "meu", "minha", "ele", "ela", "eles", "elas", "lhe",
  "me", "te", "nos", "vos", "pelo", "pela", "pelos", "pelas", "num", "numa",
  "são", "sao", "the", "of", "and", "item", "itens",
]);

export function extractRecurringTerms (
  observations: ObservationGroup[],
  limit = 20
): { term: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const g of observations) {
    for (const item of g.items) {
      const tokens = item.text.toLowerCase().split(/[^a-zà-ú0-9]+/i);
      for (const tok of tokens) {
        if (tok.length < 3 || PT_STOPWORDS.has(tok)) continue;
        counts.set(tok, (counts.get(tok) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .filter((t) => t.count > 1)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}
