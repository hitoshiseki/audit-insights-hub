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
  const TARGET_ASPECT = 1.45; // content width / height → comfortably landscape
  const compactBoxes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-compact] [data-chart-box]")
  );
  const prevBoxStyle = compactBoxes.map((b) => ({ height: b.style.height, minHeight: b.style.minHeight }));

  // `[data-html2canvas-ignore]` elements (KPI cards, screen-only labels) are dropped
  // by html2canvas, so they must NOT count toward the print height budget. Hide them
  // for the measurement/capture (restored in `finally`) or they inflate the chrome
  // and squeeze the charts to nothing.
  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-html2canvas-ignore]"));
  const prevIgnoredDisplay = ignored.map((e) => e.style.display);
  for (const e of ignored) e.style.display = "none";

  if (compactBoxes.length > 0) {
    // Collapse the plot areas to measure everything else (header, footer, card
    // headers, paddings) at the forced capture width, then give every chart the same
    // print height so the two rows fit a landscape sheet. The height comes from the
    // real chrome, so it adapts to header size / bar count.
    for (const b of compactBoxes) {
      b.style.height = "0px";
      b.style.minHeight = "0px";
    }
    const chromeH = element.offsetHeight; // forces reflow
    const rows = Math.ceil(compactBoxes.length / 2);
    const perRow = Math.max(240, (CAPTURE_W / TARGET_ASPECT - chromeH) / rows);
    for (const b of compactBoxes) {
      b.style.height = `${perRow}px`;
      b.style.minHeight = "0px";
    }
  }

  try {
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
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    // Size the page to the capture's aspect ratio so the image fills the sheet
    // edge-to-edge — no paper margin, no letterbox. Width fixed to A4 landscape
    // (297 mm); height derived from the capture.
    const pageW = 297;
    const pageH = (canvas.height * pageW) / canvas.width;
    const pdf = new jsPDF({
      orientation: pageH > pageW ? "portrait" : "landscape",
      unit: "mm",
      format: [pageW, pageH],
    });

    pdf.addImage(img, "JPEG", 0, 0, pageW, pageH);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
    compactBoxes.forEach((b, i) => {
      b.style.height = prevBoxStyle[i].height;
      b.style.minHeight = prevBoxStyle[i].minHeight;
    });
    ignored.forEach((e, i) => { e.style.display = prevIgnoredDisplay[i]; });
  }
}
