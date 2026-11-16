/** Data model. Mirrors the export JSON (days / settings / recipes) one to one. */

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  id: string;
  name: string;
  amount?: string;
  meal?: Meal;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  satfat?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  vitC?: number;
  vitD?: number;
  b12?: number;
  caffeine?: number;
  [extra: string]: unknown;
}

export interface Drink {
  id: string;
  name: string;
  amount?: string;
  std?: number;
  kcal?: number;
  carbs?: number;
  [extra: string]: unknown;
}

export interface Workout {
  id: string;
  type?: string;
  name: string;
  duration?: number;
  /** Active kcal: this is what the dashboard sums as "burned". */
  kcal?: number;
  totalKcal?: number;
  avgHR?: number;
  maxHR?: number;
  effort?: number;
  /** Older entries used `rpe` for the same thing. */
  rpe?: number;
  zones?: Record<string, string>;
  detail?: string;
  [extra: string]: unknown;
}

export type PainValue = number | { score: number; note?: string };

export interface Day {
  date: string;
  food?: FoodItem[];
  drinks?: Drink[];
  workouts?: Workout[];
  steps?: number;
  water?: number;
  sleep?: number;
  weight?: number;
  pain?: Record<string, PainValue>;
  notes?: string;
  updated?: string;
  [extra: string]: unknown;
}

export interface Goals {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  steps?: number;
  water?: number;
  sleep?: number;
  targetWeight?: number;
  weekBudget?: number;
  kcalByDay?: Partial<Record<DayKey, number>>;
  micros?: Record<string, number>;
  statement?: string;
  [extra: string]: unknown;
}

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface ExportFile {
  exported: string;
  source: string;
  days: Record<string, Day>;
  settings: Record<string, unknown>;
  recipes: Record<string, unknown>;
}
