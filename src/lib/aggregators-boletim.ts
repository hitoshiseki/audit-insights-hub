import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  BoletimRow,
  CountItem,
  MonthCount,
  MonthOption,
  BoletimPeriod,
  BoletimMetrics,
} from "@/types/boletim";

/** Sentinel value for the "all months" option in the month filter. */
export const ALL_MONTHS = "__all__";

/** year-month key ("2026-06") used as the filter value for a row's date. */
function monthKey (d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Capitalizes the first letter (date-fns returns "junho/2026" lowercase). */
function capitalize (s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Reporting period taken from the first row's "Criado em" date. The export
 * always covers a single month, so no mode detection is needed.
 */
export function detectPeriod (rows: BoletimRow[]): BoletimPeriod | null {
  if (rows.length === 0) return null;

  const ref = rows[0].createdAt;
  const month = ref.getMonth();
  const year = ref.getFullYear();
  return {
    month,
    year,
    label: capitalize(format(ref, "MMMM/yyyy", { locale: ptBR })),
  };
}

/** Count of notifications per month (jan..dez) for the given year. */
export function notificationsByMonth (rows: BoletimRow[], year: number): MonthCount[] {
  const counts = new Array(12).fill(0);
  for (const r of rows) {
    if (r.createdAt.getFullYear() === year) counts[r.createdAt.getMonth()] += 1;
  }
  return counts.map((count, month) => ({
    month,
    label: format(new Date(year, month, 1), "MMM/yy", { locale: ptBR }),
    count,
  }));
}

/** Generic descending count-by helper. Empty labels are skipped. */
export function countBy (
  rows: BoletimRow[],
  key: (r: BoletimRow) => string
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

export function quebrasRecebidasPorSetor (rows: BoletimRow[]): CountItem[] {
  return countBy(rows, (r) => r.setorNotificado);
}

export function quebrasRealizadasPorSetor (rows: BoletimRow[]): CountItem[] {
  return countBy(rows, (r) => r.setorNotificante);
}

/** Top-N most notified process interactions. */
export function topInteracoes (rows: BoletimRow[], n = 12): CountItem[] {
  return countBy(rows, (r) => r.interacao).slice(0, n);
}

export function computeBoletimMetrics (rows: BoletimRow[]): BoletimMetrics {
  const setores = new Set(rows.map((r) => r.setorNotificado).filter(Boolean));
  const topInter = topInteracoes(rows, 1)[0];
  const topNotif = quebrasRealizadasPorSetor(rows)[0];
  return {
    total: rows.length,
    setoresNotificados: setores.size,
    topInteracao: topInter?.label ?? "—",
    topInteracaoCount: topInter?.count ?? 0,
    topNotificante: topNotif?.label ?? "—",
    topNotificanteCount: topNotif?.count ?? 0,
  };
}

// ── Por-setor views ─────────────────────────────────────────────────────────

/** Interações mais recebidas por um setor (filtra setorNotificado === setor). */
export function interacoesRecebidasPeloSetor (
  rows: BoletimRow[],
  setor: string,
  n = 12
): CountItem[] {
  const filtered = rows.filter((r) => r.setorNotificado === setor);
  return countBy(filtered, (r) => r.interacao).slice(0, n);
}

/** Total de notificações realizadas por um setor (como notificante). */
export function totalRealizadasPeloSetor (rows: BoletimRow[], setor: string): number {
  return rows.filter((r) => r.setorNotificante === setor).length;
}

/** Distinct months present in the data, sorted chronologically. */
export function collectMonths (rows: BoletimRow[]): MonthOption[] {
  const seen = new Map<string, MonthOption>();
  for (const r of rows) {
    const key = monthKey(r.createdAt);
    if (!seen.has(key)) {
      seen.set(key, {
        year: r.createdAt.getFullYear(),
        month: r.createdAt.getMonth(),
        value: key,
        label: capitalize(format(r.createdAt, "MMMM/yyyy", { locale: ptBR })),
      });
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
}

/** Filters rows to the selected year-month; returns all when ALL_MONTHS. */
export function filterByMonth (rows: BoletimRow[], value: string): BoletimRow[] {
  if (!value || value === ALL_MONTHS) return rows;
  return rows.filter((r) => monthKey(r.createdAt) === value);
}

/** Sorted distinct sectors from both notificado and notificante columns. */
export function collectSectors (rows: BoletimRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.setorNotificado) set.add(r.setorNotificado);
    if (r.setorNotificante) set.add(r.setorNotificante);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
