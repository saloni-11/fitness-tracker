import { kcalGoal } from "../../../src/core/budget";
import { shift } from "../../../src/core/dates";
import { dayTotals, num, sum } from "../../../src/core/totals";
import { AppState, dayOf, fmt, niceDate, shortDate } from "../ui";

const W = 640, H = 190, PL = 46, PR = 10, PT = 14, PB = 26;
const IW = W - PL - PR, IH = H - PT - PB;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function xLabels(dates: string[], x: (i: number) => number): string {
  const every = dates.length > 20 ? 7 : dates.length > 10 ? 3 : 1;
  return dates.map((d, i) =>
    (dates.length - 1 - i) % every === 0 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${shortDate(d)}</text>` : "",
  ).join("");
}

/**
 * Bar chart. `goal` is either one number (dashed line across the chart) or one
 * target per day (a short marker over each bar), which is how calories are
 * shown because the target changes by weekday.
 */
export function barChart(
  dates: string[], vals: number[], goal: number | number[], color: string, unit: string, overBad = true,
): string {
  const goals = Array.isArray(goal) ? goal : dates.map(() => goal || 0);
  const flat = Array.isArray(goal) ? 0 : goal;
  const max = niceMax(Math.max(...goals, ...vals.map((v) => v || 0)) * 1.05);
  const y = (v: number) => PT + IH - (v / max) * IH;
  const bw = IW / dates.length;

  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} per day">`;
  for (const t of [0, max / 2, max]) {
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${PL - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  }
  vals.forEach((v, i) => {
    const g = goals[i];
    if (v) {
      const over = overBad && g && v > g * 1.05;
      s += `<rect x="${PL + i * bw + bw * 0.18}" y="${y(v)}" width="${bw * 0.64}" height="${Math.max(0, PT + IH - y(v))}" rx="2" fill="var(${over ? "--over" : color})"><title>${niceDate(dates[i])}: ${fmt(v, 1)} ${unit}${g ? ` (target ${fmt(g)})` : ""}</title></rect>`;
    }
    if (g && !flat) {
      s += `<line x1="${PL + i * bw + bw * 0.06}" x2="${PL + i * bw + bw * 0.94}" y1="${y(g)}" y2="${y(g)}" stroke="var(--fg)" stroke-width="1.5"/>`;
    }
  });
  if (flat) {
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y(flat)}" y2="${y(flat)}" stroke="var(--fg)" stroke-dasharray="4 4" stroke-width="1.2"/><text x="${W - PR}" y="${y(flat) - 5}" text-anchor="end" style="fill:var(--fg)">goal ${fmt(flat, 1)}</text>`;
  }
  return s + xLabels(dates, (i) => PL + i * bw + bw / 2) + "</svg>";
}

export function lineChart(dates: string[], vals: (number | null)[], goal: number | null, unit: string): string {
  const pts = vals.map((v, i) => [i, v] as [number, number | null]).filter((p): p is [number, number] => p[1] != null);
  if (!pts.length) return `<div class="empty">No weight logged in this period yet.</div>`;
  const all = pts.map((p) => p[1]).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1);
  const x = (i: number) => PL + (dates.length === 1 ? IW / 2 : (i / (dates.length - 1)) * IW);
  const y = (v: number) => PT + IH - ((v - lo) / (hi - lo)) * IH;

  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} over time">`;
  for (const t of [lo, (lo + hi) / 2, hi]) {
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${PL - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t, 1)}</text>`;
  }
  if (goal) {
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--fg)" stroke-dasharray="4 4"/><text x="${W - PR}" y="${y(goal) - 5}" text-anchor="end" style="fill:var(--fg)">target ${fmt(goal, 1)} ${unit}</text>`;
  }
  s += `<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p) => x(p[0]) + "," + y(p[1])).join(" ")}"/>`;
  pts.forEach((p, j) => {
    s += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="${j === pts.length - 1 ? 5 : 3}" fill="var(--accent)"><title>${niceDate(dates[p[0]])}: ${fmt(p[1], 1)} ${unit}</title></circle>`;
  });
  return s + xLabels(dates, x) + "</svg>";
}

const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export function renderTrends(S: AppState): string {
  const dates = Array.from({ length: S.range }, (_, i) => shift(S.today, i - (S.range - 1)));
  const ds = dates.map((d) => dayOf(S, d));
  const tt = ds.map(dayTotals);
  const logged = ds.map((d, i) => ((d.food || []).length ? i : -1)).filter((i) => i >= 0);
  const stepDays = ds.filter((d) => d.steps != null);
  const weights = ds.filter((d) => d.weight != null);
  const dW = weights.length > 1 ? weights[weights.length - 1].weight! - weights[0].weight! : null;
  const nWorkouts = ds.reduce((a, d) => a + (d.workouts || []).length, 0);
  const seg = [7, 14, 30, 90].map((r) => `<button data-range="${r}" aria-pressed="${S.range === r}">${r}d</button>`).join("");
  const g = S.goals;

  return `
  <div class="chead"><span class="muted small">Last ${S.range} days · averages use logged days only</span><div class="seg">${seg}</div></div>
  <div class="tiles">
    <div class="stat"><div class="k">Avg calories</div><div class="v num">${logged.length ? fmt(avg(logged.map((i) => tt[i].kcal))) : "–"}<small>kcal</small></div></div>
    <div class="stat"><div class="k">Avg protein</div><div class="v num">${logged.length ? fmt(avg(logged.map((i) => tt[i].protein))) : "–"}<small>g</small></div></div>
    <div class="stat"><div class="k">Avg steps</div><div class="v num">${stepDays.length ? fmt(avg(stepDays.map((d) => d.steps!))) : "–"}</div></div>
    <div class="stat"><div class="k">Workouts</div><div class="v num">${nWorkouts}</div></div>
    <div class="stat"><div class="k">Weight change</div><div class="v num">${dW != null ? (dW > 0 ? "+" : "") + fmt(dW, 1) : "–"}<small>kg</small></div></div>
    <div class="stat"><div class="k">Drinks</div><div class="v num">${fmt(sum(tt.map((t) => t.std)), 1)}<small>std · ${fmt(sum(tt.map((t) => t.drinkKcal)))} kcal</small></div></div>
  </div>
  <div class="grid">
    <div class="card"><div class="chead"><h2>Calories</h2><span class="muted small">line over each bar = that day's target</span></div>${barChart(dates, tt.map((t) => t.kcal), dates.map((d) => kcalGoal(g, d)), "--kcal", "kcal")}</div>
    <div class="card"><div class="chead"><h2>Protein</h2></div>${barChart(dates, tt.map((t) => t.protein), num(g.protein), "--protein", "g", false)}</div>
    <div class="card"><div class="chead"><h2>Steps</h2></div>${barChart(dates, ds.map((d) => d.steps || 0), num(g.steps), "--accent", "steps", false)}</div>
    <div class="card"><div class="chead"><h2>Weight</h2></div>${lineChart(dates, ds.map((d) => d.weight ?? null), num(g.targetWeight) || null, "kg")}</div>
    <div class="card"><div class="chead"><h2>Water</h2><span class="muted small">litres per day</span></div>${barChart(dates, ds.map((d) => num(d.water)), num(g.water), "--protein", "L", false)}</div>
    <div class="card"><div class="chead"><h2>Drinks</h2><span class="muted small">standard drinks per day</span></div>${barChart(dates, tt.map((t) => t.std), 0, "--fat", "std drinks")}</div>
  </div>`;
}
