/**
 * Import an export file into the app, one document per request.
 *   npm run import              (reads data/export.json)
 *   npm run import -- other.json
 * Safe to re-run: each document replaces the stored copy with the same id.
 */
import { api, fail, readExport } from "./lib";

const data = readExport(process.argv[2]);

const jobs: [kind: string, id: string, doc: unknown][] = [
  ...Object.entries(data.days).map(([id, doc]) => ["days", id, doc] as [string, string, unknown]),
  ...Object.entries(data.settings || {}).map(([id, doc]) => ["settings", id, doc] as [string, string, unknown]),
  ...Object.entries(data.recipes || {}).map(([id, doc]) => ["recipes", id, doc] as [string, string, unknown]),
];

for (const [kind, id, doc] of jobs) {
  const res = await api(`/api/doc/${kind}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(doc) });
  if (!res.ok) fail(`Failed on ${kind}/${id}: ${res.status} ${await res.text()}`);
  console.log(`ok  ${kind}/${id}`);
}

const count = (kind: string) => jobs.filter((j) => j[0] === kind).length;
console.log(`\nImported ${count("days")} days, ${count("settings")} settings documents, ${count("recipes")} recipes.`);
console.log("Next: npm run verify");
