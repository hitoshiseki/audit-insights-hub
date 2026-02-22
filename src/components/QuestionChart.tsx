import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionStats } from "@/types/audit";
import type { ClinicalQuestionStats } from "@/types/clinical-audit";
import clsx from "clsx";

interface QuestionChartProps {
  /** Accepts both ROPS and Clinical question stats */
  stats: QuestionStats | ClinicalQuestionStats;
}

const COLORS: Record<string, string> = {
  CONFORME: "hsl(160, 60%, 45%)",
  "NÃO CONFORME": "hsl(0, 72%, 51%)",
  "NÃO SE APLICA": "hsl(220, 10%, 60%)",
};

interface TooltipPayload {
  name: string;
  value: number;
  payload: { name: string; percent: number; count: number };
}

function CustomTooltip ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-popover-foreground">{data.name}</p>
      <p className="text-muted-foreground">
        {data.percent.toFixed(1)}% ({data.count})
      </p>
    </div>
  );
}

export function QuestionChart ({ stats }: QuestionChartProps) {
  const questionLabel =
    "numberStr" in stats.question
      ? stats.question.numberStr   // ClinicalParsedQuestion uses "1.1" style
      : String(stats.question.number); // ParsedQuestion uses integer

  const data = [
    { name: "Conforme", percent: stats.conformePercent, count: stats.conforme },
    { name: "Não Conforme", percent: stats.naoConformePercent, count: stats.naoConforme },
    { name: "N/A", percent: stats.naoSeAplicaPercent, count: stats.naoSeAplica },
  ];

  const colorKeys = ["CONFORME", "NÃO CONFORME", "NÃO SE APLICA"];

  return (
    <Card
      className={clsx(
        "animate-fade-in transition-all",
        stats.isAlert && "border-destructive border-2"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          {stats.isAlert && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          <CardTitle className="text-sm font-medium leading-tight">
            {questionLabel}. {stats.question.text}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percent" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[colorKeys[i]]} />
                ))}
                <LabelList
                  dataKey="percent"
                  position="top"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Total: {stats.total} resposta{stats.total !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
