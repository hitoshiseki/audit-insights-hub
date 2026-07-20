import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Fixed capture width (px) — forces a wide, landscape render regardless of the
// current viewport. Mirrors pdf-export-boletim.
const CAPTURE_W = 1500;

// A row tagged [data-pdf-shrink] gets this fraction of a normal chart row's
// height on export, so the top setorial row (month + count cards + turno) stays
// compact and the tables below it get the extra vertical space.
const SHRINK_WEIGHT = 0.65;

/**
 * Exports the Boletim de Segurança do Paciente report to a single landscape A4
 * page. Same capture engine as pdf-export-boletim (the Geral layout the user
 * validated), extended with a `[data-pdf-shrink]` row weight so a chosen row can
 * be made shorter than the rest. With no `[data-pdf-shrink]` present it behaves
 * identically to the NC export (equal split).
 */
export async function exportSegurancaToPdf (element: HTMLElement, fileName: string) {
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  element.style.width = `${CAPTURE_W}px`;
  element.style.maxWidth = "none";

  const grids = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-grid]"));
  const prevGridCols = grids.map((g) => g.style.gridTemplateColumns);
  for (const g of grids) g.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";

  // Exact A4-landscape capture box (px): width fixed → matching height keeps 297:210.
  const TARGET_H = (CAPTURE_W * 210) / 297;

  const compactBoxes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-compact] [data-chart-box]")
  );
  const prevBoxStyle = compactBoxes.map((b) => ({ height: b.style.height, minHeight: b.style.minHeight }));

  // Screen-only elements (KPI cards, toggles) are dropped by html2canvas, so hide
  // them for measurement/capture or they inflate the chrome budget.
  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-html2canvas-ignore]"));
  const prevIgnoredDisplay = ignored.map((e) => e.style.display);
  for (const e of ignored) e.style.display = "none";

  const prevHeight = element.style.height;
  const prevOverflow = element.style.overflow;

  if (compactBoxes.length > 0) {
    // Collapse every chart plot to measure the fixed chrome (header, footer,
    // ações box, card headers, count cards) at the forced capture width.
    for (const b of compactBoxes) {
      b.style.height = "0px";
      b.style.minHeight = "0px";
    }
    const chromeH = element.offsetHeight; // forces reflow

    const shrinkBoxes = compactBoxes.filter((b) => b.closest("[data-pdf-shrink]"));
    const normalBoxes = compactBoxes.filter((b) => !b.closest("[data-pdf-shrink]"));

    if (shrinkBoxes.length > 0) {
      // 1 shrunk visual row (weighted < 1) + N normal rows (2 charts per row).
      // Solve shrinkH + normalRows*normalH == TARGET − chrome, shrinkH = W*normalH.
      const normalRows = Math.max(1, Math.ceil(normalBoxes.length / 2));
      const normalH = Math.max(0, (TARGET_H - chromeH) / (SHRINK_WEIGHT + normalRows));
      const shrinkH = normalH * SHRINK_WEIGHT;
      for (const b of shrinkBoxes) { b.style.height = `${shrinkH}px`; b.style.minHeight = "0px"; }
      for (const b of normalBoxes) { b.style.height = `${normalH}px`; b.style.minHeight = "0px"; }
    } else {
      // No shrink row: equal split, 2 charts per row (Geral 2×2 grid).
      const rows = Math.max(1, Math.ceil(compactBoxes.length / 2));
      const perRow = Math.max(0, (TARGET_H - chromeH) / rows);
      for (const b of compactBoxes) { b.style.height = `${perRow}px`; b.style.minHeight = "0px"; }
    }

    element.style.height = `${TARGET_H}px`;
    element.style.overflow = "hidden";
  }

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Let Recharts' ResizeObserver re-measure at the forced width before capture.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: CAPTURE_W,
      windowHeight: TARGET_H,
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(img, "JPEG", 0, 0, 297, 210);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    element.style.height = prevHeight;
    element.style.overflow = prevOverflow;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
    compactBoxes.forEach((b, i) => {
      b.style.height = prevBoxStyle[i].height;
      b.style.minHeight = prevBoxStyle[i].minHeight;
    });
    ignored.forEach((e, i) => { e.style.display = prevIgnoredDisplay[i]; });
  }
}
