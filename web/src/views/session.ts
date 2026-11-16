/* Training-plan fragments shared by the Day and Plan tabs. The plan document is
   free-form JSON, so it is typed loosely here. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseD } from "../../../src/core/dates";
import { AppState, LOCALE, esc } from "../ui";

const yt = (q: string) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

export function exList(items: any[] | undefined): string {
  if (!items?.length) return "";
  return `<ul class="ex">${items.map((e) => `<li>
    <div class="top"><span class="nm">${e.part ? `<span class="part">${esc(e.part)}</span>` : ""}${esc(e.name || "")}</span>${e.sets ? `<span class="sets">${esc(e.sets)}</span>` : ""}</div>
    ${e.cue ? `<div class="cue">${esc(e.cue)}</div>` : ""}
    ${e.demo ? `<a class="demo" href="${yt(e.demo)}" target="_blank" rel="noopener">Watch form ↗</a>` : ""}
    ${e.last || e.next ? `<div class="prog">${e.last ? `<div class="lst"><b>Last${e.lastDate ? " (" + esc(e.lastDate) + ")" : ""}:</b> ${esc(e.last)}</div>` : ""}${e.next ? `<div><b>Next:</b> ${esc(e.next)}</div>` : ""}</div>` : ""}
  </li>`).join("")}</ul>`;
}

const blockFor = (blocks: any[] | undefined, date: string) =>
  (blocks || []).find((x) => (!x.from || x.from <= date) && (!x.to || date <= x.to)) || null;

export const swimBlockFor = (S: AppState, date: string) => blockFor(S.plan?.swim, date);
export const plyoBlockFor = (S: AppState, date: string) => blockFor(S.plan?.plyo, date);

function swimSession(block: any, which: string): string {
  const s = block?.sessions?.[which];
  if (!s) return "";
  return `<div class="iname small">${esc(block.name)} · ${esc(s.title || "Session " + which)}${s.total ? ` <span class="muted">· ${esc(s.total)}</span>` : ""}</div>${exList(s.sets)}`;
}

export function sessionBody(S: AppState, w: any, date: string): string {
  let h = exList(w.exercises);
  if (w.plyo) {
    const b = plyoBlockFor(S, date);
    h += b
      ? `<div class="iname small" style="margin-top:6px">${esc(b.name)}</div>${exList(b.exercises)}`
      : `<div class="small muted" style="margin-top:6px">No plyometric block is scheduled for this date.</div>`;
  }
  if (w.swim) {
    const b = swimBlockFor(S, date);
    h += b ? swimSession(b, w.swim) : `<div class="small muted">See the swim program on the Plan &amp; goals tab.</div>`;
  }
  if (w.detail) h += `<div class="small muted" style="white-space:pre-wrap;margin-top:6px">${esc(w.detail)}</div>`;
  return h;
}

/** The plan entry for a weekday, e.g. the "Monday" item of plan.week. */
export function weekEntry(S: AppState, date: string): any | null {
  const dn = parseD(date).toLocaleDateString(LOCALE, { weekday: "long" }).toLowerCase();
  return (S.plan?.week || []).find((x: any) => (x.day || "").toLowerCase().startsWith(dn.slice(0, 3))) || null;
}

/** Today's session: a date override wins over the weekly plan. */
export function todaysSession(S: AppState): string {
  const p = S.plan;
  if (!p?.week?.length) return "";
  const ov = (p.overrides || {})[S.date];
  if (ov) {
    return `<div class="card"><div class="chead"><h2>Today's session</h2><span class="chip">Adjusted</span></div>
      <div class="iname">${esc(ov.title || "")}</div>
      ${ov.note ? `<div class="small muted" style="margin-top:4px">${esc(ov.note)}</div>` : ""}
      ${sessionBody(S, ov, S.date)}</div>`;
  }
  const w = weekEntry(S, S.date);
  if (!w) return "";
  return `<div class="card"><div class="chead"><h2>Planned for ${esc(w.day)}</h2></div>
    <div class="iname">${esc(w.title)}</div>${sessionBody(S, w, S.date)}</div>`;
}

export function eventFor(S: AppState, date: string): any | null {
  return (S.plan?.events || []).find((e: any) => e.from <= date && date <= (e.to || e.from)) || null;
}

export function eventCard(S: AppState, date: string): string {
  const e = eventFor(S, date);
  if (!e) return "";
  return `<div class="card" style="border-color:var(--accent)"><div class="chead"><h2>${esc(e.name)}</h2><span class="chip">${esc(e.when || "")}</span></div>
    ${e.focus ? `<div class="small" style="margin-bottom:6px">${esc(e.focus)}</div>` : ""}
    ${(e.items || []).length ? `<ul class="plain small">${e.items.map((i: string) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}</div>`;
}
