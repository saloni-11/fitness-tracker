/**
 * Check that what the app holds matches an export file.
 *   npm run verify              (compares against data/export.json)
 *
 * 1. Every day, settings and recipe document is compared field by field.
 * 2. Per-day kcal and protein: the "file" columns are a plain sum over the
 *    export file; the "app" columns are the app's own totals code (src/core)
 *    run on what the server returned. They must agree to 0.1.
 * Exits with code 1 on any difference.
 */
import { dayTotals } from "../src/core/totals";
import type { Day } from "../src/core/types";
import { canonical, fetchExport, readExport } from "./lib";

const file = readExport(process.argv[2]);
const app = await fetchExport();

const round1 = (v: number) => Math.round(v * 10) / 10;
function plainTotals(day: Day): { kcal: number; protein: number } {
  let kcal = 0, protein = 0;
  for (const f of day.food ?? []) { kcal += Number(f.kcal ?? 0); protein += Number(f.protein ?? 0); }
  for (const d of day.drinks ?? []) kcal += Number(d.kcal ?? 0);
  return { kcal: round1(kcal), protein: round1(protein) };
}

let problems = 0;

/* 1. documents */
for (const section of ["days", "settings", "recipes"] as const) {
  const want = (file[section] ?? {}) as Record<string, unknown>;
  const got = (app[section] ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(want)) {
    if (!(id in got)) { console.log(`MISSING   ${section}/${id}`); problems++; }
    else if (canonical(want[id]) !== canonical(got[id])) { console.log(`DIFFERENT ${section}/${id}`); problems++; }
  }
  for (const id of Object.keys(got)) if (!(id in want)) console.log(`extra     ${section}/${id} (in the app, not in the file)`);
}
const n = (s: "days" | "settings" | "recipes") => Object.keys(file[s] ?? {}).length;
console.log(`Documents compared: ${n("days")} days, ${n("settings")} settings, ${n("recipes")} recipes. ${problems ? problems + " problem(s)." : "All identical."}\n`);

/* 2. per-day totals */
const pad = (s: string | number, w: number) => String(s).padStart(w);
console.log("date         kcal file   kcal app   protein file  protein app   match");
let sumK = 0, sumP = 0;
for (const date of Object.keys(file.days).sort()) {
  const want = plainTotals(file.days[date]);
  const t = dayTotals(app.days[date]);
  const got = { kcal: round1(t.kcal), protein: round1(t.protein) };
  const ok = want.kcal === got.kcal && want.protein === got.protein;
  if (!ok) problems++;
  sumK += want.kcal; sumP += want.protein;
  console.log(`${date} ${pad(want.kcal.toFixed(1), 11)} ${pad(got.kcal.toFixed(1), 10)} ${pad(want.protein.toFixed(1), 14)} ${pad(got.protein.toFixed(1), 12)}   ${ok ? "yes" : "NO"}`);
}
console.log(`total      ${pad(round1(sumK).toFixed(1), 11)} ${pad("", 10)} ${pad(round1(sumP).toFixed(1), 14)}`);

console.log(problems ? `\nFAILED: ${problems} difference(s).` : "\nPASSED: the app matches the export file exactly.");
process.exit(problems ? 1 : 0);
