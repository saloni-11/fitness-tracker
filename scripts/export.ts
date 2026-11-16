/**
 * Save everything the app holds as one JSON file, in the original export format
 * (sorted keys, one-space indent).
 *   npm run export -- backups/fitness-data-export-2026-11-15.json
 * With no path, writes fitness-data-export-<today>.json in the current folder.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fetchExport, sortKeys } from "./lib";

const data = await fetchExport();
const out = {
  exported: data.exported,
  source: data.source,
  days: sortKeys(data.days),
  settings: sortKeys(data.settings),
  recipes: sortKeys(data.recipes),
};
const path = process.argv[2] || `fitness-data-export-${data.exported}.json`;
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(out, null, 1), "utf8");
console.log(`Wrote ${path}: ${Object.keys(out.days).length} days, ${Object.keys(out.settings).length} settings documents, ${Object.keys(out.recipes).length} recipes.`);
