import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Fixed capture width (px). Forces a wide, landscape-shaped render regardless
// of the current viewport, so the report fills the page instead of stacking
// into a tall single column on narrow screens.
const CAPTURE_W = 1500;

// Altura fixa (px) de cada linha visual do relatório. É a altura TOTAL da linha
// (card inteiro: barra + cabeçalho + conteúdo), não só a área de plotagem. Ajuste
// à mão — a página se encaixa por proporção, sem distorcer, então esses números
// são o controle direto do layout (não há mais cálculo automático).
const GERAL_ROW_1_HEIGHT = 363;     // Geral: mês + setores recebidas
const GERAL_ROW_2_HEIGHT = 363;     // Geral: quebras + setores realizadas
const SETORIAL_ROW_1_HEIGHT = 340;  // Setorial: mês + cards recebidas/realizadas
const SETORIAL_ROW_2_HEIGHT = 360;  // Setorial: quebras recebidas / realizadas

/**
 * Exports the Boletim report to a single landscape A4 page. The whole report
 * element is captured as one image at a fixed wide width (charts forced to a
 * two-column grid). A altura de cada linha de gráficos é definida à mão pelas
 * constantes acima (não há solve automático): fixamos a altura na própria grade
 * (grid-template-rows) e deixamos as células/cards esticarem para preenchê-la —
 * inclusive os CountCards, que não têm chart-box. A imagem é encaixada no A4
 * preservando a proporção (centralizada, sem distorcer). Elements marked
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

  // `[data-html2canvas-ignore]` elements (KPI cards, screen-only labels) are dropped
  // by html2canvas, so hide them for the capture or they inflate the layout.
  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-html2canvas-ignore]"));
  const prevIgnoredDisplay = ignored.map((e) => e.style.display);
  for (const e of ignored) e.style.display = "none";

  // A vista setorial é identificada pela linha [data-pdf-shrink-first] (só existe
  // nela); a Geral não tem nenhuma. Cada vista mapeia seus containers de linha:
  //   • Geral:    um único [data-pdf-compact] (grade 2×2) → duas alturas.
  //   • Setorial: Linha 1 = [data-pdf-shrink-first]; Linha 2 = [data-pdf-grid]
  //     (na vista setorial a grade Geral não é renderizada) → uma altura cada.
  const isSetorial = !!element.querySelector("[data-pdf-shrink-first]");
  const rowGroups: { container: HTMLElement; heights: number[] }[] = [];
  if (isSetorial) {
    const l1 = element.querySelector<HTMLElement>("[data-pdf-shrink-first]");
    const l2 = element.querySelector<HTMLElement>("[data-pdf-grid]");
    if (l1) rowGroups.push({ container: l1, heights: [SETORIAL_ROW_1_HEIGHT] });
    if (l2) rowGroups.push({ container: l2, heights: [SETORIAL_ROW_2_HEIGHT] });
  } else {
    const g = element.querySelector<HTMLElement>("[data-pdf-compact]");
    if (g) rowGroups.push({ container: g, heights: [GERAL_ROW_1_HEIGHT, GERAL_ROW_2_HEIGHT] });
  }

  // Fixa a altura das linhas na grade de cada container.
  const containers = rowGroups.map((g) => g.container);
  const prevContainerRows = containers.map((c) => c.style.gridTemplateRows);
  rowGroups.forEach(({ container, heights }) => {
    container.style.gridTemplateRows = heights.map((h) => `${h}px`).join(" ");
  });

  // Chart-boxes preenchem a célula (altura vem da linha da grade, não deles); o
  // CardContent que os envolve vira flex-1 para essa altura de 100% resolver.
  const boxes = rowGroups.flatMap(({ container }) =>
    Array.from(container.querySelectorAll<HTMLElement>("[data-chart-box]"))
  );
  const prevBoxStyle = boxes.map((b) => ({ height: b.style.height, minHeight: b.style.minHeight }));
  const boxContents = boxes.map((b) => b.parentElement as HTMLElement | null);
  const prevContentStyle = boxContents.map((c) => (c ? { flex: c.style.flex, minHeight: c.style.minHeight } : null));
  boxes.forEach((b) => {
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

    // Sem windowHeight: o html2canvas captura a altura natural do conteúdo (soma
    // das linhas + chrome), sem cortar.
    const canvas = await html2canvas(element, {
      // Higher scale → sharper text when the report is printed and read from a wall.
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
    if (import.meta.env.DEV) {
      const a4 = PAGE_W / PAGE_H; // 297/210 ≈ 1.4143
      const idealH = (CAPTURE_W * PAGE_H) / PAGE_W; // altura natural p/ encher o A4

      console.info(
        `[pdf-boletim] canvas ${canvas.width}×${canvas.height}px aspecto=${canvasAspect.toFixed(3)} ` +
        `(A4 landscape=${a4.toFixed(3)}) | altura natural=${(canvas.height / 3).toFixed(0)}px ` +
        `(ideal ${idealH.toFixed(0)}px) | imagem ${w.toFixed(1)}×${h.toFixed(1)}mm de ${PAGE_W}×${PAGE_H} ` +
        `→ largura ${w >= PAGE_W - 0.5 ? "ENCHE" : "NÃO enche"} o A4`
      );
    }
    pdf.addImage(img, "JPEG", x, y, w, h);
    pdf.save(fileName);
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    grids.forEach((g, i) => { g.style.gridTemplateColumns = prevGridCols[i]; });
    containers.forEach((c, i) => { c.style.gridTemplateRows = prevContainerRows[i]; });
    boxes.forEach((b, i) => {
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
