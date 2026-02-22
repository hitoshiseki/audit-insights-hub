import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import clsx from "clsx";

interface GlobalFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (d: Date | undefined) => void;
  onEndDateChange: (d: Date | undefined) => void;
  onClear: () => void;
  totalFiltered: number;
  /** Singular noun shown in the count badge, e.g. "resposta" or "prontuário" */
  countLabel?: string;
  sectors: string[];
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  /** Extra filter controls rendered after the sector selector */
  children?: React.ReactNode;
}

export function GlobalFilters ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  totalFiltered,
  countLabel = "resposta",
  sectors,
  selectedSector,
  onSectorChange,
  children,
}: GlobalFiltersProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const hasFilters =
    startDate || endDate || (selectedSector && selectedSector !== "__all__");

  return (
    <div className="border-b border-border bg-card/60 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Filtros</span>
        <div className="ml-auto rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          {totalFiltered} {countLabel}{totalFiltered !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Data início */}
        <Popover open={startOpen} onOpenChange={setStartOpen}>
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
              onSelect={(d) => {
                onStartDateChange(d);
                setStartOpen(false);
              }}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Data fim */}
        <Popover open={endOpen} onOpenChange={setEndOpen}>
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
              onSelect={(d) => {
                onEndDateChange(d);
                setEndOpen(false);
              }}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Setor */}
        <Select value={selectedSector} onValueChange={onSectorChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os setores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os setores</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Limpar */}
        {children}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
