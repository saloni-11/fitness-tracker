import type { Day } from "./types";

export const MACRO_KEYS = ["kcal", "protein", "carbs", "fat"] as const;
export const MICRO_KEYS = [
  "fiber", "sugar", "satfat", "sodium", "potassium", "calcium",
  "iron", "magnesium", "vitC", "vitD", "b12", "caffeine",
] as const;
export const NUTRIENT_KEYS = [...MACRO_KEYS, ...MICRO_KEYS] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Totals = Record<NutrientKey, number> & { drinkKcal: number; std: number };

/**
 * All sums are done in integer thousandths so that 0.1 + 0.2 style float
 * noise never leaks into a total (674.2 + 195 + ... must come out exact).
 */
const SCALE = 1000;

export function num(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
}

const toInt = (v: unknown): number => Math.round(num(v) * SCALE);

/** Exact sum of a list of numbers (to 3 decimal places). */
export function sum(values: unknown[]): number {
  let acc = 0;
  for (const v of values) acc += toInt(v);
  return acc / SCALE;
}

/**
 * Totals for one day. Food supplies every nutrient; drinks add their kcal and
 * carbs to the day (rule from the logging instructions) and are also reported
 * separately as drinkKcal / std.
 */
export function dayTotals(day: Day | undefined): Totals {
  const acc = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Record<NutrientKey, number>;
  let drinkKcal = 0;
  let std = 0;

  for (const f of day?.food ?? []) {
    for (const k of NUTRIENT_KEYS) acc[k] += toInt(f[k]);
  }
  for (const d of day?.drinks ?? []) {
    drinkKcal += toInt(d.kcal);
    std += toInt(d.std);
    acc.carbs += toInt(d.carbs);
  }
  acc.kcal += drinkKcal;

  const out = { drinkKcal: drinkKcal / SCALE, std: std / SCALE } as Totals;
  for (const k of NUTRIENT_KEYS) out[k] = acc[k] / SCALE;
  return out;
}

/** Active kcal burned across the day's workouts. */
export function burned(day: Day | undefined): number {
  return sum((day?.workouts ?? []).map((w) => w.kcal));
}
