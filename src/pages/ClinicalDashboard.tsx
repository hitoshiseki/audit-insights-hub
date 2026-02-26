import { useMemo, useState, useCallback, useDeferredValue } from "react";
import { format } from "date-fns";
import { CsvUpload } from "@/components/CsvUpload";
import { GlobalFilters } from "@/components/GlobalFilters";
import { MetricsOverview } from "@/components/MetricsOverview";
import { CategorySection } from "@/components/CategorySection";
import { QuestionChart } from "@/components/QuestionChart";
import { QuestionsTable } from "@/components/QuestionsTable";
import { AuditTypeChart } from "@/components/AuditTypeChart";
import { NavMenuButton } from "@/components/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { filterByDateRange } from "@/lib/date-helpers";
import {
  groupClinicalByCategory,
  computeClinicalGlobalMetrics,
  computeAuditTypeStats,
} from "@/lib/aggregators-clinical";
import { exportTableToPdf, REPORT_EMITTER } from "@/lib/pdf-export";
import { Stethoscope, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderActionsMenu } from "@/components/HeaderActionsMenu";
import { toast } from "sonner";

export default function ClinicalDashboard () {
  const { clinical, clinicalLoading, clinicalError, loadClinical, clearAllData } = useAppData();
  const rows = clinical?.rows ?? [];
  const questions = clinical?.questions ?? [];
  const isLoaded = clinical !== null;
  const fileName = clinical?.fileName ?? "";

  const {
    startDate, endDate, selectedSector, selectedCategory,
    setStartDate, setEndDate, setSector, setCategory, clearFilters,
  } = useDashboardFilters();

  const [exporting, setExporting] = useState(false);

  const sectors = useMemo(() => {
    const set = new Set(rows.map((r) => r.sector).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = filterByDateRange(rows, startDate, endDate);
    if (selectedSector && selectedSector !== "__all__") {
      result = result.filter((r) => r.sector === selectedSector);
    }
    return result;
  }, [rows, startDate, endDate, selectedSector]);

  // Deferred version: chart computations trail behind so filter UI stays snappy
  const deferredRows = useDeferredValue(filteredRows);

  const categoryGroups = useMemo(
    () => groupClinicalByCategory(questions, deferredRows),
    [questions, deferredRows]
  );

  const categories = useMemo(
    () => categoryGroups.map((g) => g.category),
    [categoryGroups]
  );

  const displayedGroups = useMemo(
    () => selectedCategory === "__all__"
      ? categoryGroups
      : categoryGroups.filter((g) => g.category === selectedCategory),
    [categoryGroups, selectedCategory]
  );

  const globalMetrics = useMemo(
    () => computeClinicalGlobalMetrics(displayedGroups, deferredRows.length),
    [displayedGroups, deferredRows.length]
  );

  const auditTypeStats = useMemo(
    () => computeAuditTypeStats(deferredRows),
    [deferredRows]
  );

  const handleExportPdf = useCallback(() => {
    setExporting(true);
    try {
      const pdfGroups = displayedGroups.map((g) => ({
        category: g.category,
        avgConforme: g.avgConforme,
        questions: g.questions.map((q) => ({
          label: "numberStr" in q.question ? q.question.numberStr : "",
          text: q.question.text,
          conformePercent: q.conformePercent,
          naoConformePercent: q.naoConformePercent,
          total: q.total,
          isAlert: q.isAlert,
        })),
      }));
      exportTableToPdf(pdfGroups, {
        startDate: startDate ? format(startDate, "dd/MM/yyyy") : undefined,
        endDate: endDate ? format(endDate, "dd/MM/yyyy") : undefined,
        sector: selectedSector,
        category: selectedCategory !== "__all__" ? selectedCategory : undefined,
        totalFiltered: filteredRows.length
      }, `auditoria-clinica-${format(new Date(), "dd-MM-yyyy")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  }, [displayedGroups, startDate, endDate, selectedSector, selectedCategory, filteredRows.length]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoria Clínica</h1>
            <p className="mt-2 text-muted-foreground">
              Faça upload do arquivo CSV de Auditoria Clínica para começar a análise
            </p>
          </div>
          <CsvUpload
            onFileLoaded={loadClinical}
            isLoading={clinicalLoading}
            fileName={fileName}
            error={clinicalError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
          <NavMenuButton />

          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Auditoria Clínica</h1>
          </div>

          <CsvUpload
            onFileLoaded={loadClinical}
            isLoading={clinicalLoading}
            fileName={fileName}
            error={clinicalError}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="ml-auto bg-green-600 text-white hover:bg-green-800 hover:text-white"
          >
            <FileDown className="mr-1 h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar PDF"}
          </Button>

          <HeaderActionsMenu onClearData={clearAllData} />
        </div>
      </header>

      {/* Filters */}
      <GlobalFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={() => clearFilters()}
        totalFiltered={filteredRows.length}
        sectors={sectors}
        selectedSector={selectedSector}
        onSectorChange={setSector}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setCategory}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pb-10 lg:p-6 lg:pb-10">
          <div className="space-y-6">

            <MetricsOverview metrics={globalMetrics} />
            <AuditTypeChart stats={auditTypeStats} />

            <Tabs defaultValue="charts">
              <TabsList>
                <TabsTrigger value="charts">Gráficos</TabsTrigger>
                <TabsTrigger value="table">Tabela</TabsTrigger>
              </TabsList>

              <TabsContent value="charts" className="mt-4 space-y-6">
                {displayedGroups.map((group) => (
                  <CategorySection
                    key={group.category}
                    group={group}
                    renderChart={(stats) => <QuestionChart stats={stats} />}
                  />
                ))}
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <QuestionsTable groups={displayedGroups} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/90 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
        Responsável: {REPORT_EMITTER}
      </footer>
    </div>
  );
}
