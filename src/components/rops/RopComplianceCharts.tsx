import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ROP_LEVEL_SYMBOLS, ropMetaOf } from "@/lib/rop-levels";
import { adherenceTone, formatPct } from "@/lib/rops-compliance";
import type { AdherenceGroup } from "@/types/rops-compliance";
import { ROP_RESULT_COLORS, SectionHeading, TONE_COLORS } from "./rop-visuals";

const ROW_HEIGHT = 26;

function truncate (value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

interface AdherenceTooltipPayload {
  payload: AdherenceGroup & { display: string };
}

function AdherenceTooltip ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: AdherenceTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const g = payload[0].payload;
  const level = ropMetaOf(g.key)?.level;
  return (
    <div className="max-w-[320px] rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-popover-foreground">
        {g.label}
        {level && <span className="ml-1 text-xs text-muted-foreground">({level})</span>}
      </p>
      <p className="text-muted-foreground">
        Adesão: <span className="font-semibold text-foreground">{formatPct(g.percent)}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {g.conforme} conformes · {g.naoConforme} não conformes
        {g.incompleta > 0 ? ` · ${g.incompleta} incompletas` : ""} · {g.naoAvaliada} não avaliadas
      </p>
      <p className="text-xs text-muted-foreground">
        Denominador: {g.evaluated} ROPs avaliadas
      </p>
    </div>
  );
}

interface HorizontalAdherenceChartProps {
  title: string;
  hint: string;
  groups: AdherenceGroup[];
  showAbsolute: boolean;
  withLevelSymbol?: boolean;
  onSelect?: (key: string) => void;
}

/** Barras horizontais de adesão — usado para ROP e para setor. */
export function HorizontalAdherenceChart ({
  title,
  hint,
  groups,
  showAbsolute,
  withLevelSymbol = false,
  onSelect,
}: HorizontalAdherenceChartProps) {
  const data = groups.map((g) => {
    const level = withLevelSymbol ? ropMetaOf(g.key)?.level : undefined;
    const prefix = level ? `${ROP_LEVEL_SYMBOLS[level]} ` : "";
    return { ...g, display: `${prefix}${truncate(g.label, 38)}` };
  });

  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading title={title} hint={hint} />
        <div style={{ height: Math.max(data.length * ROW_HEIGHT + 40, 160) }} data-chart-box>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, bottom: 4, left: 4 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="display"
                width={260}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AdherenceTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar
                dataKey="percent"
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                isAnimationActive={false}
                onClick={(entry: unknown) => onSelect?.((entry as AdherenceGroup).key)}
                cursor={onSelect ? "pointer" : undefined}
              >
                {data.map((g) => (
                  <Cell key={g.key} fill={TONE_COLORS[adherenceTone(g.percent)]} />
                ))}
                <LabelList
                  dataKey="percent"
                  position="right"
                  content={({ x, y, width, height, index }) => {
                    const g = data[index as number];
                    if (!g) return null;
                    return (
                      <text
                        x={Number(x) + Number(width) + 6}
                        y={Number(y) + Number(height) / 2 + 4}
                        style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                      >
                        {showAbsolute
                          ? `${formatPct(g.percent)} (${g.conforme}/${g.evaluated})`
                          : formatPct(g.percent)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tabela de adesão por data da auditoria. */
export function AdherenceByDateTable ({
  groups,
  showAbsolute,
}: {
  groups: AdherenceGroup[];
  showAbsolute: boolean;
}) {
  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading
          title="Adesão por data da auditoria"
          hint="Agrupado pela coluna “Data da Auditoria”, não pelo carimbo de envio do formulário."
        />
        <div className="scrollbar-thin max-h-[380px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[92px]" />
              <col className="w-[52px]" />
              <col className="w-[52px]" />
              <col />
            </colgroup>
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 text-left font-medium">Data</th>
                <th className="py-1.5 text-right font-medium" title="ROPs avaliadas">
                  Aval.
                </th>
                <th className="py-1.5 text-right font-medium" title="ROPs conformes">
                  Conf.
                </th>
                <th className="py-1.5 pl-3 text-left font-medium">Adesão</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    Nenhuma auditoria no filtro atual.
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                const color = TONE_COLORS[adherenceTone(g.percent)];
                return (
                  <tr key={g.key} className="border-b border-border/50 odd:bg-muted/20">
                    <td className="whitespace-nowrap py-1.5 text-xs text-foreground">{g.label}</td>
                    <td className="py-1.5 text-right text-xs text-muted-foreground">{g.evaluated}</td>
                    <td className="py-1.5 text-right text-xs text-muted-foreground">{g.conforme}</td>
                    <td className="py-1.5 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${g.percent ?? 0}%`, backgroundColor: color }}
                          />
                        </div>
                        <span
                          className="whitespace-nowrap text-xs font-semibold"
                          style={{ color }}
                        >
                          {formatPct(g.percent)}
                        </span>
                        {showAbsolute && (
                          <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                            ({g.conforme}/{g.evaluated})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Quantidade de conformidades e não conformidades por ROP. */
export function ConformityCountsByRopChart ({ groups }: { groups: AdherenceGroup[] }) {
  const data = groups.map((g) => ({ ...g, display: truncate(g.label, 38) }));

  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading
          title="Conformidades e não conformidades por ROP"
          hint="Contagem de resultados de ROP por auditoria, incluindo as não avaliadas."
        />
        <div style={{ height: Math.max(data.length * ROW_HEIGHT + 60, 180) }} data-chart-box>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="display"
                width={260}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="conforme" name="Conforme" stackId="a" fill={ROP_RESULT_COLORS.CONFORME} maxBarSize={16} isAnimationActive={false} />
              <Bar dataKey="naoConforme" name="Não conforme" stackId="a" fill={ROP_RESULT_COLORS["NÃO CONFORME"]} maxBarSize={16} isAnimationActive={false} />
              <Bar dataKey="incompleta" name="Incompleta" stackId="a" fill={ROP_RESULT_COLORS.INCOMPLETA} maxBarSize={16} isAnimationActive={false} />
              <Bar dataKey="naoAvaliada" name="Não avaliada" stackId="a" fill={ROP_RESULT_COLORS["NÃO AVALIADA"]} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
