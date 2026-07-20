// Types for the "Boletim de Segurança do Paciente" module.
// Source: incident-notification export (NOTIVISA-style) — a flat occurrence list,
// one row = one notification, mirroring the Boletim de Não Conformidades module.

export interface SegurancaRow {
  notifiedAt: Date;        // "Data da notificação" (dd/MM/yyyy)
  turno: string;           // "Turno" — Manhã | Tarde | Noite | Madrugada
  setorNotificante: string;// "Setor notificante" — notificações realizadas pelo setor
  localOcorrencia: string; // "Local de ocorrência" — incidentes por setor / recebidas
  taxonomia: string;       // "Taxonomia" (OMS) — tipo de incidente
  classificacao: string;   // "Classificação da Notificação" (normalizada) — gravidade
}

/** Generic count bucket for bar/pie charts (setor / taxonomia / turno → count). */
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

/** Detected reporting period (month/year of the first "Data da notificação"). */
export interface SegurancaPeriod {
  month: number;     // 0-11
  year: number;
  label: string;     // "Junho/2026"
}

export interface SegurancaMetrics {
  total: number;
  setoresEnvolvidos: number;    // distinct locais de ocorrência
  topTaxonomia: string;         // taxonomia OMS mais notificada
  topTaxonomiaCount: number;
  topSetor: string;             // local de ocorrência com mais incidentes
  topSetorCount: number;
}
