import { dayKey, weekDates, weekStart } from "./dates";
import { dayTotals, num, sum } from "./totals";
import type { Day, Goals } from "./types";

/** Calorie target for a date: the per-weekday target if set, else the flat goal. */
export function kcalGoal(goals: Goals, date: string): number {
  const byDay = goals.kcalByDay;
  if (byDay) {
    const v = num(byDay[dayKey(date)]);
    if (v) return v;
  }
  return num(goals.kcal);
}

export interface WeekPosition {
  weekStart: string;
  budget: number;
  /** kcal eaten on days up to and including `today`. */
  used: number;
  left: number;
  /** Days of this week that are still in the future. */
  daysToGo: number;
  /** Sum of the daily targets for those future days. */
  planned: number;
  /** Where the week lands if every remaining day hits its target. */
  projected: number;
  /** Average kcal per remaining day that uses up exactly what is left. */
  perDay: number;
}

/**
 * Position against the Monday-to-Sunday kcal budget for the week containing
 * `date`, as seen from `today`. Returns null when no weekly budget is set.
 */
export function weekPosition(
  days: Record<string, Day>,
  goals: Goals,
  date: string,
  today: string,
): WeekPosition | null {
  const budget = num(goals.weekBudget);
  if (!budget) return null;

  const dates = weekDates(date);
  const past = dates.filter((d) => d <= today);
  const future = dates.filter((d) => d > today);

  const used = sum(past.map((d) => dayTotals(days[d]).kcal));
  const planned = sum(future.map((d) => kcalGoal(goals, d)));
  const left = sum([budget, -used]);

  return {
    weekStart: weekStart(date),
    budget,
    used,
    left,
    daysToGo: future.length,
    planned,
    projected: sum([used, planned]),
    perDay: future.length ? Math.round(left / future.length) : 0,
  };
}
