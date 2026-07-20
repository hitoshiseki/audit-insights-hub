import { describe, it, expect } from "vitest";
import type { BoletimRow } from "@/types/boletim";
import { collectMonths, filterByMonth, ALL_MONTHS } from "@/lib/aggregators-boletim";
import { hasSpreadsheetExt, SPREADSHEET_ACCEPT } from "@/lib/spreadsheet";
import { parseBrDate, detectDayFirst } from "@/lib/csv-parser-boletim";

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

describe("parseBrDate — survives spreadsheet round-trip formats", () => {
  it("keeps the original BR formats day-first", () => {
    expect(parseBrDate("01/06/2026 14:32:11")).toEqual(new Date(2026, 5, 1, 14, 32, 11));
    expect(parseBrDate("01/06/2026")).toEqual(new Date(2026, 5, 1));
  });

  it("accepts ISO formats a spreadsheet program may re-emit", () => {
    expect(parseBrDate("2026-06-01")).toEqual(new Date(2026, 5, 1));
    expect(parseBrDate("2026-06-01 14:32:11")).toEqual(new Date(2026, 5, 1, 14, 32, 11));
    expect(parseBrDate("01/06/26")).toEqual(new Date(2026, 5, 1));
  });

  it("reads slash dates day-first by default, month-first when told", () => {
    // default (day-first / BR): 6/1 → 6 Jan
    expect(parseBrDate("6/1/2026")).toEqual(new Date(2026, 0, 6));
    // month-first (US): 6/1 → 1 Jun, and 2-digit-year short dates
    expect(parseBrDate("6/1/2026", false)).toEqual(new Date(2026, 5, 1));
    expect(parseBrDate("6/30/26", false)).toEqual(new Date(2026, 5, 30));
    expect(parseBrDate("1/2/26", false)).toEqual(new Date(2026, 0, 2));
  });

  it("converts a bare Excel date serial", () => {
    // 46174 = 2026-06-01
    expect(parseBrDate("46174")).toEqual(new Date(2026, 5, 1));
  });

  it("returns null for empty or garbage input", () => {
    expect(parseBrDate("")).toBeNull();
    expect(parseBrDate("   ")).toBeNull();
    expect(parseBrDate("not a date")).toBeNull();
  });
});

describe("detectDayFirst — infers column date order", () => {
  it("defaults to day-first for BR and ambiguous-only columns", () => {
    expect(detectDayFirst(["30/06/2026", "01/02/2026"])).toBe(true);
    expect(detectDayFirst(["1/2/26", "3/4/26"])).toBe(true); // all ambiguous
    expect(detectDayFirst([])).toBe(true);
  });

  it("detects month-first when an unambiguous US date appears", () => {
    expect(detectDayFirst(["6/30/26", "1/2/26", "6/13/26"])).toBe(false);
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
