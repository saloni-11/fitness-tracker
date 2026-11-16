import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/instrument-sans/latin-400.css";
import "@fontsource/instrument-sans/latin-500.css";
import "@fontsource/instrument-sans/latin-600.css";
import "./styles.css";

import { shift, todayStr } from "../../src/core/dates";
import type { Goals } from "../../src/core/types";
import { AuthError, loadData, login, logout } from "./api";
import { AppState } from "./ui";
import { renderDay } from "./views/day";
import { renderPlan } from "./views/plan";
import { renderTrends } from "./views/trends";

const S: AppState = { days: {}, goals: {}, plan: null, date: todayStr(), today: todayStr(), tab: "today", range: 14 };
let signedIn = false;
let followToday = true;
let lastLoad = 0;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function toast(msg: string): void {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  window.clearTimeout((toast as { timer?: number }).timer);
  (toast as { timer?: number }).timer = window.setTimeout(() => (t.hidden = true), 2600);
}

function banner(msg: string | null): void {
  const b = $("banner");
  b.textContent = msg ?? "";
  b.hidden = !msg;
}

function render(): void {
  $("v-login").hidden = signedIn;
  $("datenav").hidden = !signedIn;
  $("tabs").hidden = !signedIn;
  for (const t of ["today", "trends", "plan"] as const) $("v-" + t).hidden = !signedIn || S.tab !== t;
  if (!signedIn) return;

  $<HTMLInputElement>("date").value = S.date;
  document.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
  const html = S.tab === "today" ? renderDay(S) : S.tab === "trends" ? renderTrends(S) : renderPlan(S);
  $("v-" + S.tab).innerHTML = html +
    `<div class="foot"><span>Read-only for now. Logging arrives in the next phase.</span><button type="button" id="signOut">Sign out</button></div>`;
}

async function refresh(): Promise<void> {
  try {
    const { data, fromCache } = await loadData();
    S.days = data.days || {};
    S.goals = ((data.settings || {}).goals as Goals) || {};
    S.plan = (data.settings || {}).plan ?? null;
    signedIn = true;
    lastLoad = Date.now();
    banner(fromCache ? "No connection. Showing the last data this device synced." : null);
  } catch (err) {
    if (err instanceof AuthError) signedIn = false;
    else banner(navigator.onLine ? (err as Error).message : "No connection, and nothing has been synced to this device yet.");
  } finally {
    $("v-loading").hidden = true;
    render();
  }
}

/* ---------- events ---------- */
function setDate(date: string): void {
  S.date = date;
  followToday = date === todayStr();
  render();
}
$("prev").onclick = () => setDate(shift(S.date, -1));
$("next").onclick = () => setDate(shift(S.date, 1));
$("todayBtn").onclick = () => setDate(todayStr());
$<HTMLInputElement>("date").onchange = (e) => {
  const v = (e.target as HTMLInputElement).value;
  if (v) setDate(v);
};

$("tabs").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>(".tab");
  if (b) {
    S.tab = b.dataset.tab as AppState["tab"];
    render();
    window.scrollTo({ top: 0 });
  }
});

document.addEventListener("click", async (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.range) {
    S.range = Number(t.dataset.range);
    render();
  } else if (t.id === "signOut") {
    await logout();
    signedIn = false;
    S.days = {};
    render();
  }
});

$<HTMLFormElement>("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>("loginKey");
  const error = $("loginError");
  const btn = $<HTMLButtonElement>("loginBtn");
  error.hidden = true;
  btn.disabled = true;
  try {
    await login(input.value.trim());
    input.value = "";
    $("v-loading").hidden = false;
    await refresh();
  } catch (err) {
    error.textContent = (err as Error).message;
    error.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

/* Keep "today" current when the app is left open overnight, and pull fresh data
   when the app comes back to the foreground. */
function onForeground(): void {
  const t = todayStr();
  if (t !== S.today) {
    S.today = t;
    if (followToday) S.date = t;
    render();
  }
  if (signedIn && Date.now() - lastLoad > 30_000) void refresh().then(setUpOffline);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) onForeground(); });
window.addEventListener("focus", onForeground);
window.addEventListener("online", () => void refresh());
window.setInterval(onForeground, 60_000);

/* Offline support. On the very first visit the page loads before the service
   worker is in control, so hand it the list of files this page used and then
   re-fetch the data through it; from then on the app opens without signal. */
async function setUpOffline(): Promise<void> {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const urls = performance.getEntriesByType("resource").map((e) => e.name)
      .filter((u) => u.startsWith(location.origin) && !u.includes("/api/"));
    reg.active?.postMessage({ type: "precache", urls: ["/", ...urls] });
    if (signedIn) void refresh().then(setUpOffline);
  } catch {
    toast("Offline mode isn't available in this browser.");
  }
}

void refresh().then(setUpOffline);
