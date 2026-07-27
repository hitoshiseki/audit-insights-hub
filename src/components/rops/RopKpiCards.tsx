import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Trophy,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/rops-compliance";
import type { AdherenceGroup, RopGlobalKpis } from "@/types/rops-compliance";

interface RopKpiCardsProps {
  kpis: RopGlobalKpis;
  areas: AdherenceGroup[];
}

function tint (color: string, alpha: number) {
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
}

const GREEN = "hsl(var(--chart-conforme))";
const RED = "hsl(var(--chart-nao-conforme))";
const NAVY = "hsl(var(--primary))";

function HeroCard ({
  icon: Icon,
  color,
  label,
  value,
  valueColor,
  lines,
  variant = "metric",
}: {
  icon: typeof CheckCircle2;
  color: string;
  label: string;
  value: string;
  valueColor?: string;
  lines: (string | null)[];
  /** "text" quebra o valor em várias linhas — para nomes longos de categoria. */
  variant?: "metric" | "text";
}) {
  const isText = variant === "text";
  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="flex gap-3 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: tint(color, 0.14) }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 font-bold",
              isText ? "break-words text-base leading-snug" : "truncate text-3xl leading-none"
            )}
            style={{ color: valueColor ?? color }}
            title={value}
          >
            {value}
          </p>
          {lines.filter(Boolean).map((line, i) => (
            <p
              key={i}
              className={cn(
                i === 0 ? "mt-2 text-xs" : "mt-1 text-[11px] text-muted-foreground/80",
                i === 0 && isText ? "font-semibold" : "text-muted-foreground"
              )}
              style={i === 0 && isText ? { color } : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function bestArea (areas: AdherenceGroup[]): AdherenceGroup | null {
  const rated = areas.filter((a) => a.percent !== null);
  if (rated.length === 0) return null;
  return rated.reduce((best, a) => (a.percent! > best.percent! ? a : best));
}

function worstArea (areas: AdherenceGroup[]): AdherenceGroup | null {
  const rated = areas.filter((a) => a.percent !== null);
  if (rated.length === 0) return null;
  return rated.reduce((worst, a) => (a.percent! < worst.percent! ? a : worst));
}

export function RopKpiCards ({ kpis, areas }: RopKpiCardsProps) {
  const best = bestArea(areas);
  const worst = worstArea(areas);
  const naoConformePercent =
    kpis.evaluated > 0 ? (kpis.naoConforme / kpis.evaluated) * 100 : null;
  const worstNonConformePercent =
    worst && worst.evaluated > 0 ? (worst.naoConforme / worst.evaluated) * 100 : null;

  const counters = [
    { label: "Auditorias", value: kpis.totalAudits },
    { label: "Setores auditados", value: kpis.totalSectors },
    { label: "ROPs identificadas", value: kpis.totalRops },
    { label: "ROPs conformes", value: kpis.conforme, color: GREEN },
    { label: "ROPs não conformes", value: kpis.naoConforme, color: RED },
    { label: "ROPs não avaliadas", value: kpis.naoAvaliada, color: "hsl(var(--chart-nao-se-aplica))" },
    { label: "ROPs incompletas", value: kpis.incompleta, color: "hsl(var(--chart-atencao))" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <HeroCard
          icon={CheckCircle2}
          color={GREEN}
          label="Conformidade geral"
          value={formatPct(kpis.percent)}
          lines={[
            `${kpis.conforme} de ${kpis.evaluated} ROPs avaliadas`,
            "Fórmula: Conformes ÷ Avaliadas",
          ]}
        />
        <HeroCard
          icon={XCircle}
          color={RED}
          label="Não conformidade geral"
          value={formatPct(naoConformePercent)}
          lines={[
            `${kpis.naoConforme} de ${kpis.evaluated} ROPs avaliadas`,
            "Fórmula: Não conformes ÷ Avaliadas",
          ]}
        />
        <HeroCard
          icon={ClipboardList}
          color={NAVY}
          label="Total de ROPs avaliadas"
          value={String(kpis.evaluated)}
          valueColor="hsl(var(--foreground))"
          lines={[
            "Resultados considerados no cálculo",
            `(Excluídas ${kpis.naoAvaliada} não avaliadas)`,
            kpis.incompleta > 0 ? `(${kpis.incompleta} incompletas no denominador)` : null,
          ]}
        />
        <HeroCard
          icon={Trophy}
          color={GREEN}
          label="Melhor categoria"
          value={best ? best.label : "—"}
          valueColor="hsl(var(--foreground))"
          variant="text"
          lines={[
            best ? `${formatPct(best.percent)} conforme` : null,
            best ? `${best.conforme} de ${best.evaluated} ROPs avaliadas` : "Sem dados",
          ]}
        />
        <HeroCard
          icon={AlertTriangle}
          color={RED}
          label="Pior categoria"
          value={worst ? worst.label : "—"}
          valueColor="hsl(var(--foreground))"
          variant="text"
          lines={[
            worst ? `${formatPct(worstNonConformePercent)} não conforme` : null,
            worst ? `${worst.naoConforme} de ${worst.evaluated} ROPs avaliadas` : "Sem dados",
          ]}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4 xl:grid-cols-7">
          {counters.map((c) => (
            <div key={c.label}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </p>
              <p className="text-xl font-bold" style={{ color: c.color ?? "hsl(var(--foreground))" }}>
                {c.value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
