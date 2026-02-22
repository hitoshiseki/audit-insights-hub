import type {
  AuditRow,
  ParsedQuestion,
  QuestionStats,
  CategoryGroup,
  GlobalMetrics,
} from "@/types/audit";

export function computeQuestionStats(
  question: ParsedQuestion,
  rows: AuditRow[]
): QuestionStats {
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

  return {
    question,
    conforme,
    naoConforme,
    naoSeAplica,
    total,
    conformePercent: total > 0 ? (conforme / total) * 100 : 0,
    naoConformePercent: total > 0 ? (naoConforme / total) * 100 : 0,
    naoSeAplicaPercent: total > 0 ? (naoSeAplica / total) * 100 : 0,
    isAlert: total > 0 && (naoConforme / total) * 100 > 30,
  };
}

export function groupByCategory(
  questions: ParsedQuestion[],
  rows: AuditRow[]
): CategoryGroup[] {
  const categoryMap = new Map<string, ParsedQuestion[]>();

  for (const q of questions) {
    const existing = categoryMap.get(q.category) || [];
    existing.push(q);
    categoryMap.set(q.category, existing);
  }

  const groups: CategoryGroup[] = [];

  for (const [category, qs] of categoryMap) {
    const sorted = qs.sort((a, b) => a.number - b.number);
    const stats = sorted.map((q) => computeQuestionStats(q, rows));

    const withData = stats.filter((s) => s.total > 0);
    const avgConforme =
      withData.length > 0
        ? withData.reduce((sum, s) => sum + s.conformePercent, 0) / withData.length
        : 0;
    const avgNaoConforme =
      withData.length > 0
        ? withData.reduce((sum, s) => sum + s.naoConformePercent, 0) / withData.length
        : 0;

    groups.push({ category, questions: stats, avgConforme, avgNaoConforme });
  }

  return groups.sort((a, b) => a.category.localeCompare(b.category));
}

export function computeGlobalMetrics(groups: CategoryGroup[], totalRows: number): GlobalMetrics {
  const allStats = groups.flatMap((g) => g.questions).filter((s) => s.total > 0);

  const avgConforme =
    allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.conformePercent, 0) / allStats.length
      : 0;
  const avgNaoConforme =
    allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.naoConformePercent, 0) / allStats.length
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
