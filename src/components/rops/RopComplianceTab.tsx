import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyFilterState } from "@/components/EmptyFilterState";
import type { AuditRow, ParsedQuestion } from "@/types/audit";
import type { AdherenceGroup, RopAuditResult } from "@/types/rops-compliance";
import { exportWorkbook, type ExcelSheet } from "@/lib/excel-export";
import { ROP_AREAS } from "@/lib/rop-levels";
import {
  computeRopResults,
  formatPct,
  globalKpis,
  groupByArea,
  groupByAudit,
  groupByDate,
  groupByMonth,
  groupByRop,
  groupBySector,
  sortByAdherence,
} from "@/lib/rops-compliance";
import { AdherenceEvolutionChart, ALL_AREAS } from "./AdherenceEvolutionChart";
import { AreaAdherenceStrip } from "./AreaAdherenceStrip";
import { RopDetailDialog } from "./RopDetailDialog";
import { RopKpiCards } from "./RopKpiCards";
import { RopRankingTable } from "./RopRankingTable";
import { ALL, useRopFilters } from "./RopComplianceFilters";
import {
  AdherenceByDateTable,
  ConformityCountsByRopChart,
  HorizontalAdherenceChart,
} from "./RopComplianceCharts";
import { RopComplianceTable } from "./RopComplianceTable";

interface RopComplianceTabProps {
  /** Linhas já filtradas por período e setor pela barra global. */
  rows: AuditRow[];
  questions: ParsedQuestion[];
}

/** Percentual arredondado para uma casa, pronto para cálculo no Excel. */
function pctNumber (value: number | null): number | string {
  return value === null ? "—" : Number(value.toFixed(1));
}

function adherenceColumns (g: AdherenceGroup) {
  return {
    "ROPs avaliadas": g.evaluated,
    Conformes: g.conforme,
    "Não conformes": g.naoConforme,
    Incompletas: g.incompleta,
    "Não avaliadas": g.naoAvaliada,
    "Adesão %": pctNumber(g.percent),
  };
}

