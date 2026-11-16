import { describe, expect, it } from "vitest";
import { kcalGoal, weekPosition } from "../src/core/budget";
import { dayKey, shift, weekDates, weekStart } from "../src/core/dates";
import type { Day, Goals } from "../src/core/types";

const goals: Goals = {
  kcal: 2114,
  weekBudget: 14800,
  kcalByDay: { mon: 1850, tue: 1850, wed: 1850, thu: 1850, fri: 2400, sat: 2800, sun: 2000 },
};

const eat = (date: string, kcal: number): Day => ({ date, food: [{ id: "x", name: "x", kcal }] });

describe("dates", () => {
  it("knows weekdays", () => {
    expect(dayKey("2026-11-15")).toBe("sun");
    expect(dayKey("2026-11-09")).toBe("mon");
  });
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday belongs to the week that began Monday
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekDates("2026-11-12")).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15",
    ]);
  });
  it("shifts across month and year ends", () => {
    expect(shift("2026-10-31", 1)).toBe("2026-11-01");
    expect(shift("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("kcalGoal", () => {
  it("uses the weekday target", () => {
    expect(kcalGoal(goals, "2026-11-10")).toBe(1850); // Tue
    expect(kcalGoal(goals, "2026-11-13")).toBe(2400); // Fri
    expect(kcalGoal(goals, "2026-11-14")).toBe(2800); // Sat
    expect(kcalGoal(goals, "2026-11-15")).toBe(2000); // Sun
  });
  it("falls back to the flat goal", () => {
    expect(kcalGoal({ kcal: 2100 }, "2026-11-10")).toBe(2100);
    expect(kcalGoal({}, "2026-11-10")).toBe(0);
  });
  it("daily targets leave 200 kcal of slack against the weekly budget", () => {
    const total = weekDates("2026-11-09").reduce((a, d) => a + kcalGoal(goals, d), 0);
    expect(total).toBe(14600);
  });
});

describe("weekPosition", () => {
  const days: Record<string, Day> = {
    "2026-11-09": eat("2026-11-09", 2748),
    "2026-11-10": eat("2026-11-10", 1640),
    "2026-11-11": eat("2026-11-11", 1487.4),
    "2026-11-08": eat("2026-11-08", 9999), // previous week: must be ignored
  };

  it("reports used, left and the plan for the remaining days", () => {
    const w = weekPosition(days, goals, "2026-11-11", "2026-11-11")!;
    expect(w.weekStart).toBe("2026-11-09");
    expect(w.used).toBe(5875.4);
    expect(w.left).toBe(8924.6);
    expect(w.daysToGo).toBe(4); // Thu, Fri, Sat, Sun
    expect(w.planned).toBe(1850 + 2400 + 2800 + 2000);
    expect(w.projected).toBe(5875.4 + 9050);
    expect(w.perDay).toBe(Math.round(8924.6 / 4));
  });

  it("handles a finished week and a missing budget", () => {
    const done = weekPosition(days, goals, "2026-11-10", "2026-11-20")!;
    expect(done.daysToGo).toBe(0);
    expect(done.perDay).toBe(0);
    expect(weekPosition(days, { kcal: 2000 }, "2026-11-10", "2026-11-10")).toBeNull();
  });
});
