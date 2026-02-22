import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import clsx from "clsx";

interface GlobalFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (d: Date | undefined) => void;
  onEndDateChange: (d: Date | undefined) => void;
  onClear: () => void;
  totalFiltered: number;
}

export function GlobalFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  totalFiltered,
}: GlobalFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={clsx(
              "justify-start text-left font-normal w-[160px]",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "dd/MM/yyyy") : "Data início"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={onStartDateChange}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={clsx(
              "justify-start text-left font-normal w-[160px]",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "dd/MM/yyyy") : "Data fim"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndDateChange}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {(startDate || endDate) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-3 w-3" />
          Limpar
        </Button>
      )}

      <div className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
        {totalFiltered} resposta{totalFiltered !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
