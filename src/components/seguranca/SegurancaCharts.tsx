import {
  PieChart,
  Pie,
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
import { CardContent } from "@/components/ui/card";
import type { CountItem } from "@/types/seguranca";
import {
  ChartShell,
  BOLETIM_COLORS,
  NotificationsByMonthChart,
  VerticalCountChart,
  RankedSectorTable,
  HorizontalCountChart,
  CountCard,
} from "@/components/boletim/BoletimCharts";

// Reuse the shared boletim chart primitives verbatim (they take title/color
// props), so the two reports read as one system. Re-exported here so the
// Segurança page imports everything chart-related from a single module.
export {
  BOLETIM_COLORS as SEGURANCA_COLORS,
  NotificationsByMonthChart,
  VerticalCountChart,
  RankedSectorTable,
  HorizontalCountChart,
  CountCard,
};

const GRID_STROKE = "hsl(var(--border))";
const AXIS_TICK = { fontSize: 15, fill: "hsl(var(--foreground))" };

// Fixed color per gravity classification, matching the report reference
// (azul → verde → amarelo → laranja; cinza para "outra natureza"/"queixa").
export const CLASSIFICACAO_COLORS: Record<string, string> = {
  "Circunstância de risco": "hsl(211, 72%, 47%)", // blue
  "Quase evento": "hsl(122, 39%, 43%)",           // green
  "Incidente sem dano": "hsl(45, 93%, 47%)",       // yellow/amber
  "Evento adverso": "hsl(24, 90%, 52%)",           // orange
  "Outra natureza": "hsl(0, 0%, 55%)",             // grey
  "Queixa técnica": "hsl(0, 0%, 40%)",             // dark grey
};
const CLASSIFICACAO_FALLBACK = "hsl(0, 65%, 45%)"; // red — unknown/severe

function colorForClassificacao (label: string): string {
  return CLASSIFICACAO_COLORS[label] ?? CLASSIFICACAO_FALLBACK;
}

function percent (count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

// ── Classificação: horizontal bars with count + % (Geral view) ────────────────

export function ClassificationBarChart ({
  title,
  data,
}: {
  title: string;
  data: CountItem[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const height = Math.max(240, data.length * 46 + 40);
  return (
    <ChartShell title={title} accent={BOLETIM_COLORS.navy} total={total}>
      <CardContent>
        <div data-chart-box className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 96, bottom: 4, left: 8 }}
            >
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeOpacity={0.6} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={180}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fontSize: 13, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as CountItem;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
                      <p className="font-semibold text-popover-foreground">{p.label}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {p.count} ({percent(p.count, total)}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.label} fill={colorForClassificacao(d.label)} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  formatter={(v: number) => `${v} (${percent(v, total)}%)`}
                  style={{ fontSize: 14, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </ChartShell>
  );
}

// ── Classificação: pie with legend (Setor view) ───────────────────────────────

export function ClassificationPieChart ({
  title,
  data,
}: {
  title: string;
  data: CountItem[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <ChartShell title={title} accent={BOLETIM_COLORS.navy} total={total}>
      <CardContent>
        {/* Fixed box height so the PDF export's compact sizer can override it via
            style.height; the pie side stretches to fill it (flex-row align-stretch),
            so the whole chart scales into whatever cell height the export assigns. */}
        <div data-chart-box className="flex w-full flex-col gap-4 sm:flex-row" style={{ height: 300 }}>
          <div className="h-[220px] w-full sm:h-auto sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius="85%"
                  isAnimationActive={false}
                  label={({ count }: { count: number }) =>
                    total > 0 && count / total >= 0.04 ? `${count} (${percent(count, total)}%)` : ""
                  }
                  labelLine={false}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {data.map((d) => (
                    <Cell key={d.label} fill={colorForClassificacao(d.label)} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as CountItem;
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
                        <p className="font-semibold text-popover-foreground">{p.label}</p>
                        <p className="mt-0.5 text-muted-foreground">
                          {p.count} ({percent(p.count, total)}%)
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-full flex-col justify-center gap-2 sm:w-1/2 sm:self-center">
            {data.map((d) => (
              <li key={d.label} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: colorForClassificacao(d.label) }}
                />
                <span className="min-w-0 flex-1 text-foreground">{d.label}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {d.count} <span className="font-normal text-muted-foreground">({percent(d.count, total)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </ChartShell>
  );
}

// ── Ações de Melhoria: editable box, printed as typed into the PDF ────────────
// Renders a contentEditable div (NOT a <textarea>) so html2canvas-pro captures
// the typed text as real DOM. Not marked data-html2canvas-ignore → it prints.

export function AcoesMelhoriaBox ({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ChartShell title={title} accent={BOLETIM_COLORS.green}>
      <CardContent>
        <div
          role="textbox"
          aria-label={title}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerText)}
          className="min-h-[60px] w-full whitespace-pre-wrap rounded-md border border-dashed border-border/70 p-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          // Sync from state without wiping the caret: only write when it differs
          // from the DOM (i.e. on load / filter change, not on every keystroke).
          ref={(el) => {
            if (el && el.innerText !== value) el.innerText = value;
          }}
        />
      </CardContent>
    </ChartShell>
  );
}
