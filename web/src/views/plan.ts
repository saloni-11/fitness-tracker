/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseD } from "../../../src/core/dates";
import { num } from "../../../src/core/totals";
import { AppState, LOCALE, MICROS, esc, fmt, niceDate } from "../ui";
import { exList, plyoBlockFor, sessionBody, swimBlockFor } from "./session";

const li = (items: string[] | undefined, cls = "small") =>
  (items || []).length ? `<ul class="${cls}">${items!.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";

function goalsCard(S: AppState): string {
  const g = S.goals;
  const by = g.kcalByDay || {};
  const row = (label: string, value: string) => `<tr><td>${label}</td><td>${value}</td></tr>`;
  const have = (v: unknown) => v != null && v !== "";
  const rows = [
    have(by.mon) ? row("Calories, Mon–Thu", fmt(by.mon) + " kcal") : "",
    have(by.fri) ? row("Calories, Friday", fmt(by.fri) + " kcal") : "",
    have(by.sat) ? row("Calories, Saturday", fmt(by.sat) + " kcal") : "",
    have(by.sun) ? row("Calories, Sunday", fmt(by.sun) + " kcal") : "",
    have(g.weekBudget) ? row("Weekly budget (Mon–Sun)", fmt(g.weekBudget) + " kcal") : "",
    have(g.protein) ? row("Protein", fmt(g.protein) + " g") : "",
    have(g.carbs) ? row("Carbs", fmt(g.carbs) + " g") : "",
    have(g.fat) ? row("Fat", fmt(g.fat) + " g") : "",
    have(g.water) ? row("Water", fmt(g.water, 1) + " L") : "",
    have(g.steps) ? row("Steps", fmt(g.steps)) : "",
    have(g.sleep) ? row("Sleep", fmt(g.sleep, 2) + " h") : "",
    have(g.targetWeight) ? row("Target weight", fmt(g.targetWeight, 1) + " kg") : "",
  ].join("");
  const micros = MICROS.filter(([k]) => num((g.micros || {})[k]))
    .map(([k, l, u]) => row(l, fmt((g.micros || {})[k], 1) + " " + u)).join("");
  return `<div class="card"><div class="chead"><h2>Goals &amp; daily targets</h2></div>
    ${g.statement ? `<p class="goaltext" style="margin-bottom:14px">${esc(g.statement)}</p>` : ""}
    ${rows ? `<table class="kv">${rows}</table>` : `<div class="empty">No targets set yet.</div>`}
    ${micros ? `<details><summary>Micronutrient targets</summary><table class="kv" style="margin-top:6px">${micros}</table></details>` : ""}
  </div>`;
}

function blocks(title: string, sub: string, notes: string[] | undefined, list: any[], current: any, body: (b: any) => string): string {
  return `<div class="card" style="margin-top:20px"><div class="chead"><h2>${title}</h2><span class="muted small">${sub}</span></div>
    ${(notes || []).length ? `<ul class="plain small" style="margin-bottom:14px">${notes!.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
    ${list.map((b) => {
      const cur = current === b;
      return `<details class="swimblock" ${cur ? "open" : ""}><summary><span class="swhen">${esc(b.when || "")}</span><span class="iname">${esc(b.name || "")}</span>${cur ? `<span class="chip" style="background:var(--accent);color:var(--accent-ink)">Current</span>` : ""}</summary>
        ${b.focus ? `<div class="small muted" style="margin-top:4px">${esc(b.focus)}</div>` : ""}${body(b)}</details>`;
    }).join("")}
  </div>`;
}

export function renderPlan(S: AppState): string {
  const p = S.plan;
  const todayName = parseD(S.today).toLocaleDateString(LOCALE, { weekday: "short" }).toLowerCase();

  const planCard = `<div class="card">
    <div class="chead"><h2>Your plan</h2>${p?.updated ? `<span class="muted small">Updated ${esc(niceDate(String(p.updated).slice(0, 10)))}</span>` : ""}</div>
    ${p && (p.summary || (p.phases || []).length)
      ? `${p.summary ? `<p class="goaltext">${esc(p.summary)}</p>` : ""}
         ${(p.phases || []).map((ph: any) => `<div class="phase"><div class="when">${esc(ph.when || "")}</div><div><div class="iname">${esc(ph.name || "")}</div>${ph.focus ? `<div class="small muted">${esc(ph.focus)}</div>` : ""}${li(ph.items)}</div></div>`).join("")}`
      : `<div class="empty">No plan yet.</div>`}
  </div>`;

  const events = p && (p.events || []).length
    ? `<div class="card"><div class="chead"><h2>Trips &amp; events</h2></div>${p.events.slice().sort((a: any, b: any) => (a.from < b.from ? -1 : 1)).map((e: any) =>
        `<div class="evt ${(e.to || e.from) < S.today ? "past" : ""}"><div class="swhen">${esc(e.when || e.from)}</div><div><div class="iname">${esc(e.name)}</div>${e.focus ? `<div class="small muted">${esc(e.focus)}</div>` : ""}${li(e.items)}</div></div>`).join("")}</div>`
    : "";

  const routine = (r: any, fallback: string) =>
    r ? `<div class="card"><div class="chead"><h2>${esc(r.title || fallback)}</h2></div>${r.detail ? `<div class="small muted">${esc(r.detail)}</div>` : ""}${exList(r.exercises)}</div>` : "";

  const notes = p && (p.notes || []).length
    ? `<div class="card"><div class="chead"><h2>Nutrition &amp; habits</h2></div>${li(p.notes, "plain small")}</div>` : "";

  const week = p && (p.week || []).length
    ? `<div class="card" style="margin-top:20px"><div class="chead"><h2>Weekly schedule</h2><span class="muted small">Tap “Watch form” for a demo of any exercise</span></div>
        <div class="week">${p.week.map((w: any) => `<div class="wday ${(w.day || "").toLowerCase().startsWith(todayName.slice(0, 3)) ? "today" : ""}"><div class="d">${esc(w.day || "")}</div><div class="iname small">${esc(w.title || "")}</div>${sessionBody(S, w, S.today)}</div>`).join("")}</div></div>`
    : "";

  const plyo = p && (p.plyo || []).length
    ? blocks("Plyometric progression", "", p.plyoNotes, p.plyo, plyoBlockFor(S, S.today), (b) => exList(b.exercises)) : "";

  const swim = p && (p.swim || []).length
    ? blocks("Swim program", "", p.swimNotes, p.swim, swimBlockFor(S, S.today), (b) =>
        `<div class="swimgrid">${["A", "B"].filter((k) => b.sessions?.[k]).map((k) =>
          `<div class="wday"><div class="d">Session ${k}${b.sessions[k].total ? ` <span class="muted small" style="font-family:var(--body);text-transform:none;letter-spacing:0;font-weight:500">${esc(b.sessions[k].total)}</span>` : ""}</div><div class="iname small">${esc(b.sessions[k].title || "")}</div>${exList(b.sessions[k].sets)}</div>`).join("")}</div>`)
    : "";

  return `<div class="grid">
    <div class="col">${planCard}${events}${routine(p?.shin, "Shin routine")}${routine(p?.travel, "Travel workout")}${notes}</div>
    <div class="col">${goalsCard(S)}</div>
  </div>${week}${plyo}${swim}`;
}
