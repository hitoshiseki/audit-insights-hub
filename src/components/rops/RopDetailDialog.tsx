import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ropMetaOf } from "@/lib/rop-levels";
import { formatPct, ropDetail } from "@/lib/rops-compliance";
import type { RopAuditResult } from "@/types/rops-compliance";
import { LevelBadge, ResultBadge } from "./rop-visuals";

interface RopDetailDialogProps {
  ropKey: string | null;
  results: RopAuditResult[];
  onClose: () => void;
}

function Metric ({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2 text-center">
      <p className="text-lg font-bold" style={{ color: color ?? "hsl(var(--foreground))" }}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function RopDetailDialog ({ ropKey, results, onClose }: RopDetailDialogProps) {
  const detail = ropKey ? ropDetail(results, ropKey) : null;
  const meta = ropKey ? ropMetaOf(ropKey) : null;

  const totals = detail
    ? detail.tests.reduce(
        (acc, t) => ({
          conforme: acc.conforme + t.conforme,
          naoConforme: acc.naoConforme + t.naoConforme,
          naoSeAplica: acc.naoSeAplica + t.naoSeAplica,
          semResposta: acc.semResposta + t.semResposta,
        }),
        { conforme: 0, naoConforme: 0, naoSeAplica: 0, semResposta: 0 }
      )
    : null;

  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        {detail && totals && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
                {detail.ropName}
                <LevelBadge level={meta?.level ?? null} />
              </DialogTitle>
              <DialogDescription className="text-left">
                {meta?.area ? `${meta.area} · ` : ""}
                Adesão {formatPct(detail.adherence.percent)} ({detail.adherence.conforme} de{" "}
                {detail.adherence.evaluated} auditorias avaliadas
                {detail.adherence.naoAvaliada > 0
                  ? `, ${detail.adherence.naoAvaliada} não avaliadas`
                  : ""}
                )
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Respostas conformes" value={totals.conforme} color="hsl(var(--chart-conforme))" />
                  <Metric label="Não conformes" value={totals.naoConforme} color="hsl(var(--chart-nao-conforme))" />
                  <Metric label="Não aplicáveis" value={totals.naoSeAplica} color="hsl(var(--chart-nao-se-aplica))" />
                  <Metric label="Sem preenchimento" value={totals.semResposta} color="hsl(var(--chart-atencao))" />
                </div>

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Testes de conformidade</h4>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-xs text-muted-foreground">
                          <th className="w-10 p-2 text-left font-medium">#</th>
                          <th className="p-2 text-left font-medium">Teste</th>
                          <th className="w-14 p-2 text-right font-medium">C</th>
                          <th className="w-14 p-2 text-right font-medium">NC</th>
                          <th className="w-14 p-2 text-right font-medium">NA</th>
                          <th className="w-14 p-2 text-right font-medium">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.tests.map((t) => (
                          <tr key={t.question.fullHeader} className="border-t border-border/50">
                            <td className="p-2 text-muted-foreground">{t.question.number}</td>
                            <td className="p-2">{t.question.text}</td>
                            <td className="p-2 text-right text-chart-conforme">{t.conforme}</td>
                            <td className="p-2 text-right text-chart-nao-conforme">{t.naoConforme}</td>
                            <td className="p-2 text-right text-muted-foreground">{t.naoSeAplica}</td>
                            <td className="p-2 text-right text-chart-atencao">{t.semResposta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    C = conforme · NC = não conforme · NA = não se aplica · SR = sem resposta
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Setores com maior número de não conformidades
                  </h4>
                  {detail.sectorsWithNonConformities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma não conformidade registrada.</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.sectorsWithNonConformities.map((s) => (
                        <li key={s.sector} className="flex justify-between rounded border border-border/50 px-2 py-1 text-sm">
                          <span className="truncate">{s.sector}</span>
                          <span className="font-semibold text-chart-nao-conforme">{s.naoConforme}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Histórico por data</h4>
                  <ul className="space-y-1">
                    {detail.history.map((h) => (
                      <li
                        key={h.key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 px-2 py-1 text-sm"
                      >
                        <span className="whitespace-nowrap text-muted-foreground">{h.label}</span>
                        <span className="min-w-0 flex-1 truncate">{h.sector}</span>
                        <ResultBadge result={h.result} />
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
