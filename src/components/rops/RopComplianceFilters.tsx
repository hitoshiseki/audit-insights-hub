import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { ROP_AREAS, ROP_LEVEL_ORDER } from "@/lib/rop-levels";
import type { AuditRow } from "@/types/audit";

export const ALL = "__all__";

/** Params exclusivos da aba "Adesão às ROPs". */
export const ROP_FILTER_KEYS = ["area", "auditor", "nivel", "lideranca"];

export interface RopFilters {
  area: string;
  auditor: string;
  nivel: string;
  lideranca: string;
}

export function useRopFilters () {
  const { searchParams, setParam } = useDashboardFilters();

  const filters: RopFilters = {
    area: searchParams.get("area") || ALL,
    auditor: searchParams.get("auditor") || ALL,
    nivel: searchParams.get("nivel") || ALL,
    lideranca: searchParams.get("lideranca") || ALL,
  };

  const hasExtraFilters = Object.values(filters).some((v) => v !== ALL);

  return { filters, setParam, hasExtraFilters };
}

interface RopComplianceFiltersProps {
  rows: AuditRow[];
}

/** Selects extras renderizados no slot `children` do GlobalFilters. */
export function RopComplianceFilters ({ rows }: RopComplianceFiltersProps) {
  const { filters, setParam } = useRopFilters();

  const auditors = Array.from(new Set(rows.map((r) => r.auditor).filter(Boolean))).sort();
  const leaderships = Array.from(
    new Set(rows.map((r) => r.leadershipPresent).filter(Boolean))
  ).sort();

  return (
    <>
      <Select value={filters.area} onValueChange={(v) => setParam("area", v)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {ROP_AREAS.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.auditor} onValueChange={(v) => setParam("auditor", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os auditores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os auditores</SelectItem>
          {auditors.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.nivel} onValueChange={(v) => setParam("nivel", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Todos os níveis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os níveis</SelectItem>
          {ROP_LEVEL_ORDER.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.lideranca} onValueChange={(v) => setParam("lideranca", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Liderança presente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Liderança: todas</SelectItem>
          {leaderships.map((l) => (
            <SelectItem key={l} value={l}>
              Liderança: {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
