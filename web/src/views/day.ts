import { kcalGoal, weekPosition } from "../../../src/core/budget";
import { burned, dayTotals, num, Totals } from "../../../src/core/totals";
import type { Day, FoodItem, PainValue, Workout } from "../../../src/core/types";
import { AppState, MACROS, MEALS, MICROS, dayOf, esc, fmt, niceDate, shortDate } from "../ui";
import { eventCard, todaysSession } from "./session";

const goalOf = (S: AppState, k: string): number => num((S.goals as Record<string, unknown>)[k]);

function macroRow(S: AppState, k: string, label: string, unit: string, color: string, val: number): string {
  const g = goalOf(S, k);
  const pct = g ? Math.min(100, (val / g) * 100) : 0;
  const over = g && val > g * 1.05;
  return `<div class="macro"><span class="lab">${label}</span>
    <div class="bar"><i style="width:${pct}%;background:var(${over ? "--over" : color})"></i></div>
    <span class="val num">${fmt(val, 1)}${g ? " / " + fmt(g) : ""} ${unit}</span></div>`;
}

export function weekCard(S: AppState): string {
  const w = weekPosition(S.days, S.goals, S.date, S.today);
  if (!w) return "";
  const by = S.goals.kcalByDay || {};
  const pct = Math.min(100, (w.used / w.budget) * 100);
  return `<div class="card"><div class="chead"><h2>This week</h2><span class="muted small">from Mon ${shortDate(w.weekStart)}</span></div>
    <div class="kcalrow" style="margin-bottom:10px">
      <div><div class="big num" style="font-size:44px">${fmt(w.used)}</div><div class="muted small">of ${fmt(w.budget)} kcal weekly budget</div></div>
      <div><div class="big num" style="font-size:44px;color:${w.left < 0 ? "var(--over)" : "var(--fg)"}">${fmt(Math.abs(w.left))}</div>
        <div class="muted small">${w.left < 0 ? "kcal over budget" : "kcal left"}${w.daysToGo ? ` · ${w.daysToGo} day${w.daysToGo > 1 ? "s" : ""} to go` : ""}</div></div>
    </div>
    <div class="bar"><i style="width:${pct}%;background:var(${w.left < 0 ? "--over" : "--kcal"})"></i></div>
    <div class="hint">${w.daysToGo
      ? `About ${fmt(w.perDay)} kcal a day for the rest of the week. Plan: ${fmt(w.planned)} kcal (finish at ${fmt(w.projected)}).`
      : "Week complete."}
      Daily targets: Mon–Thu ${fmt(by.mon)}, Fri ${fmt(by.fri)}, Sat ${fmt(by.sat)}, Sun ${fmt(by.sun)}.</div></div>`;
}

function nutritionCard(S: AppState, d: Day, t: Totals): string {
  const gk = kcalGoal(S.goals, S.date);
  const left = gk ? gk - t.kcal : null;
  const out = burned(d);
  const microGoals = S.goals.micros || {};
  const micros = MICROS.map(([k, l, u]) => {
    const g = num(microGoals[k]);
    return `<tr><td>${l}</td><td class="num">${fmt((t as Record<string, number>)[k], 1)} ${u}${g ? ` <span class="muted">/ ${fmt(g, 1)}</span>` : ""}</td></tr>`;
  }).join("");
  return `<div class="card">
    <div class="chead"><h2>Nutrition</h2><span class="muted small">${S.date === S.today ? "Today" : niceDate(S.date)}</span></div>
    <div class="kcalrow">
      <div><div class="big num" style="color:var(--kcal)">${fmt(t.kcal)}</div><div class="muted small">kcal eaten</div></div>
      ${left != null
        ? `<div><div class="big num" style="color:${left < 0 ? "var(--over)" : "var(--fg)"}">${fmt(Math.abs(left))}</div><div class="muted small">${left < 0 ? "kcal over goal" : "kcal left of " + fmt(gk)}</div></div>`
        : ""}
      ${out ? `<div><div class="big num">${fmt(out)}</div><div class="muted small">kcal burned</div></div>` : ""}
    </div>
    ${t.drinkKcal ? `<div class="small muted" style="margin:-8px 0 8px">Includes ${fmt(t.drinkKcal)} kcal from ${fmt(t.std, 1)} standard drink${t.std === 1 ? "" : "s"}</div>` : ""}
    ${MACROS.slice(1).map(([k, l, u, c]) => macroRow(S, k, l, u, c, (t as Record<string, number>)[k])).join("")}
    <details ${(d.food || []).length ? "open" : ""}><summary>Micronutrients</summary><table class="micros">${micros}</table></details>
  </div>`;
}

