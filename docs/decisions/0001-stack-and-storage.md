# 0001: Stack and storage

Date: 2026-11-15 · Status: accepted

## Context

One user, $0 a month, iPhone as the main device, poor signal at the gym, and an existing dataset in a JSON export
(days / settings / recipes) that must move in and out without loss.

## Decisions

1. **Cloudflare Workers + static assets + D1.** One account, no card, one deploy command. D1 does not pause on
   inactivity, unlike Supabase's free Postgres (paused after a week idle), so there is no keep-alive to maintain.
2. **Documents, not normalised tables.** Each day, settings document and recipe is stored as the JSON it has in
   the export. Import and export are lossless by construction, and the recipes (which have three different
   shapes in the existing data) need no migration. The cost is no SQL over individual food items; at one user and
   one row per day, the client can do that work.
3. **The export shape is the API.** `GET /api/export` returns the whole dataset in the export format, assembled
   by concatenating stored JSON text, so the Worker does no parsing and stays far below the 10 ms CPU limit.
4. **Plain TypeScript, no UI framework.** Views are pure functions from state to an HTML string, which makes them
   testable in Node without a DOM. Revisit when the app gains editing forms (Phase 2).
5. **Exact arithmetic.** Nutrient sums run in integer thousandths. The existing data has fractional kcal
   (674.2), and plain float sums drift.
6. **One random access key, HMAC-compared, exchanged for a signed HttpOnly cookie.** Password hashing does not
   fit the CPU limit, and email magic links open in Safari rather than in the installed iOS app.
7. **Hand-written service worker.** Hashed assets are cache-first; the page and `/api/export` are network-first
   with a cached fallback that is tagged so the app can say it is showing synced data.

## Consequences

- Concurrent edits from two devices need care once writes exist; every row has a `rev` counter for that.
- The whole dataset is downloaded on each open (about 190 KB before compression for 20 days). Fine for months;
  add incremental sync if it grows.
