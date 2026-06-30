import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";
import type { CategoryObservation } from "@/lib/aggregators-qualitative";

interface ObservationsListProps {
  observations: { category: string; items: CategoryObservation[] }[];
}

export function ObservationsList ({ observations }: ObservationsListProps) {
  if (observations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
        <MessageSquareText className="h-8 w-8" />
        <p>Nenhuma observação registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {observations.map((group) => (
        <Accordion key={group.category} type="single" collapsible defaultValue="content">
          <AccordionItem value="content" className="border-none">
            <AccordionTrigger className="rounded-lg px-4 py-3 hover:bg-accent/50 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="text-base font-semibold text-foreground">{group.category}</span>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {group.items.length} observaç{group.items.length !== 1 ? "ões" : "ão"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-1">
              <div className="space-y-3">
                {group.items.map((item, idx) => (
                  <Card key={idx}>
                    <CardContent className="space-y-1.5 p-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.sector || "—"}</span>
                        {item.prontuario && (
                          <>
                            <span>•</span>
                            <span>Prontuário: {item.prontuario}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{format(item.date, "dd/MM/yyyy")}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