function foodItem(f: FoodItem): string {
  return `<li><div class="iname">${esc(f.name)}${f.amount ? ` <span class="muted small">· ${esc(f.amount)}</span>` : ""}</div>
    <div class="meta num">${fmt(f.kcal)} kcal · P ${fmt(f.protein, 1)} · C ${fmt(f.carbs, 1)} · F ${fmt(f.fat, 1)}</div></li>`;
}

function foodCard(d: Day): string {
  const food = d.food || [];
  const byMeal = MEALS.map((m) => {
    const items = food.filter((f) => (f.meal || "snack") === m);
    if (!items.length) return "";
    const mt = dayTotals({ date: d.date, food: items });
    return `<div class="mealh">${m}<span class="num">${fmt(mt.kcal)} kcal · P ${fmt(mt.protein, 1)} g</span></div><ul class="list">${items.map(foodItem).join("")}</ul>`;
  }).join("");
  return `<div class="card"><div class="chead"><h2>Food</h2><span class="muted small">${food.length} item${food.length === 1 ? "" : "s"}</span></div>
    ${food.length ? byMeal : `<div class="empty">No food logged for this day.</div>`}</div>`;
}

function statBox(S: AppState, k: "steps" | "weight" | "water" | "sleep", label: string, val: number | undefined, unit: string): string {
  const g = k === "weight" ? 0 : goalOf(S, k);
  const pct = g && val != null ? Math.min(100, (val / g) * 100) : 0;
  return `<div class="stat"><div class="k">${label}</div>
    <div class="v num">${val != null ? fmt(val, 2) : "–"}${unit && val != null ? `<small>${unit}</small>` : ""}</div>
    ${g ? `<div class="bar" style="margin-top:4px"><i style="width:${pct}%;background:var(--accent)"></i></div><div class="muted small num">goal ${fmt(g, 1)}${unit ? " " + unit : ""}</div>` : ""}
  </div>`;
}

function workoutMeta(w: Workout): string {
  const effort = w.effort ?? w.rpe;
  const zones = w.zones ? Object.entries(w.zones).map(([z, v]) => `${esc(z)} ${esc(v)}`).join(" · ") : "";
  const line1 = [
    w.duration ? fmt(w.duration) + " min" : "",
    w.kcal ? fmt(w.kcal) + " active kcal" : "",
    w.totalKcal ? fmt(w.totalKcal) + " total" : "",
    w.avgHR ? "avg HR " + fmt(w.avgHR) : "",
    w.maxHR ? "max " + fmt(w.maxHR) : "",
    effort ? "effort " + esc(effort) + "/10" : "",
  ].filter(Boolean).join(" · ");
  return `<div class="meta num">${line1}</div>${zones ? `<div class="meta num">Zones: ${zones}</div>` : ""}`;
}

function workoutsCard(d: Day): string {
  const wk = d.workouts || [];
  return `<div class="card"><div class="chead"><h2>Workouts</h2></div>
    ${wk.length
      ? `<ul class="list">${wk.map((w) => `<li><div class="iname"><span class="chip">${esc(w.type || "Workout")}</span>${esc(w.name)}</div>
          ${workoutMeta(w)}
          ${w.detail ? `<div class="small" style="white-space:pre-wrap;margin-top:4px">${esc(w.detail)}</div>` : ""}</li>`).join("")}</ul>`
      : `<div class="empty">No workout logged. Rest days count too.</div>`}</div>`;
}

