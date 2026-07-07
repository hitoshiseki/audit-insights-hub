import { describe, it, expect } from "vitest";
import type { BoletimRow } from "@/types/boletim";
import { collectMonths, filterByMonth, ALL_MONTHS } from "@/lib/aggregators-boletim";
import { hasSpreadsheetExt, SPREADSHEET_ACCEPT } from "@/lib/spreadsheet";

function row (createdAt: Date): BoletimRow {
  return {
    createdAt,
    setorNotificado: "A",
    setorNotificante: "B",
    interacao: "X",
    titulo: "",
  };
}

// A year-wide dataset spanning three months (jan, jan, mar, jun).
const rows: BoletimRow[] = [
  row(new Date(2026, 0, 5)),
  row(new Date(2026, 0, 20)),
  row(new Date(2026, 2, 3)),
  row(new Date(2026, 5, 15)),
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

describe("spreadsheet upload gate", () => {
  it("accepts csv/xls/xlsx and rejects other extensions", () => {
    expect(SPREADSHEET_ACCEPT).toBe(".csv,.xls,.xlsx");
    expect(hasSpreadsheetExt("OccurrenceList.csv")).toBe(true);
    expect(hasSpreadsheetExt("OccurrenceList-geral.xls")).toBe(true);
    expect(hasSpreadsheetExt("report.XLSX")).toBe(true);
    expect(hasSpreadsheetExt("notes.txt")).toBe(false);
    expect(hasSpreadsheetExt("data.json")).toBe(false);
  });
});
