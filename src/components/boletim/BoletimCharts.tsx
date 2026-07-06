import {
  BarChart,
  Bar,
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
} as const;

interface CountTooltipPayload {
  payload: { label: string; count: number };
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
  return (
    <div className="max-w-xs rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">
        {count} notificaç{count !== 1 ? "ões" : "ão"}
      </p>
    </div>
  );
}

function truncate (s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ── Notificações por data (vertical bars, one per month) ──────────────────────

export function NotificationsByMonthChart ({ data }: { data: MonthCount[] }) {
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="count" fill={BOLETIM_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v: number) => (v > 0 ? v : "")}
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-90}
                textAnchor="end"
                height={96}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: string) => truncate(v, 22)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} maxBarSize={36}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--foreground))" }}
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
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={260}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                tickFormatter={(v: string) => truncate(v, 44)}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Single total bar (por-setor: notificações realizadas pelo setor) ──────────

export function TotalBarChart ({ title, total }: { title: string; total: number }) {
  const data = [{ label: "Total", count: total }];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="count" fill={BOLETIM_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={120}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 16, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
