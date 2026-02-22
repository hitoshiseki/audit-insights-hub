import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import type { AuditRow } from "@/types/audit";

export function filterByDateRange(
  rows: AuditRow[],
  startDate?: Date | null,
  endDate?: Date | null
): AuditRow[] {
  if (!startDate && !endDate) return rows;

  return rows.filter((row) => {
    const date = row.auditDate;
    if (startDate && endDate) {
      return isWithinInterval(date, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    }
    if (startDate) return date >= startOfDay(startDate);
    if (endDate) return date <= endOfDay(endDate);
    return true;
  });
}

export function getDateRange(rows: AuditRow[]): { min: Date; max: Date } | null {
  if (rows.length === 0) return null;
  const dates = rows.map((r) => r.auditDate.getTime());
  return { min: new Date(Math.min(...dates)), max: new Date(Math.max(...dates)) };
}
