import { useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { parse, format } from "date-fns";
import { CsvUpload } from "@/components/CsvUpload";
import { GlobalFilters } from "@/components/GlobalFilters";
import { MetricsOverview } from "@/components/MetricsOverview";
import { CategorySection } from "@/components/CategorySection";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useCsvData } from "@/hooks/use-csv-data";
import { filterByDateRange } from "@/lib/date-helpers";
import { groupByCategory, computeGlobalMetrics } from "@/lib/aggregators";
import { exportDashboardToPdf } from "@/lib/pdf-export";
import { BarChart3, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function parseDateParam(val: string | null): Date | undefined {
  if (!val) return undefined;
  try {
    const d = parse(val, "yyyy-MM-dd", new Date());
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

export default function Dashboard() {
  const { rows, questions, isLoaded, isLoading, error, fileName, loadFile, reset } = useCsvData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const startDate = parseDateParam(searchParams.get("startDate"));
  const endDate = parseDateParam(searchParams.get("endDate"));
  const selectedSector = searchParams.get("sector") || "__all__";

  const setStartDate = useCallback(
    (d: Date | undefined) => {
      setSearchParams((prev) => {
        if (d) prev.set("startDate", format(d, "yyyy-MM-dd"));
        else prev.delete("startDate");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setEndDate = useCallback(
    (d: Date | undefined) => {
      setSearchParams((prev) => {
        if (d) prev.set("endDate", format(d, "yyyy-MM-dd"));
        else prev.delete("endDate");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setSector = useCallback(
    (sector: string) => {
      setSearchParams((prev) => {
        if (sector && sector !== "__all__") prev.set("sector", sector);
        else prev.delete("sector");
        return prev;
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete("startDate");
      prev.delete("endDate");
      prev.delete("sector");
      return prev;
    });
  }, [setSearchParams]);

  // Unique sectors from data
  const sectors = useMemo(() => {
    const set = new Set(rows.map((r) => r.sector).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Filter by date range then by sector
  const filteredRows = useMemo(() => {
    let result = filterByDateRange(rows, startDate, endDate);
    if (selectedSector && selectedSector !== "__all__") {
      result = result.filter((r) => r.sector === selectedSector);
    }
    return result;
  }, [rows, startDate, endDate, selectedSector]);

  const categoryGroups = useMemo(
    () => groupByCategory(questions, filteredRows),
    [questions, filteredRows]
  );

  const globalMetrics = useMemo(
    () => computeGlobalMetrics(categoryGroups, filteredRows.length),
    [categoryGroups, filteredRows.length]
  );

  const categories = useMemo(
    () => categoryGroups.map((g) => g.category),
    [categoryGroups]
  );

  const handleCategoryClick = useCallback((category: string) => {
    setActiveCategory(category);
    const el = document.getElementById(`category-${encodeURIComponent(category)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleExportPdf = useCallback(async () => {
    const contentEl = mainContentRef.current;
    if (!contentEl) return;
    const scrollContainer = contentEl.closest("main") || contentEl;
    setExporting(true);
    try {
      await exportDashboardToPdf(
        contentEl,
        scrollContainer as HTMLElement,
        {
          startDate: startDate ? format(startDate, "dd/MM/yyyy") : undefined,
          endDate: endDate ? format(endDate, "dd/MM/yyyy") : undefined,
          sector: selectedSector,
          totalFiltered: filteredRows.length,
        }
      );
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  }, [startDate, endDate, selectedSector, filteredRows.length]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Auditoria</h1>
            <p className="mt-2 text-muted-foreground">
              Faça upload do seu arquivo CSV de respostas para começar a análise
            </p>
          </div>
          <CsvUpload
            onFileLoaded={loadFile}
            isLoading={isLoading}
            fileName={fileName}
            error={error}
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
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Auditoria</h1>
          </div>

          <CsvUpload
            onFileLoaded={loadFile}
            isLoading={isLoading}
            fileName={fileName}
            error={error}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="ml-auto"
          >
            <FileDown className="mr-1 h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar PDF"}
          </Button>
        </div>
      </header>

      {/* Filters section */}
      <GlobalFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={clearFilters}
        totalFiltered={filteredRows.length}
        sectors={sectors}
        selectedSector={selectedSector}
        onSectorChange={setSector}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div ref={mainContentRef} className="space-y-6">
            <MetricsOverview metrics={globalMetrics} />

            {categoryGroups.map((group) => (
              <CategorySection key={group.category} group={group} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
