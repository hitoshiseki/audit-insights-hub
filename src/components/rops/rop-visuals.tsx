import { cn } from "@/lib/utils";
import { ROP_LEVEL_COLORS, ROP_LEVEL_SYMBOLS, type RopLevel } from "@/lib/rop-levels";
import type { AdherenceTone, RopResult } from "@/types/rops-compliance";

/** Cores dos resultados, todas vindas dos tokens do tema. */
export const ROP_RESULT_COLORS: Record<RopResult, string> = {
  CONFORME: "hsl(var(--chart-conforme))",
  "NÃO CONFORME": "hsl(var(--chart-nao-conforme))",
  "NÃO AVALIADA": "hsl(var(--chart-nao-se-aplica))",
  INCOMPLETA: "hsl(var(--chart-atencao))",
};

export const TONE_COLORS: Record<AdherenceTone, string> = {
  good: "hsl(var(--chart-conforme))",
  warn: "hsl(var(--chart-atencao))",
  bad: "hsl(var(--chart-nao-conforme))",
  none: "hsl(var(--chart-nao-se-aplica))",
};

export function ResultBadge ({ result, className }: { result: RopResult; className?: string }) {
  const color = ROP_RESULT_COLORS[result];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {result}
    </span>
  );
}

export function LevelBadge ({ level, className }: { level: RopLevel | null; className?: string }) {
  if (!level) return null;
  const color = ROP_LEVEL_COLORS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      title={`Nível ${level}`}
    >
      <span aria-hidden>{ROP_LEVEL_SYMBOLS[level]}</span>
      {level}
    </span>
  );
}

/** Barra empilhada conforme / não conforme + incompleta / não avaliada. */
export function StackedAdherenceBar ({
  conforme,
  naoConforme,
  naoAvaliada,
  tone,
}: {
  conforme: number;
  naoConforme: number;
  naoAvaliada: number;
  tone: AdherenceTone;
}) {
  const total = conforme + naoConforme + naoAvaliada;
  if (total === 0) return <div className="h-2 w-full rounded-full bg-muted" />;
  const pct = (value: number) => `${(value / total) * 100}%`;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div style={{ width: pct(conforme), backgroundColor: TONE_COLORS[tone] }} />
      <div style={{ width: pct(naoConforme), backgroundColor: ROP_RESULT_COLORS["NÃO CONFORME"] }} />
      <div style={{ width: pct(naoAvaliada), backgroundColor: ROP_RESULT_COLORS["NÃO AVALIADA"] }} />
    </div>
  );
}

/** Cabeçalho de seção no estilo do mockup, com o "i" de explicação do cálculo. */
export function SectionHeading ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-foreground">
        {title}
        {hint && (
          <span
            title={hint}
            className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] font-semibold text-muted-foreground"
          >
            i
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}
