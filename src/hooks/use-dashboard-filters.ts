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
 * startDate, endDate, and sector.
 *
 * For module-specific extra params (e.g. prontuario) use the returned
 * `setParam` / `searchParams` directly.
 */
export function useDashboardFilters () {
  const [searchParams, setSearchParams] = useSearchParams();

  const startDate = parseDateParam(searchParams.get("startDate"));
  const endDate = parseDateParam(searchParams.get("endDate"));
  const selectedSector = searchParams.get("sector") || "__all__";

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

  /**
   * Clears the base date+sector filters plus any extra param keys passed in.
   */
  const clearFilters = useCallback(
    (extraKeys: string[] = []) => {
      setSearchParams((prev) => {
        prev.delete("startDate");
        prev.delete("endDate");
        prev.delete("sector");
        extraKeys.forEach((k) => prev.delete(k));
        return prev;
      });
    },
    [setSearchParams]
  );

  /**
   * Generic setter for module-specific params not covered above
   * (e.g. "prontuario").
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
    setStartDate,
    setEndDate,
    setSector,
    clearFilters,
    setParam,
  };
}
