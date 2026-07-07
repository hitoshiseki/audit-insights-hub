import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountItem, MonthCount } from "@/types/boletim";

// Report reference colors (navy / red / olive)
export const BOLETIM_COLORS = {
  navy: "hsl(219, 52%, 30%)",
  red: "hsl(0, 68%, 42%)",
  olive: "hsl(69, 36%, 36%)",
  orange: "hsl(24, 90%, 52%)",
} as const;

type BoletimColorKey = keyof typeof BOLETIM_COLORS;

// Reverse lookup so a chart that receives a raw color string can resolve it back
// to its gradient key (charts are called with BOLETIM_COLORS.red etc.).
const COLOR_KEY: Record<string, BoletimColorKey> = Object.fromEntries(
  (Object.entries(BOLETIM_COLORS) as [BoletimColorKey, string][]).map(([k, c]) => [c, k])
);

// Subtle top→bottom (columns) or left→right (bars) fade. Renders as real SVG
// <defs> so html2canvas-pro rasterizes it correctly in the PDF export.
function gradFill (color: string, orientation: "v" | "h"): string {
  const key = COLOR_KEY[color];
  return key ? `url(#boletim-grad-${key}-${orientation})` : color;
}

// Rendered via a plain call ({chartGradients()}) — NOT as <ChartGradients/> —
// because Recharts drops children whose element type it doesn't recognize, and
// a custom component wrapper would take the <defs> with it (invisible bars).
function chartGradients () {
  return (
    <defs>
      {(Object.entries(BOLETIM_COLORS) as [BoletimColorKey, string][]).flatMap(([k, c]) => [
        <linearGradient key={`${k}-v`} id={`boletim-grad-${k}-v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={1} />
          <stop offset="100%" stopColor={c} stopOpacity={0.85} />
        </linearGradient>,
        <linearGradient key={`${k}-h`} id={`boletim-grad-${k}-h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c} stopOpacity={0.85} />
          <stop offset="100%" stopColor={c} stopOpacity={1} />
        </linearGradient>,
      ])}
    </defs>
  );
}

const GRID_STROKE = "hsl(var(--border))";
// Print-oriented: dark, larger tick text so it stays legible on paper at a distance.
const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--foreground))" };

interface CountTooltipPayload {
  payload: { label: string; count: number };
  color?: string;
}

function CountTooltip ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CountTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const { label, count } = payload[0].payload;
  // Bars are filled with a url(#boletim-grad-<key>-<orient>) gradient, so map
  // that reference back to a solid color the swatch can actually paint.
  const raw = payload[0].color ?? BOLETIM_COLORS.navy;
  const gradKey = raw.match(/boletim-grad-(\w+?)-[vh]/)?.[1] as BoletimColorKey | undefined;
  const swatch = gradKey ? BOLETIM_COLORS[gradKey] : raw;
  return (
    <div className="max-w-xs rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-popover-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: swatch }} />
        {count} notificaç{count !== 1 ? "ões" : "ão"}
      </p>
    </div>
  );
}

function truncate (s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ── Notificações por data (vertical bars, one per month) ──────────────────────

export function NotificationsByMonthChart ({
  data,
  highlightMonth = null,
}: {
  data: MonthCount[];
  highlightMonth?: number | null;
}) {
  const hasHighlight = highlightMonth !== null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase leading-tight">
          Número de notificações de não conformidade de interação — Geral
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }}>
              {chartGradients()}
              <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40}>
                {data.map((entry) => {
                  const isHighlighted = entry.month === highlightMonth;
                  return (
                    <Cell
                      key={entry.month}
                      fill={gradFill(isHighlighted ? BOLETIM_COLORS.orange : BOLETIM_COLORS.navy, "v")}
                      fillOpacity={hasHighlight && !isHighlighted ? 0.55 : 1}
                    />
                  );
                })}
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v: number) => (v > 0 ? v : "")}
                  style={{ fontSize: 13, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Vertical count bar chart (setor on X axis) ────────────────────────────────

interface VerticalCountChartProps {
  title: string;
  data: CountItem[];
  color: string;
}

export function VerticalCountChart ({ title, data, color }: VerticalCountChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 96, left: -16 }}>
              {chartGradients()}
              <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-90}
                textAnchor="end"
                height={96}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                tickFormatter={(v: string) => truncate(v, 22)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" fill={gradFill(color, "v")} radius={[4, 4, 0, 0]} maxBarSize={32}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Horizontal count bar chart (long labels on Y axis) ────────────────────────

interface HorizontalCountChartProps {
  title: string;
  data: CountItem[];
  color: string;
}

export function HorizontalCountChart ({ title, data, color }: HorizontalCountChartProps) {
  const barHeight = 30;
  const height = Math.max(220, data.length * barHeight + 40);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
            >
              {chartGradients()}
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={260}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                tickFormatter={(v: string) => truncate(v, 44)}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" fill={gradFill(color, "h")} radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 13, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Single total (hero figure — the number is the chart) ──────────────────────

export function TotalBarChart ({ title, total }: { title: string; total: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[240px] flex-col items-center justify-center gap-1">
          <span
            className="text-7xl font-extrabold leading-none tracking-tight"
            style={{ color: BOLETIM_COLORS.navy }}
          >
            {total}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            notificaç{total !== 1 ? "ões" : "ão"} realizada{total !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
