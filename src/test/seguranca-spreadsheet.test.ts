import { describe, it, expect } from "vitest";
import type { SegurancaRow } from "@/types/seguranca";
import {
  collectMonths,
  filterByMonth,
  classificacaoCounts,
  turnoCounts,
  incidentesPorSetor,
  totalRealizadasPeloSetor,
  totalRecebidasPeloSetor,
  ALL_MONTHS,
} from "@/lib/aggregators-seguranca";
import { normalizeClassificacao } from "@/lib/csv-parser-seguranca";
import { hasSpreadsheetExt, SPREADSHEET_ACCEPT } from "@/lib/spreadsheet";

function row (overrides: Partial<SegurancaRow> = {}): SegurancaRow {
  return {
    notifiedAt: new Date(2026, 0, 5),
    turno: "Manhã",
    setorNotificante: "Pronto Atendimento",
    localOcorrencia: "UTI Adulto I",
    taxonomia: "Uso seguro de medicamentos",
    classificacao: "Quase evento",
    ...overrides,
  };
}

// A year-wide dataset spanning three months (jan, jan, mar, jun).
const rows: SegurancaRow[] = [
  row({ notifiedAt: new Date(2026, 0, 5) }),
  row({ notifiedAt: new Date(2026, 0, 20) }),
  row({ notifiedAt: new Date(2026, 2, 3) }),
  row({ notifiedAt: new Date(2026, 5, 15) }),
];

describe("month filter aggregators", () => {
  it("collectMonths returns distinct months, sorted chronologically", () => {
    const months = collectMonths(rows);
    expect(months.map((m) => m.value)).toEqual(["2026-01", "2026-03", "2026-06"]);
    expect(months[0].label).toBe("Janeiro/2026");
    expect(months[0].month).toBe(0);
  });

  it("filterByMonth narrows to the selected month and keeps all for ALL_MONTHS", () => {
    expect(filterByMonth(rows, "2026-01")).toHaveLength(2);
    expect(filterByMonth(rows, "2026-06")).toHaveLength(1);
    expect(filterByMonth(rows, ALL_MONTHS)).toHaveLength(rows.length);
    expect(filterByMonth(rows, "2026-12")).toHaveLength(0);
  });
});

describe("normalizeClassificacao — maps raw values to the gravity ladder", () => {
  it("relabels 'Incidente (circunstância…)' to 'Circunstância de risco'", () => {
    expect(normalizeClassificacao("Incidente (circunstância de risco ou condições inseguras)"))
      .toBe("Circunstância de risco");
  });

  it("maps the known raw classifications", () => {
    expect(normalizeClassificacao("Near miss")).toBe("Quase evento");
    expect(normalizeClassificacao("Incidente sem dano")).toBe("Incidente sem dano");
    expect(normalizeClassificacao("Evento adverso")).toBe("Evento adverso");
    expect(normalizeClassificacao("Outra natureza")).toBe("Outra natureza");
    expect(normalizeClassificacao("Queixa técnica")).toBe("Queixa técnica");
  });

  it("returns '' for empty and keeps unknown values as-is (trimmed)", () => {
    expect(normalizeClassificacao("")).toBe("");
    expect(normalizeClassificacao("  ")).toBe("");
    expect(normalizeClassificacao("  Algo novo  ")).toBe("Algo novo");
  });
});

describe("classification / turno / sector aggregators", () => {
  const data: SegurancaRow[] = [
    row({ classificacao: "Evento adverso", turno: "Noite", localOcorrencia: "PA", setorNotificante: "PA" }),
    row({ classificacao: "Circunstância de risco", turno: "Manhã", localOcorrencia: "PA", setorNotificante: "CC" }),
    row({ classificacao: "Quase evento", turno: "Manhã", localOcorrencia: "UTI", setorNotificante: "PA" }),
  ];

  it("classificacaoCounts orders by the fixed severity ladder", () => {
    const c = classificacaoCounts(data);
    expect(c.map((x) => x.label)).toEqual(["Circunstância de risco", "Quase evento", "Evento adverso"]);
    expect(c.every((x) => x.count === 1)).toBe(true);
  });

  it("turnoCounts orders Manhã→Tarde→Noite→Madrugada", () => {
    const t = turnoCounts(data);
    expect(t.map((x) => x.label)).toEqual(["Manhã", "Noite"]);
    expect(t[0].count).toBe(2);
  });

  it("incidentesPorSetor uses Local de ocorrência; realizadas/recebidas totals split correctly", () => {
    expect(incidentesPorSetor(data)[0]).toEqual({ label: "PA", count: 2 });
    expect(totalRecebidasPeloSetor(data, "PA")).toBe(2);   // localOcorrencia
    expect(totalRealizadasPeloSetor(data, "PA")).toBe(2);  // setorNotificante
    expect(totalRealizadasPeloSetor(data, "CC")).toBe(1);
  });
});

describe("spreadsheet upload gate", () => {
  it("accepts csv/xls/xlsx and rejects other extensions", () => {
    expect(SPREADSHEET_ACCEPT).toBe(".csv,.xls,.xlsx");
    expect(hasSpreadsheetExt("planilha_boletim_seguranca_paciente.xlsx")).toBe(true);
    expect(hasSpreadsheetExt("notes.txt")).toBe(false);
  });
});
