import type { GanttScale } from './WorkSphereGantt';

export const DAY_MS = 86_400_000;
export const parseDateKeyUtc = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
};
export const addUtcDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
export const differenceInUtcDays = (later: Date, earlier: Date) => Math.round((later.getTime() - earlier.getTime()) / DAY_MS);
export const startOfUtcWeek = (date: Date) => addUtcDays(date, -((date.getUTCDay() + 6) % 7));
export const startOfUtcMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
export interface UtcWeekGroup { start: Date; endInclusive: Date; dayCount: number; }
export const createUtcWeekGroups = (rangeStart: Date, rangeEndExclusive: Date): UtcWeekGroup[] => {
  if (rangeEndExclusive <= rangeStart) return [];
  const groups: UtcWeekGroup[] = [];
  const totalDays = differenceInUtcDays(rangeEndExclusive, rangeStart);
  for (let offset = 0; offset < totalDays; offset += 7) {
    const start = addUtcDays(rangeStart, offset);
    const dayCount = Math.min(7, totalDays - offset);
    groups.push({ start, endInclusive: addUtcDays(start, dayCount - 1), dayCount });
  }
  return groups;
};
export const getPixelsPerDay = (scale: GanttScale) => scale === 'day' ? 42 : scale === 'week' ? 22 : 8;
export const createGanttRange = (scale: GanttScale, center: Date) => {
  if (scale === 'day') { const start = startOfUtcWeek(addUtcDays(center, -7)); return { start, end: addUtcDays(start, 42) }; }
  if (scale === 'week') { const start = startOfUtcWeek(center); return { start, end: addUtcDays(start, 112) }; }
  const start = new Date(Date.UTC(center.getUTCFullYear(), center.getUTCMonth() - 2, 1));
  return { start, end: new Date(Date.UTC(center.getUTCFullYear(), center.getUTCMonth() + 13, 1)) };
};
export interface BarGeometry { left: number; width: number; clippedStart: boolean; clippedEnd: boolean; durationDays: number; }
export const calculateBarGeometry = (startValue: string | undefined, endValue: string | undefined, rangeStart: Date, rangeEndExclusive: Date, pixelsPerDay: number): BarGeometry | null => {
  const start = parseDateKeyUtc(startValue); const end = parseDateKeyUtc(endValue);
  if (!start || !end || end < start || pixelsPerDay <= 0 || rangeEndExclusive <= rangeStart) return null;
  const taskEndExclusive = addUtcDays(end, 1);
  if (taskEndExclusive <= rangeStart || start >= rangeEndExclusive) return null;
  const visibleStart = start < rangeStart ? rangeStart : start;
  const visibleEnd = taskEndExclusive > rangeEndExclusive ? rangeEndExclusive : taskEndExclusive;
  return { left: differenceInUtcDays(visibleStart, rangeStart) * pixelsPerDay, width: Math.max(pixelsPerDay, differenceInUtcDays(visibleEnd, visibleStart) * pixelsPerDay), clippedStart: start < rangeStart, clippedEnd: taskEndExclusive > rangeEndExclusive, durationDays: differenceInUtcDays(taskEndExclusive, start) };
};
