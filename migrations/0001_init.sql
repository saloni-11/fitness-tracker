-- Documents are stored as JSON text, exactly as they appear in the export file,
-- so import and export stay lossless. `rev` increments on every write and will
-- be used to reject stale writes once the app starts editing (Phase 2).

CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD
  doc  TEXT NOT NULL,              -- the day document as JSON
  rev  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,            -- goals | plan | pantry | gym
  doc TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recipes (
  slug TEXT PRIMARY KEY,           -- e.g. lentil-dal-2026-11-08
  doc  TEXT NOT NULL,
  rev  INTEGER NOT NULL DEFAULT 1
);
