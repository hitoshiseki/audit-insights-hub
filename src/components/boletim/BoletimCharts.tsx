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
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CountItem, MonthCount } from "@/types/boletim";

// Report reference colors (navy / red / olive). Tones lightly refined for a more
// harmonious, higher-contrast institutional palette; hues kept from the reference.
export const BOLETIM_COLORS = {
  navy: "hsl(219, 54%, 32%)",
  red: "hsl(0, 65%, 45%)",
  olive: "hsl(74, 40%, 34%)",
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
const AXIS_TICK = { fontSize: 15, fill: "hsl(var(--foreground))" };

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

// Custom Y-axis tick that renders a plain <text> (single line). Recharts' default
// tick uses its <Text> component, which word-wraps long labels into several lines;
// a plain <text> never wraps, so the label stays on one line and `truncate` adds
// the ellipsis. Recharts injects x/y/payload via cloneElement.
//
// The label is right-anchored, so it extends left from the axis — if it were wider
// than the reserved column (`yWidth`) it would spill past the SVG edge and get
// clipped at the start. So truncate to whatever fits `yWidth` in px (≈ 0.6em per
// char at 13px), capped by `labelMax`.
const Y_TICK_FONT = 13;
function SingleLineYTick ({
  x,
  y,
  payload,
  labelMax,
  yWidth,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  labelMax: number;
  yWidth: number;
}) {
  const fitChars = Math.max(4, Math.floor((yWidth - 14) / (Y_TICK_FONT * 0.6)));
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={Y_TICK_FONT} fill="hsl(var(--foreground))">
      {truncate(payload?.value ?? "", Math.min(labelMax, fitChars))}
    </text>
  );
}

// ── Shared card shell (accent bar + standardized header) ──────────────────────
// Every boletim card renders through this so the report reads as one system:
// a solid colored accent bar on top, then an uppercase navy title with a matching
// color chip. Accent/title use inline hsl (BOLETIM_COLORS) so html2canvas-pro
// paints them in the PDF export.

interface ChartShellProps {
  title: string;
  /** Semantic color of the card (red = recebidas, olive/navy = realizadas…). */
  accent: string;
  className?: string;
  children: ReactNode;
}

function ChartShell ({ title, accent, className, children }: ChartShellProps) {
  return (
    <Card className={cn("flex h-full flex-col overflow-hidden border-border/60 shadow-sm", className)}>
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: accent }} />
      <CardHeader className="pb-2 pt-3.5">
        <CardTitle
          className="flex items-start gap-2.5 text-2xl font-bold uppercase leading-tight tracking-tight"
          style={{ color: BOLETIM_COLORS.navy }}
        >
          <span
            aria-hidden
            className="mt-[7px] h-3 w-3 shrink-0 rounded-[3px]"
            style={{ backgroundColor: accent }}
          />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
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
    <ChartShell
      title="Número de notificações de não conformidade de interação — Geral"
      accent={BOLETIM_COLORS.navy}
    >
      <CardContent>
        <div data-chart-box className="aspect-[5/2] min-h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }}>
              {chartGradients()}
              <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ ...AXIS_TICK, fontSize: 14 }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={false}>
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
                  style={{ fontSize: 16, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </ChartShell>
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
    <ChartShell title={title} accent={color}>
      <CardContent>
        <div data-chart-box className="aspect-[16/9] min-h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 14, right: 8, bottom: 58, left: -16 }}>
              {chartGradients()}
              <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-90}
                textAnchor="end"
                height={58}
                tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                tickFormatter={(v: string) => truncate(v, 16)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" fill={gradFill(color, "v")} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 15, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </ChartShell>
  );
}

// ── Horizontal count bar chart (long labels on Y axis) ────────────────────────

interface HorizontalCountChartProps {
  title: string;
  data: CountItem[];
  color: string;
  /** Max chars before truncating the Y-axis label with an ellipsis. */
  labelMax?: number;
  /** Width reserved for the Y-axis (label column) in px. */
  yWidth?: number;
}

export function HorizontalCountChart ({
  title,
  data,
  color,
  labelMax = 44,
  yWidth = 260,
}: HorizontalCountChartProps) {
  const barHeight = 30;
  const height = Math.max(220, data.length * barHeight + 40);
  return (
    <ChartShell title={title} accent={color}>
      <CardContent>
        <div data-chart-box className="w-full" style={{ height }}>
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
                width={yWidth}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={<SingleLineYTick labelMax={labelMax} yWidth={yWidth} />}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }} />
              <Bar dataKey="count" fill={gradFill(color, "h")} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 16, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </ChartShell>
  );
}

// ── Single count (hero figure — the number is the chart) ──────────────────────

interface CountCardProps {
  title: string;
  value: number;
  color: string;
  /** Optional label shown small below the number (e.g. the single interaction). */
  caption?: string;
}

export function CountCard ({ title, value, color, caption }: CountCardProps) {
  return (
    <ChartShell title={title} accent={color}>
      <CardContent className="flex flex-1 items-center justify-center">
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
          <span
            className="text-9xl font-extrabold leading-none tracking-tight"
            style={{ color }}
          >
            {value.toLocaleString("pt-BR")}
          </span>
          {caption && (
            <span className="max-w-[90%] text-xs font-medium leading-snug text-muted-foreground">
              {caption}
            </span>
          )}
        </div>
      </CardContent>
    </ChartShell>
  );
}
