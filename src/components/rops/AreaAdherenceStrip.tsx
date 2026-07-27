import { Shapes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROP_AREA_ICONS } from "@/lib/rop-levels";
import { adherenceTone, formatPct } from "@/lib/rops-compliance";
import type { AdherenceGroup } from "@/types/rops-compliance";
import { SectionHeading, StackedAdherenceBar, TONE_COLORS } from "./rop-visuals";

interface AreaAdherenceStripProps {
  areas: AdherenceGroup[];
  showAbsolute: boolean;
  onSelectArea?: (area: string) => void;
}

export function AreaAdherenceStrip ({ areas, showAbsolute, onSelectArea }: AreaAdherenceStripProps) {
  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading
          title="Adesão por categoria"
          hint="ROPs conformes ÷ ROPs avaliadas na categoria. ROPs não avaliadas (todos os testes “NÃO SE APLICA”) ficam fora do cálculo."
        />

        {areas.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nenhuma categoria no filtro atual.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {areas.map((area) => {
              const Icon = ROP_AREA_ICONS[area.label] ?? Shapes;
              const tone = adherenceTone(area.percent);
              return (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => onSelectArea?.(area.label)}
                  className="rounded-lg border border-border/60 bg-card p-2.5 text-left transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start gap-1.5">
                    <Icon className="mt-px h-3.5 w-3.5 shrink-0" style={{ color: TONE_COLORS[tone] }} />
                    <span
                      className="text-xs font-semibold leading-tight text-foreground"
                      title={area.label}
                    >
                      {area.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xl font-bold leading-none" style={{ color: TONE_COLORS[tone] }}>
                    {formatPct(area.percent)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">conforme</span>
                  </p>
                  <div className="mt-1.5">
                    <StackedAdherenceBar
                      conforme={area.conforme}
                      naoConforme={area.naoConforme + area.incompleta}
                      naoAvaliada={area.naoAvaliada}
                      tone={tone}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
                    {area.conforme}/{area.evaluated} avaliadas · {area.naoConforme} não conf.
                  </p>
                  {showAbsolute && (
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
                      {area.naoAvaliada} não avaliadas
                      {area.incompleta > 0 ? ` · ${area.incompleta} incompletas` : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
