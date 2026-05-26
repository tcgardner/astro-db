import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const schemaRouter = Router();

schemaRouter.get('/', (_req, res) => {
  const db = getDb();

  const tables = db.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as { name: string; sql: string }[];

  const indexes = db.prepare(`
    SELECT name, sql, tbl_name FROM sqlite_master
    WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all() as { name: string; sql: string; tbl_name: string }[];

  res.json({ tables, indexes });
});
