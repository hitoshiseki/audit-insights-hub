import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPct } from "@/lib/rops-compliance";
import type { AdherenceGroup } from "@/types/rops-compliance";
import { SectionHeading } from "./rop-visuals";

const GREEN = "hsl(var(--chart-conforme))";
export const ALL_AREAS = "__all__";

interface AdherenceEvolutionChartProps {
  months: AdherenceGroup[];
  areas: string[];
  selectedArea: string;
  onAreaChange: (area: string) => void;
  showAbsolute: boolean;
}

interface Point {
  label: string;
  percent: number | null;
  conforme: number;
  evaluated: number;
}

function EvolutionTooltip ({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-popover-foreground">{point.label}</p>
      <p className="text-muted-foreground">
        Adesão: <span className="font-semibold text-foreground">{formatPct(point.percent)}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {point.conforme} de {point.evaluated} ROPs avaliadas
      </p>
    </div>
  );
}

export function AdherenceEvolutionChart ({
  months,
  areas,
  selectedArea,
  onAreaChange,
  showAbsolute,
}: AdherenceEvolutionChartProps) {
  const data: Point[] = months.map((m) => ({
    label: m.label,
    percent: m.percent,
    conforme: m.conforme,
    evaluated: m.evaluated,
  }));

  return (
    <Card className="animate-fade-in border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <SectionHeading
          title="Evolução da adesão às ROPs"
          hint="Adesão por mês da Data da Auditoria (não do carimbo de envio do formulário)."
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Visão:</span>
            <Select value={selectedArea} onValueChange={onAreaChange}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_AREAS}>Geral</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SectionHeading>

        <div className="h-[260px] w-full" data-chart-box>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 24, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<EvolutionTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
              <Line
                type="monotone"
                dataKey="percent"
                stroke={GREEN}
                strokeWidth={2}
                dot={{ r: 4, fill: GREEN, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="percent"
                  position="top"
                  offset={10}
                  content={({ x, y, index }) => {
                    const point = data[index as number];
                    if (!point || point.percent === null) return null;
                    return (
                      <text
                        x={Number(x)}
                        y={Number(y) - 10}
                        textAnchor="middle"
                        style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                      >
                        {showAbsolute
                          ? `${formatPct(point.percent)} (${point.conforme}/${point.evaluated})`
                          : formatPct(point.percent)}
                      </text>
                    );
                  }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
