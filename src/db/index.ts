import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { cfg } from '../config.js';
import { DDL } from './schema.js';

let _db: Database.Database | null = null;

function tryAlter(db: Database.Database, sql: string, ignorePatterns: string[]): void {
  try {
    db.exec(sql);
  } catch (err: any) {
    if (!ignorePatterns.some(p => String(err.message).includes(p))) throw err;
  }
}

function runMigrations(db: Database.Database): void {
  tryAlter(db, 'ALTER TABLE renamed_images ADD COLUMN captured_at TEXT',
    ['duplicate column name']);
  tryAlter(db, 'ALTER TABLE renamed_images RENAME COLUMN source_name TO original_filename',
    ['no such column']);
  tryAlter(db, 'ALTER TABLE renamed_images RENAME COLUMN run_log_path TO run_log_run_at',
    ['no such column']);
  tryAlter(db, 'ALTER TABLE renamed_images ADD COLUMN notes TEXT',
    ['duplicate column name']);
  tryAlter(db,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_renamed_catalog_filename ON renamed_images(catalog_id, filename)',
    ['already exists']);
  tryAlter(db,
    'ALTER TABLE renamed_images ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0',
    ['duplicate column name']);
}

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(cfg.dbPath), { recursive: true });
  mkdirSync(cfg.imagesDir, { recursive: true });
  _db = new Database(cfg.dbPath);
  _db.exec(DDL);
  runMigrations(_db);
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
