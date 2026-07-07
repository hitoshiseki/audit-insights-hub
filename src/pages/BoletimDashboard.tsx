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
  totalRealizadasPeloSetor,
} from "@/lib/aggregators-boletim";
import {
  NotificationsByMonthChart,
  VerticalCountChart,
  HorizontalCountChart,
  TotalBarChart,
  BOLETIM_COLORS,
} from "@/components/boletim/BoletimCharts";
import logoPdf from "@/assets/logo-pdf.png";

const FOOTER_TEXT =
  "A notificação de NÃO CONFORMIDADE deve ser realizada em decorrência do descumprimento de requisitos descritos em normas, procedimentos, manuais, instruções de trabalho que estejam alinhados em contrato e interações de processos entre as áreas. Após a sua notificação, o gestor do setor notificado irá analisar e traçar plano de ação com aprovação da diretoria. O feedback das análises das notificações são acompanhadas pelo gestor do setor notificantes via Interact.";

const FOOTER_NOTE =
  "* “Outros” corresponde a notificações relacionadas a processos com fluxos ainda não formalizados através de interações ou que estão em fase de definição, o que reforça a importância de analisá-los para futuras padronizações.";

interface KpiCard {
  label: string;
  value: string;
  subtitle?: string;
  icon: typeof ClipboardList;
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

  // ── Por-setor aggregations (respect the month filter) ──
  const setorRecebidas = useMemo(
    () => (isGeral ? [] : interacoesRecebidasPeloSetor(filteredRows, selectedSector, 12)),
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
    { label: "Total de notificações", value: String(metrics.total), icon: ClipboardList },
    { label: "Setores notificados", value: String(metrics.setoresNotificados), icon: Building2 },
    {
      label: "Interação mais notificada",
      value: metrics.topInteracao,
      subtitle: `${metrics.topInteracaoCount} notificações`,
      icon: AlertTriangle,
    },
    {
      label: "Setor + notificante",
      value: metrics.topNotificante,
      subtitle: `${metrics.topNotificanteCount} notificações`,
      icon: Send,
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
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center lg:px-8">
          <img src={logoPdf} alt="Logo institucional" className="h-14 w-auto object-contain" />
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-[hsl(219,52%,30%)] sm:text-3xl">
            Boletim de Não Conformidades
          </h1>
          <p className="text-base font-bold text-[hsl(219,52%,30%)] sm:text-lg">
            Período: {periodLabel}
            {!isGeral && (
              <span className="ml-3">Setor: {selectedSector}</span>
            )}
          </p>
        </div>
        <div className="h-1.5 w-full bg-[hsl(24,90%,52%)]" />
      </header>

      {/* Content */}
      <main className="flex-1 space-y-6 p-4 pb-6 lg:p-8 lg:pb-6">
        {isGeral ? (
          <>
            <p data-html2canvas-ignore className="text-lg font-bold text-foreground">Boletim Geral</p>

            {/* KPI cards */}
            <div data-html2canvas-ignore className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((c) => (
                <Card key={c.label} className="animate-fade-in">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-lg bg-accent p-2.5">
                      <c.icon className="h-5 w-5 text-primary" />
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

            {/* Four charts */}
            <div data-pdf-grid className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div data-pdf-block>
                <NotificationsByMonthChart
                  data={byMonth}
                  highlightMonth={selectedMonthOption?.month ?? null}
                />
              </div>
              <div data-pdf-block>
                <VerticalCountChart
                  title="Número de quebras de interações de processo RECEBIDAS por setor"
                  data={recebidas}
                  color={BOLETIM_COLORS.red}
                />
              </div>
              <div data-pdf-block>
                <HorizontalCountChart
                  title="Quebras de interações de processo mais notificadas — Geral"
                  data={topInter}
                  color={BOLETIM_COLORS.red}
                />
              </div>
              <div data-pdf-block>
                <VerticalCountChart
                  title="Número de quebras de interações de processo REALIZADAS por setor notificante"
                  data={realizadas}
                  color={BOLETIM_COLORS.olive}
                />
              </div>
            </div>
          </>
        ) : !setorHasData ? (
          <EmptyFilterState />
        ) : (
          <div data-pdf-grid className="grid grid-cols-1 gap-6">
            <div data-pdf-block>
              <TotalBarChart
                title="Número de notificações de não conformidade realizadas pelo setor"
                total={setorRealizadasTotal}
              />
            </div>
            <div data-pdf-block>
              <HorizontalCountChart
                title="Quebras de interações de processo mais recebidas pelo setor"
                data={setorRecebidas}
                color={BOLETIM_COLORS.red}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer data-pdf-block className="border-t border-border bg-card px-4 py-3 lg:px-8">
        <p className="text-[11px] leading-snug text-muted-foreground">{FOOTER_TEXT}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{FOOTER_NOTE}</p>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          Fonte: Interact, {period?.year ?? new Date().getFullYear()}. · Atualizado em{" "}
          {new Date().toLocaleDateString("pt-BR")}.
        </p>
      </footer>
      </div>
    </div>
  );
}
