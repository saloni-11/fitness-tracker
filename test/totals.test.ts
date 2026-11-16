import { describe, expect, it } from "vitest";
import { burned, dayTotals, num, sum } from "../src/core/totals";
import type { Day } from "../src/core/types";

describe("sum", () => {
  it("has no floating-point drift", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // the problem being avoided
    expect(sum([0.1, 0.2])).toBe(0.3);
    expect(sum([674.2, 195, 674.2, 195, 155, 67, 60, 120, 110, 65])).toBe(2315.4);
  });
  it("treats missing and non-numeric values as zero", () => {
    expect(sum([undefined, null, "", "abc", 5])).toBe(5);
    expect(num("12.5")).toBe(12.5);
  });
});

describe("dayTotals", () => {
  const day: Day = {
    date: "2026-11-10",
    food: [
      { id: "a", name: "A", kcal: 310.1, protein: 18.2, carbs: 16.5, fat: 19.2, satfat: 0.25 },
      { id: "b", name: "B", kcal: 640.3, protein: 36.6, carbs: 82, fat: 16.4, satfat: 0.25, caffeine: 95 },
      { id: "c", name: "No macros recorded" },
    ],
    drinks: [{ id: "d", name: "Beer", std: 1.4, kcal: 150, carbs: 13 }],
    workouts: [{ id: "w", name: "Run", kcal: 240 }, { id: "x", name: "Walk", kcal: 75.5 }],
  };

  it("sums food nutrients exactly", () => {
    const t = dayTotals(day);
    expect(t.protein).toBe(54.8);
    expect(t.fat).toBe(35.6);
    expect(t.satfat).toBe(0.5);
    expect(t.caffeine).toBe(95);
    expect(t.fiber).toBe(0);
  });

  it("counts drink kcal and carbs toward the day, and reports them separately", () => {
    const t = dayTotals(day);
    expect(t.kcal).toBe(1100.4); // 310.1 + 640.3 + 150
    expect(t.carbs).toBe(111.5); // 16.5 + 82 + 13
    expect(t.drinkKcal).toBe(150);
    expect(t.std).toBe(1.4);
  });

  it("handles empty and missing days", () => {
    expect(dayTotals(undefined).kcal).toBe(0);
    expect(dayTotals({ date: "2026-11-07" }).protein).toBe(0);
  });

  it("sums active workout kcal", () => {
    expect(burned(day)).toBe(315.5);
    expect(burned(undefined)).toBe(0);
  });
});
