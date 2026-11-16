import { existsSync, readFileSync } from "node:fs";
import type { ExportFile } from "../src/core/types";

export const DEFAULT_EXPORT = "data/export.json";

/** Reads an export file; with no path given, uses data/export.json. */
export function readExport(path: string = DEFAULT_EXPORT): ExportFile {
  if (!existsSync(path)) fail(`Can't find ${path}. Put the export file there, or pass its path.`);
  const data = JSON.parse(readFileSync(path, "utf8")) as ExportFile;
  if (!data || typeof data.days !== "object") fail(`${path} doesn't look like a tracker export (no "days").`);
  return data;
}

export function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

/** Connection details come from the environment so the key never lands in shell history files or the repo. */
export function target(): { url: string; key: string } {
  const url = (process.env.FITNESS_URL || "").replace(/\/+$/, "");
  const key = process.env.FITNESS_KEY || "";
  if (!url || !key) fail("Set FITNESS_URL (e.g. https://fitness-tracker.<you>.workers.dev) and FITNESS_KEY (the access key) first.");
  return { url, key };
}

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, key } = target();
  const res = await fetch(url + path, {
    ...init,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 401) fail("The server rejected FITNESS_KEY (401). Check it matches the ACCESS_KEY secret.");
  return res;
}

export async function fetchExport(): Promise<ExportFile> {
  const res = await api("/api/export");
  if (!res.ok) fail(`GET /api/export failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as ExportFile;
}

/** Recursively sort object keys, so two documents can be compared or written in a stable order. */
export function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeys) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) out[k] = sortKeys((value as Record<string, unknown>)[k]);
    return out as T;
  }
  return value;
}

export const canonical = (value: unknown): string => JSON.stringify(sortKeys(value));
