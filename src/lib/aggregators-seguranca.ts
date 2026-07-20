import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  SegurancaRow,
  CountItem,
  MonthCount,
  MonthOption,
  SegurancaPeriod,
  SegurancaMetrics,
} from "@/types/seguranca";

/** Sentinel value for the "all months" option in the month filter. */
export const ALL_MONTHS = "__all__";

/**
 * Fixed severity ladder (normalized labels from `normalizeClassificacao`), in the
 * order the report reference shows them. Drives the ordering of the classification
 * chart / pie so bars always read least→most severe.
 */
export const CLASSIFICACAO_ORDER = [
  "Circunstância de risco",
  "Quase evento",
  "Incidente sem dano",
  "Evento adverso",
  "Outra natureza",
  "Queixa técnica",
] as const;

/** Fixed shift order for the "por turno" chart. */
export const TURNO_ORDER = ["Manhã", "Tarde", "Noite", "Madrugada"] as const;

/** year-month key ("2026-06") used as the filter value for a row's date. */
function monthKey (d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Capitalizes the first letter (date-fns returns "junho/2026" lowercase). */
function capitalize (s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Reporting period taken from the first row's "Data da notificação". */
export function detectPeriod (rows: SegurancaRow[]): SegurancaPeriod | null {
  if (rows.length === 0) return null;
  const ref = rows[0].notifiedAt;
  return {
    month: ref.getMonth(),
    year: ref.getFullYear(),
    label: capitalize(format(ref, "MMMM/yyyy", { locale: ptBR })),
  };
}

/** Count of notifications per month (jan..dez) for the given year. */
export function notificationsByMonth (rows: SegurancaRow[], year: number): MonthCount[] {
  const counts = new Array(12).fill(0);
  for (const r of rows) {
    if (r.notifiedAt.getFullYear() === year) counts[r.notifiedAt.getMonth()] += 1;
  }
  return counts.map((count, month) => ({
    month,
    // Only the month abbreviation (no year) — the period already shows in the header.
    label: format(new Date(year, month, 1), "MMM", { locale: ptBR }),
    count,
  }));
}

/** Generic descending count-by helper. Empty labels are skipped. */
export function countBy (
  rows: SegurancaRow[],
  key: (r: SegurancaRow) => string
): CountItem[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = key(r);
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Incidentes por setor (Local de ocorrência), descending. */
export function incidentesPorSetor (rows: SegurancaRow[]): CountItem[] {
  return countBy(rows, (r) => r.localOcorrencia);
}

/** Notificações realizadas por setor (Setor notificante), descending. */
export function realizadasPorSetor (rows: SegurancaRow[]): CountItem[] {
  return countBy(rows, (r) => r.setorNotificante);
}

/** Top-N incident types (Taxonomia OMS). */
export function tipoIncidente (rows: SegurancaRow[], n = 12): CountItem[] {
  return countBy(rows, (r) => r.taxonomia).slice(0, n);
}

/**
 * Counts by gravity classification, ordered by the fixed severity ladder
 * (`CLASSIFICACAO_ORDER`); any unknown label is appended after, by count.
 */
export function classificacaoCounts (rows: SegurancaRow[]): CountItem[] {
  const counts = countBy(rows, (r) => r.classificacao);
  const rank = (label: string) => {
    const i = CLASSIFICACAO_ORDER.indexOf(label as (typeof CLASSIFICACAO_ORDER)[number]);
    return i === -1 ? CLASSIFICACAO_ORDER.length : i;
  };
  return counts.sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count);
}

/** Counts by shift (Turno), ordered by the fixed shift order; empty shifts dropped. */
export function turnoCounts (rows: SegurancaRow[]): CountItem[] {
  const counts = countBy(rows, (r) => r.turno);
  const rank = (label: string) => {
    const i = TURNO_ORDER.indexOf(label as (typeof TURNO_ORDER)[number]);
    return i === -1 ? TURNO_ORDER.length : i;
  };
  return counts.sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count);
}

export function computeSegurancaMetrics (rows: SegurancaRow[]): SegurancaMetrics {
  const setores = new Set(rows.map((r) => r.localOcorrencia).filter(Boolean));
  const topTax = tipoIncidente(rows, 1)[0];
  const topSetor = incidentesPorSetor(rows)[0];
  return {
    total: rows.length,
    setoresEnvolvidos: setores.size,
    topTaxonomia: topTax?.label ?? "—",
    topTaxonomiaCount: topTax?.count ?? 0,
    topSetor: topSetor?.label ?? "—",
    topSetorCount: topSetor?.count ?? 0,
  };
}

// ── Por-setor views ──────────────────────────────────────────────────────────

/** Total de notificações realizadas por um setor (Setor notificante === setor). */
export function totalRealizadasPeloSetor (rows: SegurancaRow[], setor: string): number {
  return rows.filter((r) => r.setorNotificante === setor).length;
}

/** Total de notificações recebidas por um setor (Local de ocorrência === setor). */
export function totalRecebidasPeloSetor (rows: SegurancaRow[], setor: string): number {
  return rows.filter((r) => r.localOcorrencia === setor).length;
}

/** Turno das notificações recebidas por um setor (Local de ocorrência === setor). */
export function turnoRecebidasPeloSetor (rows: SegurancaRow[], setor: string): CountItem[] {
  return turnoCounts(rows.filter((r) => r.localOcorrencia === setor));
}

/** Tipos de incidente (Taxonomia OMS) recebidos por um setor. */
export function tipoIncidentePeloSetor (rows: SegurancaRow[], setor: string, n = 12): CountItem[] {
  return tipoIncidente(rows.filter((r) => r.localOcorrencia === setor), n);
}

/** Classificação (gravidade) das notificações recebidas por um setor. */
export function classificacaoPeloSetor (rows: SegurancaRow[], setor: string): CountItem[] {
  return classificacaoCounts(rows.filter((r) => r.localOcorrencia === setor));
}

// ── Filtros / opções ──────────────────────────────────────────────────────────

/** Distinct months present in the data, sorted chronologically. */
export function collectMonths (rows: SegurancaRow[]): MonthOption[] {
  const seen = new Map<string, MonthOption>();
  for (const r of rows) {
    const key = monthKey(r.notifiedAt);
    if (!seen.has(key)) {
      seen.set(key, {
        year: r.notifiedAt.getFullYear(),
        month: r.notifiedAt.getMonth(),
        value: key,
        label: capitalize(format(r.notifiedAt, "MMMM/yyyy", { locale: ptBR })),
      });
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
}

/** Filters rows to the selected year-month; returns all when ALL_MONTHS. */
export function filterByMonth (rows: SegurancaRow[], value: string): SegurancaRow[] {
  if (!value || value === ALL_MONTHS) return rows;
  return rows.filter((r) => monthKey(r.notifiedAt) === value);
}

/** Sorted distinct sectors from both notificante and local de ocorrência. */
export function collectSectors (rows: SegurancaRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.setorNotificante) set.add(r.setorNotificante);
    if (r.localOcorrencia) set.add(r.localOcorrencia);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
