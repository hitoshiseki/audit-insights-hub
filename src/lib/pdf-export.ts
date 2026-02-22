import { jsPDF } from "jspdf";

export interface PdfFilterInfo {
  startDate?: string;
  endDate?: string;
  sector?: string;
  totalFiltered: number;
}

export interface PdfTableRow {
  label: string;
  text: string;
  conformePercent: number;
  naoConformePercent: number;
  naoSeAplicaPercent: number;
  total: number;
  isAlert: boolean;
}

export interface PdfTableGroup {
  category: string;
  avgConforme: number;
  questions: PdfTableRow[];
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const USABLE_W = PAGE_W - MARGIN * 2; // 186 mm

// Column widths (must sum to USABLE_W = 186)
const W_LABEL   = 13;
const W_TEXT    = 93;
const W_CONF    = 22;
const W_NAO     = 25;
const W_NA      = 17;
const W_TOTAL   = 16;
// Sum: 13+93+22+25+17+16 = 186 ✓

const X_LABEL   = MARGIN;
const X_TEXT    = X_LABEL  + W_LABEL;
const X_CONF    = X_TEXT   + W_TEXT;
const X_NAO     = X_CONF   + W_CONF;
const X_NA      = X_NAO    + W_NAO;
const X_TOTAL   = X_NA     + W_NA;

const FS_TITLE  = 13;   // pt
const FS_META   = 8;    // pt
const FS_HEAD   = 7;    // pt – column headers
const FS_BODY   = 7.5;  // pt – question rows
const FS_CAT    = 8;    // pt – category header

// Row sizing
const PT_TO_MM  = 0.353;
const LINE_H    = FS_BODY * PT_TO_MM * 1.3; // ~3.45 mm per line at FS_BODY
const ROW_PAD   = 1.8;  // mm padding top + bottom inside each row
const MIN_ROW_H = LINE_H + ROW_PAD * 2;
const TABLE_HDR_H = 7.5;
const CAT_H     = 7.5;

// ─── Colors ───────────────────────────────────────────────────────────────────

const C_HDR_BG  : [number, number, number] = [55, 65, 81];    // dark gray header bg
const C_HDR_TXT : [number, number, number] = [255, 255, 255];
const C_CAT_BG  : [number, number, number] = [243, 244, 246]; // light gray category row
const C_CAT_TXT : [number, number, number] = [30, 30, 30];
const C_STRIPE  : [number, number, number] = [249, 250, 251]; // alternating row
const C_ALERT   : [number, number, number] = [255, 241, 241]; // alert row bg
const C_BORDER  : [number, number, number] = [209, 213, 219]; // row separators
const C_CONF    : [number, number, number] = [5, 150, 105];   // emerald
const C_NAO     : [number, number, number] = [220, 38, 38];   // red
const C_NA      : [number, number, number] = [107, 114, 128]; // gray
const C_TOTAL   : [number, number, number] = [75, 85, 99];
const C_QLABEL  : [number, number, number] = [107, 114, 128];
const C_QTEXT   : [number, number, number] = [30, 30, 30];

// ─── Main function ────────────────────────────────────────────────────────────

export function exportTableToPdf (
  groups: PdfTableGroup[],
  filters?: PdfFilterInfo,
  fileName = "auditoria-tabela.pdf"
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageBottom = PAGE_H - MARGIN;

  let y = MARGIN;

  // ── Helper: vertical text baseline for centering inside a band of height h ──
  function midBaseline (top: number, h: number, fs: number) {
    return top + h / 2 + (fs * PT_TO_MM) / 2 - 0.3;
  }

  // ── Draw outer table borders for a row ────────────────────────────────────
  function rowBorder (rowTop: number, rowH: number) {
    pdf.setDrawColor(...C_BORDER);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, rowTop + rowH, MARGIN + USABLE_W, rowTop + rowH);
  }

  // ── Draw column-header row ─────────────────────────────────────────────────
  function drawTableHeader () {
    pdf.setFillColor(...C_HDR_BG);
    pdf.rect(MARGIN, y, USABLE_W, TABLE_HDR_H, "F");

    pdf.setFontSize(FS_HEAD);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...C_HDR_TXT);

    const by = midBaseline(y, TABLE_HDR_H, FS_HEAD);
    pdf.text("#", X_LABEL + W_LABEL / 2, by, { align: "center" });
    pdf.text("Pergunta", X_TEXT + 1, by);
    pdf.text("Conforme",     X_CONF  + W_CONF  / 2, by, { align: "center" });
    pdf.text("Não Conforme", X_NAO   + W_NAO   / 2, by, { align: "center" });
    pdf.text("N/A",          X_NA    + W_NA    / 2, by, { align: "center" });
    pdf.text("Total",        X_TOTAL + W_TOTAL / 2, by, { align: "center" });

