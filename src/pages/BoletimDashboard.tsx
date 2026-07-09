import { useMemo, useRef, useState } from "react";
import { FileWarning, ClipboardList, Building2, AlertTriangle, Send, FileDown } from "lucide-react";
import { CsvUpload } from "@/components/CsvUpload";
import { EmptyFilterState } from "@/components/EmptyFilterState";
import { NavMenuButton } from "@/components/AppNav";
import { HeaderActionsMenu } from "@/components/HeaderActionsMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { exportBoletimToPdf } from "@/lib/pdf-export-boletim";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/contexts/AppDataContext";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  detectPeriod,
  notificationsByMonth,
  quebrasRecebidasPorSetor,
  quebrasRealizadasPorSetor,
  topInteracoes,
  computeBoletimMetrics,
  collectSectors,
  collectMonths,
  filterByMonth,
  ALL_MONTHS,
  interacoesRecebidasPeloSetor,
  interacoesRealizadasPeloSetor,
  totalRecebidasPeloSetor,
  totalRealizadasPeloSetor,
} from "@/lib/aggregators-boletim";
import {
  NotificationsByMonthChart,
  VerticalCountChart,
  RankedSectorTable,
  HorizontalCountChart,
  CountCard,
  BOLETIM_COLORS,
} from "@/components/boletim/BoletimCharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import logoPdf from "@/assets/logo-pdf.png";

const FOOTER_TEXT =
  "A notificação de NÃO CONFORMIDADE deve ser realizada em decorrência do descumprimento de requisitos descritos em normas, procedimentos, manuais, instruções de trabalho que estejam alinhados em contrato e interações de processos entre as áreas. Após a sua notificação, o gestor do setor notificado irá analisar e traçar plano de ação com aprovação da diretoria. O feedback das análises das notificações são acompanhadas pelo gestor do setor notificantes via Interact.";

// Solid light navy for header pills — kept solid (not translucent) so html2canvas-pro
// paints it reliably in the printed header.
const PILL_BG = "hsl(219, 45%, 95%)";

// Max sectors listed in the ranked table view (top N by count). Adjust to taste.
const SECTOR_TABLE_MAX_ROWS = 20;
// Number of side-by-side columns in the ranked table view.
const SECTOR_TABLE_COLUMNS = 2;

// Translucent tint of a solid hsl color. Only used on screen-only elements
// (KPI cards are data-html2canvas-ignore), so hsla is safe here.
const tint = (color: string, alpha: number) =>
  color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
interface KpiCard {
  label: string;
  value: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  accent: string;
}

