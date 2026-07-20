import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Fixed capture width (px) — forces a wide, landscape render regardless of the
// current viewport. Mirrors pdf-export-boletim.
const CAPTURE_W = 1500;

// Altura fixa (px) da área de plotagem de cada linha de conteúdo. Ajuste à mão —
// a página se encaixa por proporção, sem distorcer, então esses números são o
// controle direto do layout (não há mais cálculo automático). O cabeçalho/barra
// do card fica POR CIMA da área de plotagem, então a linha visual fica um pouco
// mais alta do que o valor aqui.
const GERAL_ROW_1_HEIGHT = 306;     // Geral: mês + setores recebidas
const GERAL_ROW_2_HEIGHT = 304;     // Geral: quebras + setores realizadas
const SETORIAL_ROW_1_HEIGHT = 316;  // Setorial: mês + cards recebidas/realizadas
const SETORIAL_ROW_2_HEIGHT = 276;  // Setorial: quebras recebidas / realizadas

/**
 * Exports the Boletim de Segurança do Paciente report to a single landscape A4
 * page. Same capture engine as pdf-export-boletim, but the height of each chart
 * row is set by hand via the constants above (não há solve automático): as duas
 * células de gráfico de cada linha visual recebem a altura da sua linha, e os
 * cards/textos vizinhos se adequam à altura da linha da grade. A imagem é
 * encaixada no A4 preservando a proporção (centralizada, sem distorcer).
 */
export async function exportSegurancaToPdf (element: HTMLElement, fileName: string) {
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  element.style.width = `${CAPTURE_W}px`;
  element.style.maxWidth = "none";

  const grids = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-grid]"));
  const prevGridCols = grids.map((g) => g.style.gridTemplateColumns);
  for (const g of grids) g.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";

  const compactBoxes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-compact] [data-chart-box]")
  );
  const prevBoxStyle = compactBoxes.map((b) => ({ height: b.style.height, minHeight: b.style.minHeight }));
  // Cada chart-box vive dentro de um CardContent — precisamos que ele estique
  // (flex-1) para o box de 100% resolver contra a altura da linha.
  const boxContents = compactBoxes.map((b) => b.parentElement as HTMLElement | null);
  const prevContentStyle = boxContents.map((c) => (c ? { flex: c.style.flex, minHeight: c.style.minHeight } : null));

  // Screen-only elements (KPI cards, toggles) are dropped by html2canvas, so hide
  // them for capture or they inflate the layout.
  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-html2canvas-ignore]"));
  const prevIgnoredDisplay = ignored.map((e) => e.style.display);
  for (const e of ignored) e.style.display = "none";

  // A vista setorial é identificada pela linha [data-pdf-shrink] (só existe nela);
  // a Geral não tem nenhuma. Cada vista usa seu próprio par de alturas.
  const isSetorial = !!element.querySelector("[data-pdf-shrink]");
  const rowHeights = isSetorial
    ? [SETORIAL_ROW_1_HEIGHT, SETORIAL_ROW_2_HEIGHT]
    : [GERAL_ROW_1_HEIGHT, GERAL_ROW_2_HEIGHT];

  // A altura da constante é a altura TOTAL da linha visual (card inteiro: barra +
  // cabeçalho + conteúdo), não só a área de plotagem. Para isso fixamos a altura
  // da linha na própria grade (grid-template-rows) e deixamos as células/cards
  // esticarem para preenchê-la — inclusive os CountCards, que não têm chart-box.
  //   • Setorial: cada [data-pdf-compact] é uma linha visual → 1 altura por grade.
  //   • Geral: um único [data-pdf-compact] com 2 linhas → as duas alturas.
  const containers = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-compact]"));
  const prevContainerRows = containers.map((c) => c.style.gridTemplateRows);
  containers.forEach((c, idx) => {
    const rows = isSetorial
      ? [rowHeights[Math.min(idx, rowHeights.length - 1)]]
      : rowHeights;
    c.style.gridTemplateRows = rows.map((h) => `${h}px`).join(" ");
  });

  // Chart-boxes preenchem a célula (altura vem da linha da grade, não deles); o
  // CardContent que os envolve vira flex-1 para essa altura de 100% resolver.
  compactBoxes.forEach((b) => {
    b.style.height = "100%";
    b.style.minHeight = "0px";
  });
  boxContents.forEach((c) => {
    if (c) {
      c.style.flex = "1 1 0%";
      c.style.minHeight = "0px";
    }
  });

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Let Recharts' ResizeObserver re-measure at the forced width before capture.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    // Sem windowHeight: o html2canvas captura a altura natural do conteúdo (soma
    // das linhas + chrome), sem cortar.
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: CAPTURE_W,
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    // Encaixa a imagem no A4 preservando a proporção — nunca distorce. Ancorada
    // EMBAIXO (não centralizada): a faixa branca residual (o conteúdo quase nunca
    // tem exatamente a proporção do A4) fica no TOPO, onde some contra o cabeçalho
    // branco (bg-card). Se centralizasse, sobraria uma faixa branca embaixo do
    // rodapé, visível porque a barra navy do rodapé é escura.
    const PAGE_W = 297;
    const PAGE_H = 210;
    const canvasAspect = canvas.width / canvas.height;
    let w = PAGE_W;
    let h = PAGE_W / canvasAspect;
    let x = 0;
    let y = PAGE_H - h;
    if (h > PAGE_H) {
      h = PAGE_H;
      w = PAGE_H * canvasAspect;
      x = (PAGE_W - w) / 2;
      y = 0;
    }
    pdf.addImage(img, "JPEG", x, y, w, h);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
    containers.forEach((c, i) => { c.style.gridTemplateRows = prevContainerRows[i]; });
    compactBoxes.forEach((b, i) => {
      b.style.height = prevBoxStyle[i].height;
      b.style.minHeight = prevBoxStyle[i].minHeight;
    });
    boxContents.forEach((c, i) => {
      const prev = prevContentStyle[i];
      if (c && prev) {
        c.style.flex = prev.flex;
        c.style.minHeight = prev.minHeight;
      }
    });
    ignored.forEach((e, i) => { e.style.display = prevIgnoredDisplay[i]; });
  }
}
