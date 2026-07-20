import { useEffect, useMemo, useRef, useState } from "react";
import { HeartPulse, ClipboardList, Building2, AlertTriangle, MapPin, FileDown } from "lucide-react";
import { CsvUpload } from "@/components/CsvUpload";
import { EmptyFilterState } from "@/components/EmptyFilterState";
import { NavMenuButton } from "@/components/AppNav";
import { HeaderActionsMenu } from "@/components/HeaderActionsMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { exportSegurancaToPdf } from "@/lib/pdf-export-seguranca";
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
  incidentesPorSetor,
  tipoIncidente,
  classificacaoCounts,
  computeSegurancaMetrics,
  collectSectors,
  collectMonths,
  filterByMonth,
  ALL_MONTHS,
  totalRecebidasPeloSetor,
  totalRealizadasPeloSetor,
  turnoRecebidasPeloSetor,
  tipoIncidentePeloSetor,
  classificacaoPeloSetor,
} from "@/lib/aggregators-seguranca";
import {
  NotificationsByMonthChart,
  VerticalCountChart,
  RankedSectorTable,
  CountCard,
  AcoesMelhoriaBox,
  SEGURANCA_COLORS,
} from "@/components/seguranca/SegurancaCharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import logoPdf from "@/assets/logo-pdf.png";

// Solid light navy for header pills — kept solid (not translucent) so html2canvas-pro
// paints it reliably in the printed header.
const PILL_BG = "hsl(219, 45%, 95%)";

// Max sectors listed in the ranked table view (top N by count).
const SECTOR_TABLE_MAX_ROWS = 16;
const SECTOR_TABLE_COLUMNS = 2;

const tint = (color: string, alpha: number) =>
  color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);

interface KpiCard {
  label: string;
  value: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  accent: string;
}

