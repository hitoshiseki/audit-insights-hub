import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditTypeStats } from "@/types/clinical-audit";

interface AuditTypeChartProps {
  stats: AuditTypeStats;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: { name: string; percent: number; count: number };
}

function CustomTooltip ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{data.name}</p>
      <p className="text-muted-foreground">
        {data.count} auditoria{data.count !== 1 ? "s" : ""} ({data.percent.toFixed(1)}%)
      </p>
    </div>
  );
}

const AUDIT_TYPE_COLORS = ["hsl(160, 60%, 45%)", "hsl(190, 70%, 40%)"];

export function AuditTypeChart ({ stats }: AuditTypeChartProps) {
  const data = [
    {
      name: "Retroativa",
      percent: stats.retroativaPercent,
      count: stats.retroativa,
    },
    {
      name: "Prospectiva",
      percent: stats.prospectivaPercent,
      count: stats.prospectiva,
    },
  ];

  if (stats.total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Tipo de Auditoria</CardTitle>
        <p className="text-xs text-muted-foreground">
          Total: {stats.total} auditoria{stats.total !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 8, bottom: 4, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--accent))" }}
              />
              <Bar dataKey="percent" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((_, i) => (
                  <Cell key={i} fill={AUDIT_TYPE_COLORS[i]} />
                ))}
                <LabelList
                  dataKey="percent"
                  position="top"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "hsl(var(--foreground))",
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
