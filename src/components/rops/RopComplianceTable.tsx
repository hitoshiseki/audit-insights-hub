import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/rops-compliance";
import type { RopAuditResult } from "@/types/rops-compliance";
import { LevelBadge, ResultBadge, SectionHeading } from "./rop-visuals";

const PAGE_SIZE = 50;

type SortKey =
  | "auditDate"
  | "auditor"
  | "sector"
  | "leadershipPresent"
  | "ropName"
  | "totalTests"
  | "applicable"
  | "conforme"
  | "naoConforme"
  | "naoSeAplica"
  | "semResposta"
  | "result"
  | "adherencePercent";

interface Column {
  key: SortKey;
  label: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: "auditDate", label: "Data da Auditoria" },
  { key: "auditor", label: "Auditor" },
  { key: "sector", label: "Setor Auditado" },
  { key: "leadershipPresent", label: "Liderança" },
  { key: "ropName", label: "ROP" },
  { key: "totalTests", label: "Testes", numeric: true },
  { key: "applicable", label: "Aplicáveis", numeric: true },
  { key: "conforme", label: "Conformes", numeric: true },
  { key: "naoConforme", label: "Não conformes", numeric: true },
  { key: "naoSeAplica", label: "Não aplicáveis", numeric: true },
  { key: "semResposta", label: "Sem resposta", numeric: true },
  { key: "result", label: "Resultado" },
  { key: "adherencePercent", label: "Adesão", numeric: true },
];

function valueOf (row: RopAuditResult, key: SortKey): string | number {
  if (key === "auditDate") return row.auditDate.getTime();
  const value = row[key];
  return value === null ? -1 : (value as string | number);
}

export function RopComplianceTable ({
  results,
  showAbsolute,
  onSelectRop,
}: {
  results: RopAuditResult[];
  showAbsolute: boolean;
  onSelectRop: (ropKey: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("auditDate");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const copy = results.slice();
    copy.sort((a, b) => {
      const av = valueOf(a, sortKey);
      const bv = valueOf(b, sortKey);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "pt-BR");
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [results, sortKey, direction]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection("asc");
    }
    setPage(0);
  };

  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading
          title="Base detalhada de testes"
          hint="A coluna “Adesão” é informativa (conformes ÷ aplicáveis). A classificação da ROP continua exigindo que todos os testes aplicáveis estejam conformes."
        >
          <span className="text-xs text-muted-foreground">
            {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
          </span>
        </SectionHeading>

        <div className="scrollbar-thin overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "cursor-pointer whitespace-nowrap select-none",
                      col.numeric && "text-right"
                    )}
                  >
                    <span className={cn("inline-flex items-center gap-1", col.numeric && "flex-row-reverse")}>
                      {col.label}
                      {sortKey === col.key &&
                        (direction === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="py-6 text-center text-muted-foreground">
                    Nenhum resultado no filtro atual.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((row) => (
                <TableRow
                  key={`${row.auditIndex}-${row.ropKey}`}
                  onClick={() => onSelectRop(row.ropKey)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap">
                    {format(row.auditDate, "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate" title={row.auditor}>
                    {row.auditor}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate" title={row.sector}>
                    {row.sector}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.leadershipPresent || "—"}</TableCell>
                  <TableCell className="min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={row.ropName}>
                        {row.ropName}
                      </span>
                      <LevelBadge level={row.ropLevel} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{row.totalTests}</TableCell>
                  <TableCell className="text-right">{row.applicable}</TableCell>
                  <TableCell className="text-right">{row.conforme}</TableCell>
                  <TableCell className="text-right">{row.naoConforme}</TableCell>
                  <TableCell className="text-right">{row.naoSeAplica}</TableCell>
                  <TableCell className="text-right">{row.semResposta}</TableCell>
                  <TableCell>
                    <ResultBadge result={row.result} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    {formatPct(row.adherencePercent)}
                    {showAbsolute && row.applicable > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        ({row.conforme}/{row.applicable})
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">
              Página {currentPage + 1} de {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
