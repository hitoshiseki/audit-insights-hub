import type {
  ClinicalAuditRow,
  ClinicalParsedQuestion,
  ClinicalQuestionStats,
  ClinicalCategoryGroup,
  ClinicalGlobalMetrics,
  AuditTypeStats,
} from "@/types/clinical-audit";

export function computeClinicalQuestionStats (
  question: ClinicalParsedQuestion,
  rows: ClinicalAuditRow[]
): ClinicalQuestionStats {
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

export function groupClinicalByCategory (
  questions: ClinicalParsedQuestion[],
  rows: ClinicalAuditRow[]
): ClinicalCategoryGroup[] {
  const categoryMap = new Map<string, ClinicalParsedQuestion[]>();

  for (const q of questions) {
    const existing = categoryMap.get(q.category) || [];
    existing.push(q);
    categoryMap.set(q.category, existing);
  }

  const groups: ClinicalCategoryGroup[] = [];

  for (const [category, qs] of categoryMap) {
    const sorted = qs.sort((a, b) => a.sortKey - b.sortKey);
    const stats = sorted.map((q) => computeClinicalQuestionStats(q, rows));

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

export function computeClinicalGlobalMetrics (
  groups: ClinicalCategoryGroup[],
  totalRows: number
): ClinicalGlobalMetrics {
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

export function computeAuditTypeStats (rows: ClinicalAuditRow[]): AuditTypeStats {
  let retroativa = 0;
  let prospectiva = 0;

  for (const row of rows) {
    const t = row.auditType.trim().toUpperCase();
    if (t === "RETROATIVA") retroativa++;
    else if (t === "PROSPECTIVA") prospectiva++;
  }

  const total = retroativa + prospectiva;

  return {
    retroativa,
    prospectiva,
    total,
    retroativaPercent: total > 0 ? (retroativa / total) * 100 : 0,
    prospectivaPercent: total > 0 ? (prospectiva / total) * 100 : 0,
  };
}
