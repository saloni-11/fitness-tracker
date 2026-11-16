/**
 * API worker. Static files are served by Cloudflare from ./dist; only /api/*
 * reaches this code (see wrangler.toml).
 *
 * Auth model: one long random ACCESS_KEY (a Worker secret).
 *   - Browser: POST /api/login with the key -> signed, HttpOnly session cookie.
 *   - Scripts: Authorization: Bearer <ACCESS_KEY>.
 * The key is random and 256 bits long, so it is compared with an HMAC rather
 * than a slow password hash (the free plan allows 10 ms of CPU per request).
 */

export interface Env {
  DB: D1Database;
  ACCESS_KEY: string;
  SESSION_SECRET: string;
}

const COOKIE = "fl_session";
const SESSION_DAYS = 180;
const MAX_BODY_BYTES = 1_000_000;

const KINDS = {
  days: { table: "days", col: "date", id: /^\d{4}-\d{2}-\d{2}$/ },
  settings: { table: "settings", col: "key", id: /^[a-z][A-Za-z0-9_-]{0,40}$/ },
  recipes: { table: "recipes", col: "slug", id: /^[a-z0-9][a-z0-9-]{0,80}$/ },
} as const;
type Kind = keyof typeof KINDS;

const enc = new TextEncoder();

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof data === "string" ? data : JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

async function hmac(secret: string, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function keyMatches(env: Env, provided: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    hmac(env.SESSION_SECRET, "key:" + provided),
    hmac(env.SESSION_SECRET, "key:" + env.ACCESS_KEY),
  ]);
  return constantTimeEqual(a, b);
}

async function signSession(env: Env, expires: number): Promise<string> {
  return `${expires}.${b64url(await hmac(env.SESSION_SECRET, "session:" + expires))}`;
}

async function sessionValid(env: Env, value: string): Promise<boolean> {
  const [exp, sig] = value.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await signSession(env, expires);
  return constantTimeEqual(enc.encode(expected), enc.encode(value));
}

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function authed(req: Request, env: Env): Promise<boolean> {
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return keyMatches(env, bearer.slice(7).trim());
  const cookie = readCookie(req, COOKIE);
  return cookie ? sessionValid(env, cookie) : false;
}

function sessionCookie(value: string, maxAgeSeconds: number): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

async function login(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!key || !(await keyMatches(env, key))) return json({ error: "Wrong access key" }, 401);
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(await signSession(env, expires), SESSION_DAYS * 86_400) });
}

/**
 * The whole dataset in the export file's shape. Stored documents are already
 * JSON text, so the response is assembled by concatenation with no parsing.
 */
async function exportAll(env: Env): Promise<Response> {
  const [days, settings, recipes] = await env.DB.batch<{ id: string; doc: string }>([
    env.DB.prepare("SELECT date AS id, doc FROM days ORDER BY date"),
    env.DB.prepare("SELECT key AS id, doc FROM settings ORDER BY key"),
    env.DB.prepare("SELECT slug AS id, doc FROM recipes ORDER BY slug"),
  ]);
  const section = (rows: { id: string; doc: string }[]) =>
    "{" + rows.map((r) => JSON.stringify(r.id) + ":" + r.doc).join(",") + "}";
  const today = new Date().toISOString().slice(0, 10);
  const body =
    `{"exported":"${today}","source":"fitness-tracker app",` +
    `"days":${section(days.results)},"settings":${section(settings.results)},"recipes":${section(recipes.results)}}`;
  return json(body);
}

async function putDoc(req: Request, env: Env, kind: Kind, id: string): Promise<Response> {
  const spec = KINDS[kind];
  if (!spec.id.test(id)) return json({ error: `Invalid ${kind} id` }, 400);

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "Document too large" }, 413);

  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return json({ error: "Body is not valid JSON" }, 400);
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return json({ error: "Document must be a JSON object" }, 400);
  if (kind === "days" && (doc as { date?: unknown }).date !== id) return json({ error: "Day document's date must match the URL" }, 400);

  const row = await env.DB.prepare(
    `INSERT INTO ${spec.table} (${spec.col}, doc, rev) VALUES (?1, ?2, 1)
     ON CONFLICT(${spec.col}) DO UPDATE SET doc = excluded.doc, rev = ${spec.table}.rev + 1
     RETURNING rev`,
  )
    .bind(id, JSON.stringify(doc))
    .first<{ rev: number }>();
  return json({ ok: true, rev: row?.rev ?? 1 });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (!pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    if (!env.ACCESS_KEY || !env.SESSION_SECRET) {
      return json({ error: "Server is missing ACCESS_KEY or SESSION_SECRET. See README, step 5." }, 500);
    }

    try {
      if (pathname === "/api/health" && req.method === "GET") {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true });
      }
      if (pathname === "/api/login" && req.method === "POST") return login(req, env);
      if (pathname === "/api/logout" && req.method === "POST") {
        return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
      }

      if (!(await authed(req, env))) return json({ error: "Sign in required" }, 401);

      if (pathname === "/api/export" && req.method === "GET") return exportAll(env);

      const doc = pathname.match(/^\/api\/doc\/(days|settings|recipes)\/([^/]+)$/);
      if (doc && req.method === "PUT") return putDoc(req, env, doc[1] as Kind, decodeURIComponent(doc[2]));

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
