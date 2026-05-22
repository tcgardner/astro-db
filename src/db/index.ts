import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { cfg } from '../config.js';
import { DDL, SCHEMA_VERSION } from './schema.js';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure the parent directory exists
  mkdirSync(dirname(cfg.dbPath), { recursive: true });

  _db = new Database(cfg.dbPath);

  // Run schema DDL (all CREATE IF NOT EXISTS — safe to re-run)
  _db.exec(DDL);

  // Stamp schema version if not already set
  const ver = _db.prepare('SELECT version FROM schema_version ORDER BY rowid DESC LIMIT 1').get() as
    | { version: number }
    | undefined;
  if (!ver) {
    _db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }

  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