    pdf.setTextColor(0, 0, 0);
    y += TABLE_HDR_H;
  }

  // ── Check if `needed` mm fits on the current page; start new page if not ──
  function ensureFits (needed: number) {
    if (y + needed > pageBottom) {
      pdf.addPage();
      y = MARGIN;
      drawTableHeader();
    }
  }

  // ── Page 1: dashboard title + filter metadata ─────────────────────────────
  if (filters) {
    pdf.setFontSize(FS_TITLE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Dashboard de Auditoria", MARGIN, y + FS_TITLE * PT_TO_MM);
    y += FS_TITLE * PT_TO_MM + 3;

    pdf.setFontSize(FS_META);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...C_NA);
    const parts: string[] = [];
    if (filters.startDate) parts.push(`De: ${filters.startDate}`);
    if (filters.endDate)   parts.push(`Até: ${filters.endDate}`);
    if (filters.sector && filters.sector !== "__all__") parts.push(`Setor: ${filters.sector}`);
    parts.push(`Total: ${filters.totalFiltered} resposta${filters.totalFiltered !== 1 ? "s" : ""}`);
    pdf.text(parts.join("   |   "), MARGIN, y + FS_META * PT_TO_MM);
    y += FS_META * PT_TO_MM + 4;

    pdf.setDrawColor(...C_BORDER);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y, MARGIN + USABLE_W, y);
    y += 3;
  }

  drawTableHeader();

  // ── Render groups ─────────────────────────────────────────────────────────
  let rowIdx = 0;

  for (const group of groups) {
    // Keep category header + at least one question row together
    const firstRowTextLines = group.questions[0]
      ? pdf.setFontSize(FS_BODY) || pdf.splitTextToSize(group.questions[0].text, W_TEXT - 2)
      : [];
    const firstRowH = Math.max(MIN_ROW_H,
      (Array.isArray(firstRowTextLines) ? firstRowTextLines.length : 1) * LINE_H + ROW_PAD * 2);
    ensureFits(CAT_H + firstRowH);

    // Category header row
    pdf.setFillColor(...C_CAT_BG);
    pdf.rect(MARGIN, y, USABLE_W, CAT_H, "F");

    pdf.setFontSize(FS_CAT);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...C_CAT_TXT);
    pdf.text(group.category, MARGIN + 2, midBaseline(y, CAT_H, FS_CAT));

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FS_META);
    pdf.setTextColor(...C_NA);
    pdf.text(
      `média ${group.avgConforme.toFixed(1)}% conforme`,
      MARGIN + USABLE_W - 2,
      midBaseline(y, CAT_H, FS_META),
      { align: "right" }
    );

    pdf.setTextColor(0, 0, 0);
    rowBorder(y, CAT_H);
    y += CAT_H;

    // Question rows
    for (const q of group.questions) {
      pdf.setFontSize(FS_BODY);
      const textLines: string[] = pdf.splitTextToSize(q.text, W_TEXT - 2);
      const rowH = Math.max(MIN_ROW_H, textLines.length * LINE_H + ROW_PAD * 2);

      ensureFits(rowH);

      // Row background
      if (q.isAlert) {
        pdf.setFillColor(...C_ALERT);
        pdf.rect(MARGIN, y, USABLE_W, rowH, "F");
      } else if (rowIdx % 2 === 1) {
        pdf.setFillColor(...C_STRIPE);
        pdf.rect(MARGIN, y, USABLE_W, rowH, "F");
      }

      const by = y + ROW_PAD + LINE_H * 0.85; // baseline of first text line

      // # label
      pdf.setFontSize(FS_BODY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...C_QLABEL);
      pdf.text(q.label, X_LABEL + W_LABEL / 2, midBaseline(y, rowH, FS_BODY), { align: "center" });

      // Question text (may wrap)
      pdf.setTextColor(...C_QTEXT);
      pdf.text(textLines, X_TEXT + 1, by);

      // Dominant value determines bold
      const dom = Math.max(q.conformePercent, q.naoConformePercent, q.naoSeAplicaPercent);
      const pctBaseline = midBaseline(y, rowH, FS_BODY);

      // Conforme
      pdf.setFont("helvetica", q.conformePercent === dom && dom > 0 ? "bold" : "normal");
      pdf.setTextColor(...C_CONF);
      pdf.text(`${q.conformePercent.toFixed(1)}%`, X_CONF + W_CONF - 1, pctBaseline, { align: "right" });

      // Não Conforme
      pdf.setFont("helvetica", q.naoConformePercent === dom && dom > 0 ? "bold" : "normal");
      pdf.setTextColor(...C_NAO);
      pdf.text(`${q.naoConformePercent.toFixed(1)}%`, X_NAO + W_NAO - 1, pctBaseline, { align: "right" });

      // N/A
      pdf.setFont("helvetica", q.naoSeAplicaPercent === dom && dom > 0 ? "bold" : "normal");
      pdf.setTextColor(...C_NA);
      pdf.text(`${q.naoSeAplicaPercent.toFixed(1)}%`, X_NA + W_NA - 1, pctBaseline, { align: "right" });

      // Total
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...C_TOTAL);
      pdf.text(String(q.total), X_TOTAL + W_TOTAL / 2, pctBaseline, { align: "center" });

      pdf.setTextColor(0, 0, 0);
      rowBorder(y, rowH);
      y += rowH;
      rowIdx++;
    }

    y += 2; // breathing room between groups
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = (pdf as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...C_NA);
    pdf.text(
      `Página ${p} de ${totalPages}`,
      PAGE_W - MARGIN,
      PAGE_H - MARGIN / 2,
      { align: "right" }
    );
  }

  pdf.save(fileName);
}
