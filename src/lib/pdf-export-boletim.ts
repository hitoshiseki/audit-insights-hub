import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Exports the Boletim report to a portrait A4 PDF. Each `[data-pdf-block]`
 * element (header, individual charts, footer) is captured on its own and laid
 * out top-to-bottom at full content width. A block that would not fit in the
 * remaining page space is pushed to the next page, so charts are never split.
 * Uses as many pages as needed.
 */
export async function exportBoletimToPdf (element: HTMLElement, fileName: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const margin = 10; // standard margin
  const contentW = pageW - margin * 2;
  const usableBottom = pageH - margin;
  const gap = 4; // vertical space between blocks (mm)

  const blocks = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-block]")
  );

  let y = margin;
  let first = true;

  for (const block of blocks) {
    const canvas = await html2canvas(block, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    let w = contentW;
    let h = (canvas.height * w) / canvas.width;

    // Safety: a single block taller than a full page is scaled down to fit.
    const maxBlockH = pageH - margin * 2;
    if (h > maxBlockH) {
      w = (canvas.width * maxBlockH) / canvas.height;
      h = maxBlockH;
    }

    // New page if this block would overflow the current one.
    if (!first && y + h > usableBottom) {
      pdf.addPage();
      y = margin;
    }

    const x = margin + (contentW - w) / 2; // center narrower blocks
    pdf.addImage(img, "JPEG", x, y, w, h);
    y += h + gap;
    first = false;
  }

  pdf.save(fileName);
}
