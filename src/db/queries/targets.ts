import { getDb } from '../index.js';

export interface TargetSeed {
  catalog_id: string;
  messier_num?: number;
  caldwell_num?: number;
  common_name?: string;
}

export function upsertTarget(t: TargetSeed): boolean {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO targets (catalog_id, messier_num, caldwell_num, common_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(catalog_id) DO NOTHING
  `).run(t.catalog_id, t.messier_num ?? null, t.caldwell_num ?? null, t.common_name ?? null);
  return result.changes > 0;
}