export function RopComplianceTab ({ rows, questions }: RopComplianceTabProps) {
  const { filters } = useRopFilters();
  const [showAbsolute, setShowAbsolute] = useState(false);
  const [evolutionArea, setEvolutionArea] = useState(ALL_AREAS);
  const [detailRop, setDetailRop] = useState<string | null>(null);

  /** 1. Filtros de auditoria — antes de consolidar. */
  const auditRows = useMemo(() => {
    return rows.filter((r) => {
      if (filters.auditor !== ALL && r.auditor !== filters.auditor) return false;
      if (filters.lideranca !== ALL && r.leadershipPresent !== filters.lideranca) return false;
      return true;
    });
  }, [rows, filters.auditor, filters.lideranca]);

  const allResults = useMemo(
    () => computeRopResults(auditRows, questions),
    [auditRows, questions]
  );

  /** 2. Filtros de ROP — área e nível entram em tudo. */
  const results = useMemo(() => {
    return allResults.filter((r) => {
      if (filters.area !== ALL && r.ropArea !== filters.area) return false;
      if (filters.nivel !== ALL && r.ropLevel !== filters.nivel) return false;
      return true;
    });
  }, [allResults, filters.area, filters.nivel]);

  const kpis = useMemo(() => globalKpis(results), [results]);

  const areaGroups = useMemo(() => {
    const groups = groupByArea(results);
    const order = new Map(ROP_AREAS.map((a, i) => [a, i]));
    return groups.sort((a, b) => (order.get(a.label) ?? 99) - (order.get(b.label) ?? 99));
  }, [results]);

  const ropGroups = useMemo(() => groupByRop(results), [results]);
  const sectorGroups = useMemo(
    () => sortByAdherence(groupBySector(results), "asc"),
    [results]
  );
  const dateGroups = useMemo(() => groupByDate(results), [results]);

  const monthGroups = useMemo(() => {
    const scoped =
      evolutionArea === ALL_AREAS
        ? results
        : results.filter((r) => r.ropArea === evolutionArea);
    return groupByMonth(scoped);
  }, [results, evolutionArea]);

  const bestRops = useMemo(() => sortByAdherence(ropGroups, "desc"), [ropGroups]);
  const worstRops = useMemo(() => sortByAdherence(ropGroups, "asc"), [ropGroups]);
  const ropsByAdherenceAsc = worstRops;

  const lastUpdate = useMemo(() => {
    if (auditRows.length === 0) return null;
    return auditRows.reduce(
      (max, r) => (r.timestamp > max ? r.timestamp : max),
      auditRows[0].timestamp
    );
  }, [auditRows]);

  const handleExportExcel = useCallback(() => {
    try {
      const auditGroups = groupByAudit(results);
      const byIndex = new Map<number, RopAuditResult>();
      for (const r of results) if (!byIndex.has(r.auditIndex)) byIndex.set(r.auditIndex, r);

      const sheets: ExcelSheet[] = [
        {
          name: "Por Auditoria",
          rows: auditGroups.map((g) => {
            const sample = byIndex.get(Number(g.key));
            return {
              "Data da Auditoria": sample ? format(sample.auditDate, "dd/MM/yyyy") : "",
              Auditor: sample?.auditor ?? "",
              "Setor Auditado": sample?.sector ?? "",
              "Liderança presente": sample?.leadershipPresent ?? "",
              ...adherenceColumns(g),
            };
          }),
        },
        {
          name: "Por ROP",
          rows: sortByAdherence(ropGroups, "asc").map((g) => {
            const sample = results.find((r) => r.ropKey === g.key);
            return {
              ROP: g.label,
              Nível: sample?.ropLevel ?? "—",
              Categoria: sample?.ropArea ?? "—",
              ...adherenceColumns(g),
            };
          }),
        },
        {
          name: "Por Setor",
          rows: sectorGroups.map((g) => ({ "Setor Auditado": g.label, ...adherenceColumns(g) })),
        },
        {
          name: "Por Data",
          rows: dateGroups.map((g) => ({ "Data da Auditoria": g.label, ...adherenceColumns(g) })),
        },
        {
          name: "Base Detalhada",
          rows: results.map((r) => ({
            "Data da Auditoria": format(r.auditDate, "dd/MM/yyyy"),
            Auditor: r.auditor,
            "Setor Auditado": r.sector,
            "Liderança presente": r.leadershipPresent,
            ROP: r.ropName,
            Nível: r.ropLevel ?? "—",
            Categoria: r.ropArea ?? "—",
            "Total de testes": r.totalTests,
            "Testes aplicáveis": r.applicable,
            "Testes conformes": r.conforme,
            "Testes não conformes": r.naoConforme,
            "Testes não aplicáveis": r.naoSeAplica,
            "Testes sem resposta": r.semResposta,
            "Resultado da ROP": r.result,
            "Adesão da ROP %": pctNumber(r.adherencePercent),
          })),
        },
        {
          name: "Inconsistências",
          rows: results
            .filter((r) => r.result === "INCOMPLETA")
            .map((r) => ({
              "Data da Auditoria": format(r.auditDate, "dd/MM/yyyy"),
              Auditor: r.auditor,
              "Setor Auditado": r.sector,
              ROP: r.ropName,
              Nível: r.ropLevel ?? "—",
              "Testes sem resposta": r.semResposta,
              Testes: r.tests
                .filter((t) => t.answer === "SEM RESPOSTA")
                .map((t) => `${t.question.number}- ${t.question.text}`)
                .join(" | "),
            })),
        },
      ];

      exportWorkbook(sheets, `rops-conformidade-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar Excel.");
    }
  }, [results, ropGroups, sectorGroups, dateGroups]);

  if (results.length === 0) {
    return <EmptyFilterState />;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            DASHBOARD DE ADESÃO ÀS ROPs
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento das Práticas Organizacionais Obrigatórias
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastUpdate && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Última atualização: {format(lastUpdate, "dd/MM/yyyy HH:mm")}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Switch id="rop-absolute" checked={showAbsolute} onCheckedChange={setShowAbsolute} />
            <Label htmlFor="rop-absolute" className="cursor-pointer text-xs text-muted-foreground">
              Valores absolutos
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <RopKpiCards kpis={kpis} areas={areaGroups} />

      <AreaAdherenceStrip areas={areaGroups} showAbsolute={showAbsolute} />

      <AdherenceEvolutionChart
        months={monthGroups}
        areas={ROP_AREAS}
        selectedArea={evolutionArea}
        onAreaChange={setEvolutionArea}
        showAbsolute={showAbsolute}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RopRankingTable
          title="ROPs com maior percentual de conformidade"
          hint="Todas as ROPs, da maior para a menor adesão."
          rops={bestRops}
          tone="good"
          showAbsolute={showAbsolute}
          onSelectRop={setDetailRop}
        />
        <RopRankingTable
          title="ROPs com menor percentual de adesão"
          hint="As mesmas ROPs, da menor para a maior adesão."
          rops={worstRops}
          tone="bad"
          showAbsolute={showAbsolute}
          onSelectRop={setDetailRop}
        />
      </div>

      <HorizontalAdherenceChart
        title="Adesão por ROP"
        hint="ROPs conformes ÷ ROPs avaliadas, por ROP. Clique numa barra para ver o detalhamento."
        groups={ropsByAdherenceAsc}
        showAbsolute={showAbsolute}
        withLevelSymbol
        onSelect={setDetailRop}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <HorizontalAdherenceChart
          title="Adesão por setor"
          hint="ROPs conformes ÷ ROPs avaliadas no setor."
          groups={sectorGroups}
          showAbsolute={showAbsolute}
        />
        <AdherenceByDateTable groups={dateGroups} showAbsolute={showAbsolute} />
      </div>

      <ConformityCountsByRopChart groups={ropsByAdherenceAsc} />

      <RopComplianceTable
        results={results}
        showAbsolute={showAbsolute}
        onSelectRop={setDetailRop}
      />

      <RopDetailDialog
        ropKey={detailRop}
        results={results}
        onClose={() => setDetailRop(null)}
      />

      <p className="text-[11px] text-muted-foreground">
        Adesão global: {formatPct(kpis.percent)} ({kpis.conforme}/{kpis.evaluated}) · ROPs não
        avaliadas excluídas do numerador e do denominador.
      </p>
    </div>
  );
}
