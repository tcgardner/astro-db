import { getDb } from '../index.js';
import { normalizeCatalogId } from './targets.js';

export interface RenamedImage {
  file_path: string;
  filename: string;
  source_name?: string | null;
  target_id?: number | null;
  catalog_id: string;
  common_name?: string | null;
  id_stage: string;
  processed_at: string;  // ISO 8601
  sequence_num?: number | null;
  run_log_path?: string | null;
}

/** Returns true if skipped (already existed). */
export function insertRenamedImage(r: RenamedImage): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO renamed_images
         (file_path, filename, source_name, target_id, catalog_id,
          common_name, id_stage, processed_at, sequence_num, run_log_path)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      r.file_path,
      r.filename,
      r.source_name ?? null,
      r.target_id ?? null,
      r.catalog_id,
      r.common_name ?? null,
      r.id_stage,
      r.processed_at,
      r.sequence_num ?? null,
      r.run_log_path ?? null,
    );
  return result.changes === 0;
}

export interface RenamedRow {
  id: number;
  catalog_id: string;
  common_name: string | null;
  filename: string;
  id_stage: string;
  processed_at: string;
  sequence_num: number | null;
  source_name: string | null;
}

export function listRenamed(catalogFilter?: string): RenamedRow[] {
  const db = getDb();
  if (catalogFilter) {
    const norm = normalizeCatalogId(catalogFilter);
    return db
      .prepare(
        `SELECT ri.id, ri.catalog_id, t.common_name, ri.filename,
                ri.id_stage, ri.processed_at, ri.sequence_num, ri.source_name
         FROM renamed_images ri
         LEFT JOIN targets t ON t.id = ri.target_id
         WHERE ri.catalog_id = ?
         ORDER BY ri.processed_at DESC`,
      )
      .all(norm) as RenamedRow[];
  }
  return db
    .prepare(
      `SELECT ri.id, ri.catalog_id, t.common_name, ri.filename,
              ri.id_stage, ri.processed_at, ri.sequence_num, ri.source_name
       FROM renamed_images ri
       LEFT JOIN targets t ON t.id = ri.target_id
       ORDER BY ri.catalog_id, ri.processed_at DESC`,
    )
    .all() as RenamedRow[];
}

export interface StageSummaryRow {
  id_stage: string;
  count: number;
}

export function listStageSummary(): StageSummaryRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id_stage, COUNT(*) AS count
       FROM renamed_images
       GROUP BY id_stage
       ORDER BY count DESC`,
    )
    .all() as StageSummaryRow[];
}
