import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { parse, format } from "date-fns";

function parseDateParam (val: string | null): Date | undefined {
  if (!val) return undefined;
  try {
    const d = parse(val, "yyyy-MM-dd", new Date());
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

/**
 * Manages the common URL-based filter state shared by all dashboards:
 * startDate, endDate, sector, and category.
 *
 * For module-specific extra params use the returned
 * `setParam` / `searchParams` directly.
 */
export function useDashboardFilters () {
  const [searchParams, setSearchParams] = useSearchParams();

  const startDate = parseDateParam(searchParams.get("startDate"));
  const endDate = parseDateParam(searchParams.get("endDate"));
  const selectedSector = searchParams.get("sector") || "__all__";
  const selectedCategory = searchParams.get("category") || "__all__";

  const setStartDate = useCallback(
    (d: Date | undefined) => {
      setSearchParams((prev) => {
        if (d) prev.set("startDate", format(d, "yyyy-MM-dd"));
        else prev.delete("startDate");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setEndDate = useCallback(
    (d: Date | undefined) => {
      setSearchParams((prev) => {
        if (d) prev.set("endDate", format(d, "yyyy-MM-dd"));
        else prev.delete("endDate");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setSector = useCallback(
    (sector: string) => {
      setSearchParams((prev) => {
        if (sector && sector !== "__all__") prev.set("sector", sector);
        else prev.delete("sector");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setCategory = useCallback(
    (category: string) => {
      setSearchParams((prev) => {
        if (category && category !== "__all__") prev.set("category", category);
        else prev.delete("category");
        return prev;
      });
    },
    [setSearchParams]
  );

  /**
   * Clears all base filters (date, sector, category) plus any extra param keys.
   */
  const clearFilters = useCallback(
    (extraKeys: string[] = []) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("startDate");
        next.delete("endDate");
        next.delete("sector");
        next.delete("category");
        extraKeys.forEach((k) => next.delete(k));
        return next;
      });
    },
    [setSearchParams]
  );

  /**
   * Generic setter for module-specific params not covered above.
   */
  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        if (value && value !== "__all__") prev.set(key, value);
        else prev.delete(key);
        return prev;
      });
    },
    [setSearchParams]
  );

  return {
    searchParams,
    startDate,
    endDate,
    selectedSector,
    selectedCategory,
    setStartDate,
    setEndDate,
    setSector,
    setCategory,
    clearFilters,
    setParam,
  };
}