export default function BoletimDashboard () {
  const { boletim, boletimLoading, boletimError, loadBoletim, clearAllData } = useAppData();
  const rows = useMemo(() => boletim?.rows ?? [], [boletim]);
  const isLoaded = boletim !== null;
  const fileName = boletim?.fileName ?? "";

  const { searchParams, setParam, selectedSector, setSector } = useDashboardFilters();
  const isGeral = !selectedSector || selectedSector === "__all__";

  const selectedMonth = searchParams.get("month") || ALL_MONTHS;
  const monthOptions = useMemo(() => collectMonths(rows), [rows]);
  const selectedMonthOption = useMemo(
    () => monthOptions.find((m) => m.value === selectedMonth) ?? null,
    [monthOptions, selectedMonth]
  );

  // Month filter applies to every KPI/chart except the "por mês" bar chart,
  // which always spans the full year (see `byMonth` below).
  const filteredRows = useMemo(
    () => filterByMonth(rows, selectedMonth),
    [rows, selectedMonth]
  );

  const period = useMemo(() => detectPeriod(rows), [rows]);
  const year = period?.year ?? new Date().getFullYear();
  const periodLabel = selectedMonthOption ? selectedMonthOption.label : `Ano ${year}`;
  const sectors = useMemo(() => collectSectors(rows), [rows]);
  const sectorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      if (r.setorNotificado) map.set(r.setorNotificado, (map.get(r.setorNotificado) || 0) + 1);
      if (r.setorNotificante && r.setorNotificante !== r.setorNotificado) {
        map.set(r.setorNotificante, (map.get(r.setorNotificante) || 0) + 1);
      }
    }
    return map;
  }, [filteredRows]);

  // ── Geral aggregations (respect the month filter) ──
  const metrics = useMemo(() => computeBoletimMetrics(filteredRows), [filteredRows]);
  // Always full year; the selected month is only highlighted, not filtered out.
  const byMonth = useMemo(() => notificationsByMonth(rows, year), [rows, year]);
  const recebidas = useMemo(() => quebrasRecebidasPorSetor(filteredRows), [filteredRows]);
  const realizadas = useMemo(() => quebrasRealizadasPorSetor(filteredRows), [filteredRows]);
  const topInter = useMemo(() => topInteracoes(filteredRows, 12), [filteredRows]);

  // Toggle: setores por quebra como gráfico de barras (padrão) ou tabela ranqueada.
  const [sectorView, setSectorView] = useState<"chart" | "table">("table");

  // ── Por-setor aggregations (respect the month filter) ──
  const setorRecebidas = useMemo(
    () => (isGeral ? [] : interacoesRecebidasPeloSetor(filteredRows, selectedSector, 12)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorRealizadas = useMemo(
    () => (isGeral ? [] : interacoesRealizadasPeloSetor(filteredRows, selectedSector, 12)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorRecebidasTotal = useMemo(
    () => (isGeral ? 0 : totalRecebidasPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorRealizadasTotal = useMemo(
    () => (isGeral ? 0 : totalRealizadasPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorHasData = useMemo(
    () => !isGeral && filteredRows.some((r) => r.setorNotificado === selectedSector || r.setorNotificante === selectedSector),
    [filteredRows, selectedSector, isGeral]
  );

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const suffix = isGeral ? "geral" : selectedSector.toLowerCase().replace(/\s+/g, "-");
      const periodo = periodLabel.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
      await exportBoletimToPdf(reportRef.current, `boletim-nao-conformidades-${suffix}-${periodo}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  };

  const kpis: KpiCard[] = [
    { label: "Total de notificações", value: String(metrics.total), icon: ClipboardList, accent: BOLETIM_COLORS.navy },
    { label: "Setores notificados", value: String(metrics.setoresNotificados), icon: Building2, accent: BOLETIM_COLORS.olive },
    {
      label: "Interação mais notificada",
      value: metrics.topInteracao,
      subtitle: `${metrics.topInteracaoCount} notificações`,
      icon: AlertTriangle,
      accent: BOLETIM_COLORS.red,
    },
    {
      label: "Setor + notificante",
      value: metrics.topNotificante,
      subtitle: `${metrics.topNotificanteCount} notificações`,
      icon: Send,
      accent: BOLETIM_COLORS.orange,
    },
  ];

  // ── Upload / empty state ──
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileWarning className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Boletim de Não Conformidades</h1>
            <p className="mt-2 text-muted-foreground">
              Faça upload da exportação <strong>OccurrenceList</strong> (CSV, XLS ou XLSX) do
              Interact para começar a análise
            </p>
          </div>
          <CsvUpload
            onFileLoaded={loadBoletim}
            isLoading={boletimLoading}
            fileName={fileName}
            error={boletimError}
          />
        </div>
      </div>
    );
  }

  // Shared Gráfico ↔ Tabela switch, reused in the Geral and per-setor views.
  // Screen-only (data-html2canvas-ignore) so it never lands in the PDF.
  const sectorToggle = (
    <div data-html2canvas-ignore className="flex justify-end">
      <ToggleGroup
        type="single"
        value={sectorView}
        onValueChange={(v) => v && setSectorView(v as "chart" | "table")}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="chart" aria-label="Ver como gráfico">
          Gráfico
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label="Ver como tabela">
          Tabela
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Thin app bar */}
      <div
        data-html2canvas-ignore
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-2 backdrop-blur-sm lg:px-6"
      >
        <NavMenuButton />
        <CsvUpload
          onFileLoaded={loadBoletim}
          isLoading={boletimLoading}
          fileName={fileName}
          error={boletimError}
        />
        <div className="ml-auto flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={(v) => setParam("month", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ano inteiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>Ano inteiro</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSector} onValueChange={setSector}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Geral" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                <span className="flex w-full items-center justify-between gap-3">
                  <span>Geral</span>
                  <span className="text-xs text-muted-foreground">{filteredRows.length}</span>
                </span>
              </SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>{s}</span>
                    <span className="text-xs text-muted-foreground">{sectorCounts.get(s) ?? 0}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="bg-green-600 text-white hover:bg-green-800 hover:text-white"
          >
            <FileDown className="mr-1 h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar PDF"}
          </Button>
          <HeaderActionsMenu onClearData={clearAllData} />
        </div>
      </div>

      <div ref={reportRef} className="flex flex-col bg-background">
        {/* Report header */}
        <header data-pdf-block className="border-b border-border bg-card">
          <div className="flex flex-col items-center px-4 text-center lg:px-8 gap-2 pb-4 pt-2">
            <img
              src={logoPdf}
              alt="Logo institucional"
              className={`w-auto object-contain ${isGeral ? "h-11" : "h-16"}`}
            />
            <h1
              className="font-extrabold uppercase tracking-tight text-3xl sm:text-4xl lg:text-5xl"
              style={{ color: BOLETIM_COLORS.navy }}
            >
              Boletim de Não Conformidades
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span
                className={`rounded-full font-bold ${isGeral ? "px-3 py-1 text-base" : "px-4 py-1.5 text-xl"}`}
                style={{ color: BOLETIM_COLORS.navy, backgroundColor: PILL_BG }}
              >
                Período: {periodLabel}
              </span>
              {!isGeral && (
                <span
                  className="rounded-full px-4 py-1.5 text-xl font-bold"
                  style={{ color: BOLETIM_COLORS.navy, backgroundColor: PILL_BG }}
                >
                  Setor: {selectedSector}
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full" style={{ backgroundColor: BOLETIM_COLORS.orange }} />
        </header>

        {/* Content */}
        <main className={`flex-1 ${isGeral ? "space-y-2 p-3 lg:p-2" : "space-y-2 p-2 pb-2 lg:p-2 lg:pb-2"}`}>
          {isGeral ? (
            <>
              <p data-html2canvas-ignore className="text-lg font-bold text-foreground">Boletim Geral</p>

              {/* KPI cards */}
              <div data-html2canvas-ignore className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((c) => (
                  <Card key={c.label} className="animate-fade-in overflow-hidden border-border/60 shadow-sm">
                    <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: tint(c.accent, 0.12) }}>
                        <c.icon className="h-5 w-5" style={{ color: c.accent }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                        <p className="mt-1 truncate text-lg font-bold text-foreground" title={c.value}>
                          {c.value}
                        </p>
                        {c.subtitle && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{c.subtitle}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Setores por quebra: alterna entre gráfico de barras e tabela ranqueada. */}
              {sectorToggle}

              {/* Four charts */}
              <div data-pdf-grid data-pdf-compact className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div data-pdf-block>
                  <NotificationsByMonthChart
                    data={byMonth}
                    highlightMonth={selectedMonthOption?.month ?? null}
                  />
                </div>
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <VerticalCountChart
                      title={`[TOP 20] Setores que mais receberam notificações de não conformidade — ${periodLabel}`}
                      data={recebidas}
                      color={BOLETIM_COLORS.red}
                    />
                  ) : (
                    <RankedSectorTable
                      title={`[TOP 20] Setores que mais receberam notificações — ${periodLabel}`}
                      data={recebidas}
                      color={BOLETIM_COLORS.red}
                      columns={SECTOR_TABLE_COLUMNS}
                      maxRows={SECTOR_TABLE_MAX_ROWS}
                    />
                  )}
                </div>
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <HorizontalCountChart
                      title={`[TOP 8] Quebras de interações de processo mais notificadas — Geral`}
                      data={topInter}
                      color={BOLETIM_COLORS.red}
                      labelMax={30}
                      yWidth={220}
                    />
                  ) : (
                    <RankedSectorTable
                      title={`[TOP 8] Quebras de interações de processo mais notificadas — Geral`}
                      data={topInter}
                      color={BOLETIM_COLORS.red}
                      columns={1}
                      maxRows={8}
                      total={metrics.total}
                    />
                  )}
                </div>
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <VerticalCountChart
                      title={`[TOP 20] Setores que mais realizaram notificações de não conformidade — ${periodLabel}`}
                      data={realizadas}
                      color={BOLETIM_COLORS.olive}
                    />
                  ) : (
                    <RankedSectorTable
                      title={`[TOP 20] Setores que mais realizaram notificações — ${periodLabel}`}
                      data={realizadas}
                      color={BOLETIM_COLORS.olive}
                      columns={SECTOR_TABLE_COLUMNS}
                      maxRows={SECTOR_TABLE_MAX_ROWS}
                    />
                  )}
                </div>
              </div>
            </>
          ) : !setorHasData ? (
            <EmptyFilterState />
          ) : (
            <div className="space-y-2">
              {sectorToggle}

              {/* Linha 1: notificações por mês (Geral) + totais recebidas/realizadas */}
              <div data-pdf-shrink-first data-pdf-compact className="grid grid-cols-1 gap-2 lg:grid-cols-4">
                <div data-pdf-block className="lg:col-span-2">
                  <NotificationsByMonthChart
                    data={byMonth}
                    highlightMonth={selectedMonthOption?.month ?? null}
                  />
                </div>
                <div data-pdf-block>
                  <CountCard
                    title="Número de notificações de não conformidade recebidas pelo setor"
                    value={setorRecebidasTotal}
                    color={BOLETIM_COLORS.red}
                  />
                </div>
                <div data-pdf-block>
                  <CountCard
                    title="Número de notificações de não conformidade realizadas pelo setor"
                    value={setorRealizadasTotal}
                    color={BOLETIM_COLORS.navy}
                  />
                </div>
              </div>

              {/* Linha 2: quebras de interações recebidas / realizadas */}
              <div data-pdf-grid className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <HorizontalCountChart
                      title={`Quebras de interações de processo mais recebidas pelo setor`}
                      data={setorRecebidas}
                      color={BOLETIM_COLORS.red}
                      fullLabels
                    />
                  ) : (
                    <RankedSectorTable
                      title={`[TOP 8] Quebras de interações de processo mais recebidas pelo setor`}
                      data={setorRecebidas}
                      color={BOLETIM_COLORS.red}
                      columns={1}
                      maxRows={8}
                      total={setorRecebidasTotal}
                    />
                  )}
                </div>
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <HorizontalCountChart
                      title="Quebras de interações de processo mais realizadas pelo setor"
                      data={setorRealizadas}
                      color={BOLETIM_COLORS.navy}
                      fullLabels
                    />
                  ) : (
                    <RankedSectorTable
                      title={`[TOP 8] Quebras de interações de processo mais realizadas pelo setor`}
                      data={setorRealizadas}
                      color={BOLETIM_COLORS.navy}
                      columns={1}
                      maxRows={8}
                      total={setorRealizadasTotal}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer data-pdf-block className="border-t border-border bg-card">
          <div className="px-4 py-4 lg:px-8">
            <p className="text-[11px] font-medium leading-snug text-muted-foreground">{FOOTER_TEXT}</p>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              Fonte: Interact, {period?.year ?? new Date().getFullYear()}
            </p>
          </div>
          <div className="px-4 py-3 text-center" style={{ backgroundColor: BOLETIM_COLORS.navy }}>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              Núcleo de Qualidade e Segurança do Paciente
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
