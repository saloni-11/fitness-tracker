import type { DayKey } from "./types";

/** Dates are plain local "YYYY-MM-DD" strings everywhere; no time zones. */

export const DKEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function ymd(d: Date): string {
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0")
  );
}

export function parseD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shift(s: string, days: number): string {
  const d = parseD(s);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function todayStr(now: Date = new Date()): string {
  return ymd(now);
}

export function dayKey(date: string): DayKey {
  return DKEYS[parseD(date).getDay()];
}

/** Monday of the week containing `date` (weeks run Monday to Sunday). */
export function weekStart(date: string): string {
  const d = parseD(date);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return ymd(d);
}

export function weekDates(date: string): string[] {
  const ws = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => shift(ws, i));
}
