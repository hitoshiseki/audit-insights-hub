import { Card, CardContent } from "@/components/ui/card";
import { formatPct } from "@/lib/rops-compliance";
import { ropMetaOf } from "@/lib/rop-levels";
import type { AdherenceGroup } from "@/types/rops-compliance";
import { LevelBadge, SectionHeading } from "./rop-visuals";

interface RopRankingTableProps {
  title: string;
  hint: string;
  rops: AdherenceGroup[];
  tone: "good" | "bad";
  showAbsolute: boolean;
  onSelectRop: (ropKey: string) => void;
}

export function RopRankingTable ({
  title,
  hint,
  rops,
  tone,
  showAbsolute,
  onSelectRop,
}: RopRankingTableProps) {
  const color = tone === "good" ? "hsl(var(--chart-conforme))" : "hsl(var(--chart-nao-conforme))";

  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading title={title} hint={hint} />

        <div className="scrollbar-thin max-h-[380px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-8" />
              <col />
              <col className={showAbsolute ? "w-[112px]" : "w-[76px]"} />
            </colgroup>
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 text-left font-medium">#</th>
                <th className="py-1.5 text-left font-medium">ROP</th>
                <th className="py-1.5 text-right font-medium">% Conf.</th>
              </tr>
            </thead>
            <tbody>
              {rops.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    Nenhuma ROP no filtro atual.
                  </td>
                </tr>
              )}
              {rops.map((rop, i) => (
                <tr
                  key={rop.key}
                  onClick={() => onSelectRop(rop.key)}
                  className="cursor-pointer border-b border-border/50 odd:bg-muted/20 hover:bg-accent/50"
                >
                  <td className="py-1.5 pr-1 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="min-w-0 flex-1 truncate text-xs text-foreground"
                        title={rop.label}
                      >
                        {rop.label}
                      </span>
                      <LevelBadge level={ropMetaOf(rop.key)?.level ?? null} />
                    </div>
                  </td>
                  <td
                    className="whitespace-nowrap py-1.5 text-right text-xs font-semibold"
                    style={{ color }}
                  >
                    {formatPct(rop.percent)}
                    {showAbsolute && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        ({rop.conforme}/{rop.evaluated})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
