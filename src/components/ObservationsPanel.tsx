import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { MessageSquareText, FileText, Layers, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ObservationsList } from "@/components/ObservationsList";
import {
  computeObservationMetrics,
  countObservationsByCategory,
  extractRecurringTerms,
  type ObservationGroup,
} from "@/lib/aggregators-qualitative";

interface ObservationsPanelProps {
  observations: ObservationGroup[];
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function MetricCard ({ icon, label, value, hint }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold text-foreground">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ObservationsPanel ({ observations }: ObservationsPanelProps) {
  const [search, setSearch] = useState("");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  const metrics = useMemo(
    () => computeObservationMetrics([], observations),
    [observations]
  );
  const byCategory = useMemo(
    () => countObservationsByCategory(observations),
    [observations]
  );
  const terms = useMemo(
    () => extractRecurringTerms(observations),
    [observations]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const term = activeTerm?.toLowerCase() ?? null;
    if (!needle && !term) return observations;

    return observations
      .map((g) => ({
        category: g.category,
        items: g.items.filter((item) => {
          const text = item.text.toLowerCase();
          if (needle && !text.includes(needle)) return false;
          if (term && !text.includes(term)) return false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [observations, search, activeTerm]);

  if (observations.length === 0) {
    return <ObservationsList observations={observations} />;
  }

  const toggleTerm = (term: string) =>
    setActiveTerm((prev) => (prev === term ? null : term));

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<MessageSquareText className="h-5 w-5" />}
          label="Total de observações"
          value={String(metrics.totalObservations)}
        />
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Registros com observação"
          value={`${metrics.pctRowsWithObs.toFixed(0)}%`}
          hint={`${metrics.rowsWithObs} registro${metrics.rowsWithObs !== 1 ? "s" : ""}`}
        />
        <MetricCard
          icon={<Layers className="h-5 w-5" />}
          label="Categoria com mais observações"
          value={metrics.topCategory}
          hint={`${metrics.topCategoryCount} observaç${metrics.topCategoryCount !== 1 ? "ões" : "ão"}`}
        />
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Observações por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: Math.max(120, byCategory.length * 38) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={byCategory}
                margin={{ top: 5, right: 28, bottom: 5, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={160}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
                  formatter={(v: number) => [`${v} observações`, ""]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recurring terms */}
      {terms.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Termos recorrentes</p>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <Badge
                key={t.term}
                variant={activeTerm === t.term ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleTerm(t.term)}
              >
                {t.term}
                <span className="ml-1.5 opacity-70">{t.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nas observações…"
          className="pl-9 pr-9"
        />
        {(search || activeTerm) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveTerm(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* List */}
      <ObservationsList observations={filtered} />
    </div>
  );
}
