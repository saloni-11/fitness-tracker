import { parseD } from "../../src/core/dates";
import type { Day, Goals } from "../../src/core/types";

/** Everything the views need. Views are pure functions of this state. */
export interface AppState {
  days: Record<string, Day>;
  goals: Goals;
  // The training plan is free-form JSON written by the logging workflow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  date: string;
  today: string;
  tab: "today" | "trends" | "plan";
  range: number;
}

export const LOCALE = "en-AU";

/** [key, label, unit, css colour variable] */
export const MACROS: [string, string, string, string][] = [
  ["kcal", "Calories", "kcal", "--kcal"],
  ["protein", "Protein", "g", "--protein"],
  ["carbs", "Carbs", "g", "--carbs"],
  ["fat", "Fat", "g", "--fat"],
];

/** [key, label, unit] */
export const MICROS: [string, string, string][] = [
  ["fiber", "Fibre", "g"], ["sugar", "Sugar", "g"], ["satfat", "Saturated fat", "g"],
  ["sodium", "Sodium", "mg"], ["potassium", "Potassium", "mg"], ["calcium", "Calcium", "mg"],
  ["iron", "Iron", "mg"], ["magnesium", "Magnesium", "mg"], ["vitC", "Vitamin C", "mg"],
  ["vitD", "Vitamin D", "mcg"], ["b12", "Vitamin B12", "mcg"], ["caffeine", "Caffeine", "mg"],
];

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const fmt = (v: unknown, decimals = 0): string =>
  Number(v || 0).toLocaleString(LOCALE, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

export const niceDate = (s: string): string =>
  parseD(s).toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" });

export const shortDate = (s: string): string =>
  parseD(s).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });

export const dayOf = (S: AppState, date: string): Day =>
  S.days[date] ?? { date, food: [], workouts: [], drinks: [] };
