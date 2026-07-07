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
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();  // 297
  const pageH = pdf.internal.pageSize.getHeight(); // 210

  const margin = 8;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  // Force a wide, two-column layout for the duration of the capture.
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  element.style.width = `${CAPTURE_W}px`;
  element.style.maxWidth = "none";

  const grids = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-grid]"));
  const prevGridCols = grids.map((g) => g.style.gridTemplateColumns);
  for (const g of grids) g.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";

  try {
    const canvas = await html2canvas(element, {
      // Higher scale → sharper text when the report is printed and read from a wall.
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: CAPTURE_W,
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    // Fit the capture inside the page while keeping aspect ratio.
    let w = contentW;
    let h = (canvas.height * w) / canvas.width;
    if (h > contentH) {
      h = contentH;
      w = (canvas.width * h) / canvas.height;
    }

    const x = margin + (contentW - w) / 2;
    const y = margin + (contentH - h) / 2;
    pdf.addImage(img, "JPEG", x, y, w, h);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
  }
}