function caffeineCard(S: AppState, d: Day, t: Totals): string {
  const limit = num((S.goals.micros || {}).caffeine) || 400;
  const c = t.caffeine || 0;
  const items = (d.food || []).filter((f) => num(f.caffeine) > 0);
  return `<div class="card"><div class="chead"><h2>Caffeine</h2><span class="muted small num">${fmt(c)} / ${fmt(limit)} mg</span></div>
    <div class="bar"><i style="width:${Math.min(100, (c / limit) * 100)}%;background:var(${c > limit ? "--over" : "--carbs"})"></i></div>
    ${items.length ? `<div class="meta" style="margin-top:8px">${items.map((f) => esc(f.name) + (f.amount ? " (" + esc(f.amount) + ")" : "") + " · " + fmt(f.caffeine) + " mg").join("<br>")}</div>` : `<div class="hint">No caffeine logged.</div>`}
  </div>`;
}

function drinksCard(d: Day, t: Totals): string {
  const dr = d.drinks || [];
  if (!dr.length) return "";
  return `<div class="card"><div class="chead"><h2>Drinks</h2><span class="muted small num">${fmt(t.std, 1)} std · ${fmt(t.drinkKcal)} kcal</span></div>
    <ul class="list">${dr.map((x) => `<li><div class="iname">${esc(x.name)}${x.amount ? ` <span class="muted small">· ${esc(x.amount)}</span>` : ""}</div>
      <div class="meta num">${fmt(x.std, 1)} std drink · ${fmt(x.kcal)} kcal · ${fmt(x.carbs)} g carbs</div></li>`).join("")}</ul></div>`;
}

const PAIN_LABELS: Record<string, string> = {
  shins: "Shins", achillesL: "Left Achilles", outerThighL: "Left outer thigh", heels: "Heels", shoulder: "Shoulder",
};
const painScore = (v: PainValue): number => (typeof v === "number" ? v : num(v?.score));
const painNote = (v: PainValue): string => (typeof v === "number" ? "" : v?.note || "");

/** Most recent earlier day that recorded a score for this body part. */
function previousPain(S: AppState, key: string): number | null {
  const earlier = Object.keys(S.days).filter((k) => k < S.date).sort().reverse();
  for (const k of earlier) {
    const v = S.days[k].pain?.[key];
    if (v != null) return painScore(v);
  }
  return null;
}

function bodyCheckCard(S: AppState, d: Day): string {
  const pain = d.pain || {};
  const keys = Object.keys(pain);
  if (!keys.length && !d.notes) return "";
  const rows = keys.map((k) => {
    const score = painScore(pain[k]);
    const prev = previousPain(S, k);
    const worse = prev != null && score > prev;
    const shinHigh = k === "shins" && score > 3;
    const flag = shinHigh ? `<span class="chip warn">above 3</span>` : worse ? `<span class="chip warn">worse</span>` : "";
    const note = painNote(pain[k]);
    return `<tr><td>${esc(PAIN_LABELS[k] || k)}${note ? ` <span class="muted small">· ${esc(note)}</span>` : ""}</td>
      <td>${flag}${fmt(score)}/10${prev != null ? ` <span class="muted small">(was ${fmt(prev)})</span>` : ""}</td></tr>`;
  }).join("");
  return `<div class="card"><div class="chead"><h2>Body check</h2></div>
    ${rows ? `<table class="kv">${rows}</table>` : ""}
    ${d.notes ? `<div class="small" style="white-space:pre-wrap;margin-top:${rows ? 10 : 0}px">${esc(d.notes)}</div>` : ""}</div>`;
}

export function renderDay(S: AppState): string {
  const d = dayOf(S, S.date);
  const t = dayTotals(d);
  return `<div class="grid">
    <div class="col">
      ${weekCard(S)}
      ${nutritionCard(S, d, t)}
      ${foodCard(d)}
    </div>
    <div class="col">
      <div class="card"><div class="chead"><h2>Body &amp; activity</h2></div>
        <div class="stats">
          ${statBox(S, "steps", "Steps", d.steps, "")}
          ${statBox(S, "weight", "Weight", d.weight, "kg")}
          ${statBox(S, "water", "Water", d.water, "L")}
          ${statBox(S, "sleep", "Sleep", d.sleep, "h")}
        </div>
      </div>
      ${workoutsCard(d)}
      ${bodyCheckCard(S, d)}
      ${eventCard(S, S.date)}
      ${todaysSession(S)}
      ${caffeineCard(S, d, t)}
      ${drinksCard(d, t)}
    </div>
  </div>`;
}
