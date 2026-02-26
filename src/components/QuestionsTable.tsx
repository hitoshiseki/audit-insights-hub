import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { QuestionStats } from "@/types/audit";
import type { ClinicalQuestionStats } from "@/types/clinical-audit";

type AnyStats = QuestionStats | ClinicalQuestionStats;

interface TableGroup {
  category: string;
  avgConforme: number;
  avgNaoConforme: number;
  questions: AnyStats[];
}

interface QuestionsTableProps {
  groups: TableGroup[];
}

function getQuestionLabel (stats: AnyStats): string {
  return "numberStr" in stats.question
    ? stats.question.numberStr
    : String(stats.question.number);
}

function PctCell ({
  value,
  variant,
  bold,
}: {
  value: number;
  variant: "conforme" | "nao-conforme" | "na";
  bold: boolean;
}) {
  const colorClass =
    variant === "conforme"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "nao-conforme"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <TableCell className={`text-right tabular-nums ${colorClass} ${bold ? "font-bold" : ""}`}>
      <span className="inline-flex flex-col items-end gap-0.5">
        <span>{value.toFixed(1)}%</span>
        {/* Thin progress bar */}
        <span className="h-1 w-12 rounded-full bg-muted overflow-hidden">
          <span
            className={`block h-full rounded-full ${variant === "conforme"
              ? "bg-emerald-500"
              : variant === "nao-conforme"
                ? "bg-red-500"
                : "bg-muted-foreground/40"
              }`}
            style={{ width: `${value}%` }}
          />
        </span>
      </span>
    </TableCell>
  );
}

export function QuestionsTable ({ groups }: QuestionsTableProps) {
  if (groups.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Nenhum dado disponível para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead>Pergunta</TableHead>
            <TableHead className="text-right w-[100px]">Conforme</TableHead>
            <TableHead className="text-right w-[120px]">Não Conforme</TableHead>
            <TableHead className="text-right w-[80px]">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <>
              {/* Category header row */}
              <TableRow
                key={`cat-${group.category}`}
                className="bg-accent/60 hover:bg-accent/60"
              >
                <TableCell colSpan={2} className="py-2">
                  <span className="font-semibold text-foreground text-sm">
                    {group.category}
                  </span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    média {group.avgConforme.toFixed(1)}% conforme
                  </span>
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>

              {/* Question rows */}
              {group.questions.map((stats) => {
                const maxPct = Math.max(
                  stats.conformePercent,
                  stats.naoConformePercent,
                  stats.naoSeAplicaPercent
                );
                return (
                  <TableRow key={stats.question.fullHeader}>
                    <TableCell className="align-middle text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        {stats.isAlert && (
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                        )}
                        {getQuestionLabel(stats)}
                      </span>
                    </TableCell>
                    <TableCell className="align-middle text-sm leading-snug max-w-xs">
                      {stats.question.text}
                    </TableCell>
                    <PctCell
                      value={stats.conformePercent}
                      variant="conforme"
                      bold={stats.conformePercent === maxPct && maxPct > 0}
                    />
                    <PctCell
                      value={stats.naoConformePercent}
                      variant="nao-conforme"
                      bold={stats.naoConformePercent === maxPct && maxPct > 0}
                    />
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground align-middle">
                      {stats.total}
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
