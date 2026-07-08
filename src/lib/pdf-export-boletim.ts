import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Fixed capture width (px). Forces a wide, landscape-shaped render regardless
// of the current viewport, so the report fills the page instead of stacking
// into a tall single column on narrow screens.
const CAPTURE_W = 1500;

/**
 * Exports the Boletim report to a single landscape A4 page. The whole report
 * element is captured as one image at a fixed wide width (charts forced to a
 * two-column grid) and scaled to fit within the page margins, so every block
 * (header, charts, footer) lands on one page. Elements marked
 * `[data-html2canvas-ignore]` are skipped by html2canvas.
 */
export async function exportBoletimToPdf (element: HTMLElement, fileName: string) {
  // Force a wide, two-column layout for the duration of the capture.
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  element.style.width = `${CAPTURE_W}px`;
  element.style.maxWidth = "none";

  const grids = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-grid]"));
  const prevGridCols = grids.map((g) => g.style.gridTemplateColumns);
  for (const g of grids) g.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";

  // Charts inside a `[data-pdf-compact]` block (the Geral 2×2 grid) stack in two
  // rows, making the capture taller than wide → a portrait sheet. Size each chart so
  // the whole capture lands in landscape (like the per-setor export, untouched — its
  // grid has no `data-pdf-compact`), AND so every card in a row ends the SAME total
  // height. Otherwise cards with taller titles stretch the grid row and the shorter
  // cards get wasted whitespace below their chart. We therefore give each card the
  // same target row height and set its chart box = rowH − that card's own chrome
  // (accent bar + title + padding). Screen layout untouched (restored in `finally`).
  // No-op when the selector is empty (the per-setor view).
  // Exact A4-landscape capture box (px): width already fixed to CAPTURE_W, so the
  // matching height is CAPTURE_W × 210/297. Sizing the DOM to exactly this aspect
  // (charts absorb the slack) means the canvas is captured at 297:210 and maps 1:1
  // onto the sheet — no stretching, no white margins, full render quality.
  const TARGET_H = (CAPTURE_W * 210) / 297; // ≈1060.6px
  const compactBoxes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-compact] [data-chart-box]")
  );
  // Charts inside a `[data-pdf-shrink-first]` block give up their space BEFORE the
  // compact charts do (per-setor: the top month chart shrinks so the two bottom
  // charts keep their full size). Empty on the Geral export.
  const shrinkFirstBoxes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-shrink-first] [data-chart-box]")
  );
  const allBoxes = [...compactBoxes, ...shrinkFirstBoxes];
  const prevBoxStyle = allBoxes.map((b) => ({ height: b.style.height, minHeight: b.style.minHeight }));

  // `[data-html2canvas-ignore]` elements (KPI cards, screen-only labels) are dropped
  // by html2canvas, so they must NOT count toward the print height budget. Hide them
  // for the measurement/capture (restored in `finally`) or they inflate the chrome
  // and squeeze the charts to nothing.
  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-html2canvas-ignore]"));
  const prevIgnoredDisplay = ignored.map((e) => e.style.display);
  for (const e of ignored) e.style.display = "none";

  // Pin the report to the exact A4-landscape box so the capture aspect is precisely
  // 297:210 (restored in `finally`).
  const prevHeight = element.style.height;
  const prevOverflow = element.style.overflow;

  if (shrinkFirstBoxes.length > 0) {
    // Per-setor: the top chart shrinks first so the bottom charts stay full size.
    // The top chart shares its grid row with the (taller) KPI count cards, so
    // measuring it collapsed hides how much it must grow to actually push the page
    // height — the cards pin the row until the chart overtakes them, leaving white
    // at the bottom. Instead PROBE it at a large height so it dominates the row;
    // then `base` = height of everything else (chrome + full-size bottom charts),
    // and `topH = TARGET_H − base` fills the sheet exactly (absorption included).
    const MIN_TOP = 200;
    const MIN_BOTTOM = 140;
    const PROBE = 4000;
    const topRows = Math.ceil(shrinkFirstBoxes.length / 2);
    for (const b of shrinkFirstBoxes) {
      b.style.height = `${PROBE}px`;
      b.style.minHeight = "0px";
    }
    const base = element.offsetHeight - PROBE * topRows; // forces reflow
    // No overshoot: natural height must land exactly on TARGET_H so the footer
    // band (navy "Núcleo de Qualidade") isn't clipped by the overflow:hidden box.
    let topH = (TARGET_H - base) / topRows;

    if (topH < MIN_TOP) {
      // Bottom charts too tall: floor the top so it never disappears and reclaim
      // the deficit by shrinking the bottom charts just enough to fit.
      const deficit = (MIN_TOP - topH) * topRows;
      const bottomRows = Math.max(1, Math.ceil(compactBoxes.length / 2));
      const shrinkPerRow = deficit / bottomRows;
      for (const b of compactBoxes) {
        const cur = b.offsetHeight; // current full height
        b.style.height = `${Math.max(MIN_BOTTOM, cur - shrinkPerRow)}px`;
        b.style.minHeight = "0px";
      }
      topH = MIN_TOP;
    }
    for (const b of shrinkFirstBoxes) {
      b.style.height = `${Math.max(0, topH)}px`;
      b.style.minHeight = "0px";
    }
    element.style.height = `${TARGET_H}px`;
    element.style.overflow = "hidden";
  } else if (compactBoxes.length > 0) {
    // Geral: collapse the plot areas to measure everything else (header, footer,
    // card headers, paddings) at the forced capture width, then hand every chart the
    // same leftover height so chrome + charts == TARGET_H. Adapts to header size /
    // bar count.
    for (const b of compactBoxes) {
      b.style.height = "0px";
      b.style.minHeight = "0px";
    }
    const chromeH = element.offsetHeight; // forces reflow
    const rows = Math.ceil(compactBoxes.length / 2);
    const perRow = Math.max(0, (TARGET_H - chromeH) / rows);
    for (const b of compactBoxes) {
      b.style.height = `${perRow}px`;
      b.style.minHeight = "0px";
    }
    element.style.height = `${TARGET_H}px`;
    element.style.overflow = "hidden";
  }

  try {
    // Ensure webfonts are fully loaded before capturing. If html2canvas snapshots
    // while a font is still swapping, it measures glyph advances with the fallback
    // font and packs letters too close (they visually overlap), most visible on the
    // bold header pills ("Período: …"). Waiting for `document.fonts.ready` makes the
    // capture use the real font metrics.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    // Recharts' ResponsiveContainer re-measures its width via an async
    // ResizeObserver. After forcing the report to CAPTURE_W the charts' SVGs
    // still hold their old (screen) width; capturing now would freeze them
    // narrower than their print cell. Wait for the observer to fire so every
    // chart re-renders at full cell width before html2canvas snapshots it.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    const canvas = await html2canvas(element, {
      // Higher scale → sharper text when the report is printed and read from a wall.
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: CAPTURE_W,
      windowHeight: TARGET_H,
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    // Single, exact A4 landscape sheet (297×210 mm). The DOM was sized to the A4
    // aspect above, so the capture is already 297:210 and maps 1:1 onto the full
    // page — no stretching (quality preserved) and no white margins.
    const pageW = 297;
    const pageH = 210;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    pdf.addImage(img, "JPEG", 0, 0, pageW, pageH);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    element.style.height = prevHeight;
    element.style.overflow = prevOverflow;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
    allBoxes.forEach((b, i) => {
      b.style.height = prevBoxStyle[i].height;
      b.style.minHeight = prevBoxStyle[i].minHeight;
    });
    ignored.forEach((e, i) => { e.style.display = prevIgnoredDisplay[i]; });
  }
}
