import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QuestionChart } from "@/components/QuestionChart";
import type { CategoryGroup } from "@/types/audit";

interface CategorySectionProps {
  group: CategoryGroup;
}

export function CategorySection({ group }: CategorySectionProps) {
  return (
    <div id={`category-${encodeURIComponent(group.category)}`}>
      <Accordion type="single" collapsible defaultValue="content">
        <AccordionItem value="content" className="border-none">
          <AccordionTrigger className="rounded-lg px-4 py-3 hover:bg-accent/50 hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <span className="text-base font-semibold text-foreground">{group.category}</span>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                {group.questions.length} pergunta{group.questions.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.avgConforme.toFixed(1)}% conforme
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 pb-1">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.questions.map((stats) => (
                <QuestionChart key={stats.question.fullHeader} stats={stats} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