export default function SegurancaDashboard () {
  const { seguranca, segurancaLoading, segurancaError, loadSeguranca, clearAllData } = useAppData();
  const rows = useMemo(() => seguranca?.rows ?? [], [seguranca]);
  const isLoaded = seguranca !== null;
  const fileName = seguranca?.fileName ?? "";

  const { searchParams, setParam, selectedSector, setSector } = useDashboardFilters();
  const isGeral = !selectedSector || selectedSector === "__all__";

  const selectedMonth = searchParams.get("month") || ALL_MONTHS;
  const monthOptions = useMemo(() => collectMonths(rows), [rows]);
  const selectedMonthOption = useMemo(
    () => monthOptions.find((m) => m.value === selectedMonth) ?? null,
    [monthOptions, selectedMonth]
  );

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
      if (r.localOcorrencia) map.set(r.localOcorrencia, (map.get(r.localOcorrencia) || 0) + 1);
      if (r.setorNotificante && r.setorNotificante !== r.localOcorrencia) {
        map.set(r.setorNotificante, (map.get(r.setorNotificante) || 0) + 1);
      }
    }
    return map;
  }, [filteredRows]);

  // ── Geral aggregations (respect the month filter) ──
  const metrics = useMemo(() => computeSegurancaMetrics(filteredRows), [filteredRows]);
  // Always full year; the selected month is only highlighted, not filtered out.
  const byMonth = useMemo(() => notificationsByMonth(rows, year), [rows, year]);
  const porSetor = useMemo(() => incidentesPorSetor(filteredRows), [filteredRows]);
  const porTipo = useMemo(() => tipoIncidente(filteredRows, 12), [filteredRows]);
  const porClassificacao = useMemo(() => classificacaoCounts(filteredRows), [filteredRows]);

  // Toggle: incidentes por setor como gráfico de barras ou tabela ranqueada.
  const [sectorView, setSectorView] = useState<"chart" | "table">("table");

  // ── Por-setor aggregations (respect the month filter) ──
  const setorRealizadasTotal = useMemo(
    () => (isGeral ? 0 : totalRealizadasPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorRecebidasTotal = useMemo(
    () => (isGeral ? 0 : totalRecebidasPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorTurno = useMemo(
    () => (isGeral ? [] : turnoRecebidasPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorTipo = useMemo(
    () => (isGeral ? [] : tipoIncidentePeloSetor(filteredRows, selectedSector, 12)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorClassificacao = useMemo(
    () => (isGeral ? [] : classificacaoPeloSetor(filteredRows, selectedSector)),
    [filteredRows, selectedSector, isGeral]
  );
  const setorHasData = useMemo(
    () => !isGeral && filteredRows.some((r) => r.localOcorrencia === selectedSector || r.setorNotificante === selectedSector),
    [filteredRows, selectedSector, isGeral]
  );

  // ── Ações de melhoria: editable + persisted per período/setor ──
  const acoesKey = `seguranca-acoes:${selectedMonth}:${isGeral ? "geral" : selectedSector}`;
  const [acoes, setAcoes] = useState("");
  useEffect(() => {
    try {
      setAcoes(localStorage.getItem(acoesKey) ?? "");
    } catch {
      setAcoes("");
    }
  }, [acoesKey]);
  const handleAcoesChange = (v: string) => {
    setAcoes(v);
    try {
      localStorage.setItem(acoesKey, v);
    } catch {
      // Storage quota exceeded — silently ignore
    }
  };

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const suffix = isGeral ? "geral" : selectedSector.toLowerCase().replace(/\s+/g, "-");
      const periodo = periodLabel.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
      await exportSegurancaToPdf(reportRef.current, `boletim-seguranca-paciente-${suffix}-${periodo}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  };

  const kpis: KpiCard[] = [
    { label: "Total de notificações", value: String(metrics.total), icon: ClipboardList, accent: SEGURANCA_COLORS.navy },
    { label: "Setores envolvidos", value: String(metrics.setoresEnvolvidos), icon: Building2, accent: SEGURANCA_COLORS.olive },
    {
      label: "Taxonomia mais notificada",
      value: metrics.topTaxonomia,
      subtitle: `${metrics.topTaxonomiaCount} notificações`,
      icon: AlertTriangle,
      accent: SEGURANCA_COLORS.red,
    },
    {
      label: "Setor com mais incidentes",
      value: metrics.topSetor,
      subtitle: `${metrics.topSetorCount} notificações`,
      icon: MapPin,
      accent: SEGURANCA_COLORS.orange,
    },
  ];

  // ── Upload / empty state ──
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <HeartPulse className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Boletim de Segurança do Paciente</h1>
            <p className="mt-2 text-muted-foreground">
              Faça upload da exportação de <strong>notificações de incidentes</strong> (CSV, XLS
              ou XLSX) para começar a análise
            </p>
          </div>
          <CsvUpload
            onFileLoaded={loadSeguranca}
            isLoading={segurancaLoading}
            fileName={fileName}
            error={segurancaError}
          />
        </div>
      </div>
    );
  }

  // Shared Gráfico ↔ Tabela switch (screen-only).
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
          onFileLoaded={loadSeguranca}
          isLoading={segurancaLoading}
          fileName={fileName}
          error={segurancaError}
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
              style={{ color: SEGURANCA_COLORS.navy }}
            >
              Boletim de Segurança do Paciente{!isGeral && " – Setorial"}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span
                className={`rounded-full font-bold ${isGeral ? "px-3 py-1 text-base" : "px-4 py-1.5 text-xl"}`}
                style={{ color: SEGURANCA_COLORS.navy, backgroundColor: PILL_BG }}
              >
                Período: {periodLabel}
              </span>
              {!isGeral && (
                <span
                  className="rounded-full px-4 py-1.5 text-xl font-bold"
                  style={{ color: SEGURANCA_COLORS.navy, backgroundColor: PILL_BG }}
                >
                  Setor: {selectedSector}
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full" style={{ backgroundColor: SEGURANCA_COLORS.orange }} />
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

              {sectorToggle}

              {/* Four charts */}
              <div data-pdf-grid data-pdf-compact className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div data-pdf-block>
                  <NotificationsByMonthChart
                    title="Número de notificação de incidentes — Geral"
                    data={byMonth}
                    highlightMonth={selectedMonthOption?.month ?? null}
                    fill
                  />
                </div>
                <div data-pdf-block>
                  {sectorView === "chart" ? (
                    <VerticalCountChart
                      title="Número de incidentes por setor"
                      data={porSetor}
                      color={SEGURANCA_COLORS.red}
                    />
                  ) : (
                    <RankedSectorTable
                      title="[TOP 16] Número de incidentes por setor"
                      data={porSetor}
                      color={SEGURANCA_COLORS.red}
                      columns={SECTOR_TABLE_COLUMNS}
                      maxRows={SECTOR_TABLE_MAX_ROWS}
                    />
                  )}
                </div>
                <div data-pdf-block>
                  <RankedSectorTable
                    title="Número de notificações por tipo de incidente (Taxonomia OMS) — Geral"
                    data={porTipo}
                    color={SEGURANCA_COLORS.orange}
                    columns={2}
                  />
                </div>
                <div data-pdf-block>
                  <RankedSectorTable
                    title="Notificações por Classificação (Gravidade do Evento/Dano)"
                    data={porClassificacao}
                    color={SEGURANCA_COLORS.navy}
                    columns={1}
                  />
                </div>
              </div>

              {/* Ações de melhoria (editável, impresso no PDF) */}
              <div data-pdf-block>
                <AcoesMelhoriaBox
                  title="Ações de Melhoria Implementadas"
                  value={acoes}
                  onChange={handleAcoesChange}
                />
              </div>
            </>
          ) : !setorHasData ? (
            <EmptyFilterState />
          ) : (
            <div className="space-y-2">
              {/* Linha 1: mês (Geral) + totais realizadas/recebidas (cards de altura
                  reduzida, só um número) + turno. Grid de 5 col: mês 2 (~40%) / cards 1 / turno 1.
                  data-pdf-shrink → na exportação esta linha fica mais baixa que as tabelas abaixo. */}
              <div data-pdf-shrink data-pdf-compact className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                <div data-pdf-block className="lg:col-span-2">
                  <NotificationsByMonthChart
                    title="Número de notificação de incidentes — Geral"
                    data={byMonth}
                    highlightMonth={selectedMonthOption?.month ?? null}
                    fill
                  />
                </div>
                <div data-pdf-block className="lg:col-span-1">
                  <CountCard
                    title="Número de notificações realizadas pelo setor"
                    value={setorRealizadasTotal}
                    color={SEGURANCA_COLORS.navy}
                    valueClassName="text-6xl"
                  />
                </div>
                <div data-pdf-block className="lg:col-span-1">
                  <CountCard
                    title="Número de notificações recebidas pelo setor"
                    value={setorRecebidasTotal}
                    color={SEGURANCA_COLORS.red}
                    valueClassName="text-6xl"
                  />
                </div>
                <div data-pdf-block className="lg:col-span-1">
                  <RankedSectorTable
                    title="Notificações recebidas por turno do setor"
                    data={setorTurno}
                    color={SEGURANCA_COLORS.red}
                    columns={1}
                    total={setorRecebidasTotal}
                  />
                </div>
              </div>

              {/* Linha 2: tipo de incidente do setor + classificação (pizza) */}
              <div data-pdf-grid data-pdf-compact className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <div data-pdf-block>
                  <RankedSectorTable
                    title="Número de notificações por tipo de incidente (Taxonomia OMS) — Setor"
                    data={setorTipo}
                    color={SEGURANCA_COLORS.orange}
                    columns={2}
                    total={setorRecebidasTotal}
                  />
                </div>
                <div data-pdf-block>
                  <RankedSectorTable
                    title="Notificações por Classificação (Gravidade do Evento/Dano)"
                    data={setorClassificacao}
                    color={SEGURANCA_COLORS.navy}
                    columns={1}
                    total={setorRecebidasTotal}
                  />
                </div>
              </div>

              {/* Ações de melhoria (editável, impresso no PDF) */}
              <div data-pdf-block>
                <AcoesMelhoriaBox
                  title="Ações de Melhoria Implementadas a partir das Notificações"
                  value={acoes}
                  onChange={handleAcoesChange}
                />
              </div>
            </div>
          )}
        </main>

        {/* Footer — sem o parágrafo de notificação (pedido do módulo) */}
        <footer data-pdf-block className="border-t border-border bg-card">
          <div className="px-4 py-4 lg:px-8">
            <p className="text-[11px] font-semibold text-muted-foreground">
              Fonte: Sistema de Notificação de Incidentes, {period?.year ?? new Date().getFullYear()}
            </p>
          </div>
          <div className="px-4 py-3 text-center" style={{ backgroundColor: SEGURANCA_COLORS.navy }}>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              Núcleo de Qualidade e Segurança do Paciente
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
