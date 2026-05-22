/** Increment this whenever you add or change a table/column. */
export const SCHEMA_VERSION = 1;

export const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS targets (
  id            INTEGER PRIMARY KEY,
  catalog_id    TEXT    NOT NULL UNIQUE,
  messier_num   INTEGER,
  caldwell_num  INTEGER,
  ngc_num       INTEGER,
  ic_num        INTEGER,
  common_name   TEXT,
  object_type   TEXT,
  constellation TEXT,
  ra_deg        REAL,
  dec_deg       REAL,
  magnitude     REAL,
  size_arcmin   REAL,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS imaging_sessions (
  id                 INTEGER PRIMARY KEY,
  target_id          INTEGER NOT NULL REFERENCES targets(id),
  session_date       TEXT    NOT NULL,
  filter             TEXT,
  gain               INTEGER,
  frame_count        INTEGER NOT NULL,
  total_exposure_sec REAL    NOT NULL,
  ra_deg             REAL,
  dec_deg            REAL,
  telescope          TEXT,
  notes              TEXT,
  first_frame_path   TEXT,
  source             TEXT    NOT NULL,
  created_at         TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS light_frames (
  id            INTEGER PRIMARY KEY,
  file_path     TEXT    NOT NULL UNIQUE,
  filename      TEXT    NOT NULL,
  target_id     INTEGER REFERENCES targets(id),
  session_id    INTEGER REFERENCES imaging_sessions(id),
  captured_at   TEXT    NOT NULL,
  exposure_sec  REAL    NOT NULL,
  filter        TEXT,
  gain          INTEGER,
  ra_deg        REAL,
  dec_deg       REAL,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stacked_images (
  id             INTEGER PRIMARY KEY,
  file_path      TEXT    NOT NULL UNIQUE,
  filename       TEXT    NOT NULL,
  target_id      INTEGER NOT NULL REFERENCES targets(id),
  session_id     INTEGER REFERENCES imaging_sessions(id),
  stacked_at     TEXT    NOT NULL,
  frame_count    INTEGER NOT NULL,
  exposure_sec   REAL    NOT NULL,
  filter         TEXT,
  stack_type     TEXT    NOT NULL,
  preview_path   TEXT,
  thumbnail_path TEXT,
  created_at     TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS renamed_images (
  id            INTEGER PRIMARY KEY,
  file_path     TEXT    NOT NULL UNIQUE,
  filename      TEXT    NOT NULL,
  source_name   TEXT,
  target_id     INTEGER REFERENCES targets(id),
  catalog_id    TEXT    NOT NULL,
  common_name   TEXT,
  id_stage      TEXT    NOT NULL,
  processed_at  TEXT    NOT NULL,
  sequence_num  INTEGER,
  run_log_path  TEXT,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_runs (
  id             INTEGER PRIMARY KEY,
  run_at         TEXT    DEFAULT (datetime('now')),
  source         TEXT    NOT NULL,
  files_scanned  INTEGER,
  files_inserted INTEGER,
  files_skipped  INTEGER,
  errors         INTEGER,
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_light_frames_target    ON light_frames(target_id);
CREATE INDEX IF NOT EXISTS idx_light_frames_session   ON light_frames(session_id);
CREATE INDEX IF NOT EXISTS idx_light_frames_captured  ON light_frames(captured_at);
CREATE INDEX IF NOT EXISTS idx_sessions_target        ON imaging_sessions(target_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date          ON imaging_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_stacked_target         ON stacked_images(target_id);
CREATE INDEX IF NOT EXISTS idx_renamed_target         ON renamed_images(target_id);
CREATE INDEX IF NOT EXISTS idx_renamed_catalog        ON renamed_images(catalog_id);
`;
