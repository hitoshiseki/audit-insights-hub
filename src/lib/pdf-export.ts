import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface PdfFilterInfo {
  startDate?: string;
  endDate?: string;
  sector?: string;
  totalFiltered: number;
}

export async function exportDashboardToPdf(
  contentEl: HTMLElement,
  scrollContainer: HTMLElement,
  filters?: PdfFilterInfo,
  fileName = "auditoria-dashboard.pdf"
) {
  // Temporarily expand the scroll container so html2canvas captures everything
  const origOverflow = scrollContainer.style.overflow;
  const origHeight = scrollContainer.style.height;
  const origMaxHeight = scrollContainer.style.maxHeight;
  scrollContainer.style.overflow = "visible";
  scrollContainer.style.height = "auto";
  scrollContainer.style.maxHeight = "none";

  // Also expand any parent with overflow hidden/auto
  const mainEl = scrollContainer.closest("main");
  const origMainOverflow = mainEl?.style.overflow || "";
  const origMainHeight = mainEl?.style.height || "";
  if (mainEl) {
    mainEl.style.overflow = "visible";
    mainEl.style.height = "auto";
  }

  // Wait for layout to settle
  await new Promise((r) => setTimeout(r, 200));

  const canvas = await html2canvas(contentEl, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: contentEl.scrollWidth,
    windowHeight: contentEl.scrollHeight,
  });

  // Restore original styles
  scrollContainer.style.overflow = origOverflow;
  scrollContainer.style.height = origHeight;
  scrollContainer.style.maxHeight = origMaxHeight;
  if (mainEl) {
    mainEl.style.overflow = origMainOverflow;
    mainEl.style.height = origMainHeight;
  }

  const imgData = canvas.toDataURL("image/jpeg", 0.85);

  const pdfWidth = 297; // A4 landscape mm
  const pdfHeight = 210;
  const margin = 8;
  const usableWidth = pdfWidth - margin * 2;
  const usableHeight = pdfHeight - margin * 2;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Add filter info on first page
  let headerHeight = 0;
  if (filters) {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Dashboard de Auditoria", margin, margin + 6);
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const filterParts: string[] = [];
    if (filters.startDate) filterParts.push(`De: ${filters.startDate}`);
    if (filters.endDate) filterParts.push(`Até: ${filters.endDate}`);
    if (filters.sector && filters.sector !== "__all__") filterParts.push(`Setor: ${filters.sector}`);
    filterParts.push(`Total de respostas: ${filters.totalFiltered}`);
    
    const filterText = filterParts.join("  |  ");
    pdf.text(filterText, margin, margin + 12);
    
    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, margin + 15, pdfWidth - margin, margin + 15);
    headerHeight = 18;
  }

  const ratio = usableWidth / canvas.width;
  const scaledHeight = canvas.height * ratio;

  // First page has less usable space due to header
  const firstPageUsable = usableHeight - headerHeight;
  let yOffset = 0;
  let page = 0;

  while (yOffset < scaledHeight) {
    if (page > 0) {
      pdf.addPage();
    }

    const currentUsable = page === 0 ? firstPageUsable : usableHeight;
    const imgY = page === 0 ? margin + headerHeight : margin;

    pdf.addImage(
      imgData,
      "JPEG",
      margin,
      imgY - yOffset,
      usableWidth,
      scaledHeight
    );

    // Clip: white out areas beyond the page
    if (yOffset + currentUsable < scaledHeight) {
      // Nothing to clip on this page, content continues
    }

    yOffset += currentUsable;
    page++;
  }

  pdf.save(fileName);
}
