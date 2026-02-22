import { CheckCircle2, XCircle, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GlobalMetrics } from "@/types/audit";

interface MetricsOverviewProps {
  metrics: GlobalMetrics;
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const cards = [
    {
      label: "Conforme (média)",
      value: `${metrics.avgConforme.toFixed(1)}%`,
      icon: CheckCircle2,
      iconClass: "text-chart-conforme",
    },
    {
      label: "Não Conforme (média)",
      value: `${metrics.avgNaoConforme.toFixed(1)}%`,
      icon: XCircle,
      iconClass: "text-chart-nao-conforme",
    },
    {
      label: "Total de Respostas",
      value: metrics.totalResponses.toString(),
      icon: BarChart3,
      iconClass: "text-primary",
    },
    {
      label: "Pior Categoria",
      value: metrics.worstCategory,
      subtitle: `${metrics.worstCategoryPercent.toFixed(1)}% não conforme`,
      icon: AlertTriangle,
      iconClass: "text-chart-nao-conforme",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="animate-fade-in">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="rounded-lg bg-accent p-2.5">
              <card.icon className={`h-5 w-5 ${card.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-xl font-bold text-foreground">{card.value}</p>
              {card.subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
