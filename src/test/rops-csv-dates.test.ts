import { describe, it, expect } from "vitest";
import { parseCSV } from "@/lib/csv-parser";
import { filterByDateRange } from "@/lib/date-helpers";

// Google Forms export in US locale: `M/d/yyyy H:mm:ss` timestamps and
// `M/d/yy` audit dates, as in "Auditoria de ROPS 29.10.csv".
const header =
  "Carimbo de data/hora;AUDITOR;Data da Auditoria;Setor Auditado;Liderança presente;IDENTIFICAÇÃO DO PACIENTE [1- Dois identificadores.]";
const lines = [
  "11/4/2025 18:26:56;A;9/17/25;UIT;Não;CONFORME",
  "7/13/2026 8:36:09;B;7/9/26;CTQ- UI;Sim;CONFORME",
  "10/27/2026 8:36:20;C;10/21/26;NIR;Sim;NÃO CONFORME",
  "9/1/2026 10:39:34;D;6/11/26;CME;Sim;CONFORME",
];

function csvFile (): File {
  return new File([[header, ...lines].join("\n")], "rops.csv", { type: "text/csv" });
}

describe("ROPS CSV with US-locale dates", () => {
  it("parses month-first dates with 2-digit years", async () => {
    const { rows } = await parseCSV(csvFile());
    expect(rows.map((r) => r.auditDate.toDateString())).toEqual([
      new Date(2025, 8, 17).toDateString(),
      new Date(2026, 6, 9).toDateString(),
      new Date(2026, 9, 21).toDateString(),
      new Date(2026, 5, 11).toDateString(),
    ]);
    expect(rows[0].timestamp.getFullYear()).toBe(2025);
    expect(rows[0].timestamp.getMonth()).toBe(10);
  });

  it("returns rows for the 01/07/2026–27/10/2026 range", async () => {
    const { rows } = await parseCSV(csvFile());
    const filtered = filterByDateRange(rows, new Date(2026, 6, 1), new Date(2026, 9, 27));
    expect(filtered.map((r) => r.sector)).toEqual(["CTQ- UI", "NIR"]);
  });
});
