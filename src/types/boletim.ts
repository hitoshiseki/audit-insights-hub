// Types for the "Boletim de Não Conformidades" module.
// Source: Interact export (OccurrenceList) — a flat occurrence list, NOT a
// question/response audit like the other domains.

export interface BoletimRow {
  createdAt: Date;          // "Criado em" (dd/MM/yyyy)
  setorNotificado: string;  // "Setor notificado" — quebras recebidas
  setorNotificante: string; // "Setor notificante" — quebras realizadas
  interacao: string;        // "Interação de Processo" (long text) — "Outros" when none
  titulo: string;           // "Título"
}

/** Generic count bucket for bar charts (setor / interação → count). */
export interface CountItem {
  label: string;
  count: number;
}

/** One month of the reference year for the "notificações por data" chart. */
export interface MonthCount {
  month: number;     // 0-11
  label: string;     // "jan/26"
  count: number;
}

/** One selectable month present in the loaded data (for the month filter). */
export interface MonthOption {
  year: number;
  month: number;     // 0-11
  value: string;     // "2026-06" (year-month key, "__all__" reserved for "all")
  label: string;     // "Junho/2026"
}

/** Detected reporting period (most frequent month/year of "Criado em"). */
export interface BoletimPeriod {
  month: number;     // 0-11
  year: number;
  label: string;     // "Junho/2026"
}

export interface BoletimMetrics {
  total: number;
  setoresNotificados: number;   // distinct count
  topInteracao: string;         // most notified Interação de Processo
  topInteracaoCount: number;
  topNotificante: string;       // sector that most realized notifications
  topNotificanteCount: number;
}
