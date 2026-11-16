/**
 * Runs the totals code and the three views over whole export files: always the
 * synthetic sample, and the real export too when data/export.json exists
 * (that folder is gitignored, so CI only ever sees the sample).
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayTotals } from "../src/core/totals";
import type { Day, ExportFile, Goals } from "../src/core/types";
import type { AppState } from "../web/src/ui";
import { renderDay } from "../web/src/views/day";
import { renderPlan } from "../web/src/views/plan";
import { renderTrends } from "../web/src/views/trends";

const files = ["fixtures/sample-export.json", "data/export.json"].filter((p) => existsSync(p));
const round1 = (v: number) => Math.round(v * 10) / 10;

function plain(day: Day) {
  let kcal = 0, protein = 0;
  for (const f of day.food ?? []) { kcal += Number(f.kcal ?? 0); protein += Number(f.protein ?? 0); }
  for (const d of day.drinks ?? []) kcal += Number(d.kcal ?? 0);
  return { kcal: round1(kcal), protein: round1(protein) };
}

describe.each(files)("%s", (path) => {
  const data = JSON.parse(readFileSync(path, "utf8")) as ExportFile;
  const dates = Object.keys(data.days).sort();
  const state = (date: string, tab: AppState["tab"]): AppState => ({
    days: data.days, goals: (data.settings.goals as Goals) ?? {}, plan: data.settings.plan ?? null,
    date, today: dates[dates.length - 1], tab, range: 30,
  });

  it("has days", () => expect(dates.length).toBeGreaterThan(0));

  it("per-day kcal and protein match a plain sum of the file", () => {
    for (const date of dates) {
      const t = dayTotals(data.days[date]);
      expect({ date, kcal: round1(t.kcal), protein: round1(t.protein) }).toEqual({ date, ...plain(data.days[date]) });
      expect(t.kcal).toBe(Math.round(t.kcal * 1000) / 1000); // no float noise
    }
  });

  it("renders every day, the trends and the plan without leaking undefined/NaN", () => {
    const pages = [...dates.map((d) => renderDay(state(d, "today"))), renderTrends(state(dates[0], "trends")), renderPlan(state(dates[0], "plan"))];
    for (const html of pages) {
      expect(html.length).toBeGreaterThan(500);
      expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
  });

  it("shows each food item on its day", () => {
    for (const date of dates) {
      const html = renderDay(state(date, "today"));
      const names = (data.days[date].food ?? []).map((f) => f.name);
      const shown = (html.match(/<li><div class="iname">/g) ?? []).length;
      expect(shown).toBeGreaterThanOrEqual(names.length);
    }
  });
});
