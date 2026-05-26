import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { cfg } from '../config.js';
import { DDL } from './schema.js';

let _db: Database.Database | null = null;

function runMigrations(db: Database.Database): void {
  try {
    db.exec('ALTER TABLE renamed_images ADD COLUMN captured_at TEXT');
  } catch (err: any) {
    if (!err.message?.includes('duplicate column name')) throw err;
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(cfg.dbPath), { recursive: true });
  _db = new Database(cfg.dbPath);
  _db.exec(DDL);
  runMigrations(_db);
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
