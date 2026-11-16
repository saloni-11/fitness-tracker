import type { ExportFile } from "../../src/core/types";

export class AuthError extends Error {}

export interface LoadResult {
  data: ExportFile;
  /** True when the service worker answered from its cache (no signal). */
  fromCache: boolean;
}

/** The whole dataset, in the export file's shape. */
export async function loadData(): Promise<LoadResult> {
  const res = await fetch("/api/export", { credentials: "same-origin" });
  if (res.status === 401) throw new AuthError("Sign in required");
  if (!res.ok) throw new Error(`Couldn't load your log (${res.status}).`);
  return { data: (await res.json()) as ExportFile, fromCache: res.headers.get("x-fl-cache") === "1" };
}

export async function login(key: string): Promise<void> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (res.status === 401) throw new AuthError("That access key isn't right.");
  if (!res.ok) throw new Error(`Sign-in failed (${res.status}). Try again.`);
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
  if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
}
