import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportDashboardToPdf(
  contentEl: HTMLElement,
  fileName = "auditoria-dashboard.pdf"
) {
  const canvas = await html2canvas(contentEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = 297; // A4 landscape width in mm
  const pdfHeight = 210; // A4 landscape height in mm
  const ratio = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let yOffset = 0;
  let page = 0;

  while (yOffset < scaledHeight) {
    if (page > 0) pdf.addPage();

    pdf.addImage(imgData, "PNG", 0, -yOffset, pdfWidth, scaledHeight);
    yOffset += pdfHeight;
    page++;
  }

  pdf.save(fileName);
}
