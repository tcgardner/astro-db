import { getDb } from '../index.js';
import { normalizeCatalogId } from './targets.js';

export interface StackedImage {
  file_path: string;
  filename: string;
  target_id: number;
  session_id?: number | null;
  stacked_at: string;   // ISO 8601
  frame_count: number;
  exposure_sec: number;
  filter?: string | null;
  stack_type: string;   // "Stacked" | "DSO_Stacked"
  preview_path?: string | null;
  thumbnail_path?: string | null;
}

/** Returns true if skipped (already existed). */
export function insertStack(s: StackedImage): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO stacked_images
         (file_path, filename, target_id, session_id, stacked_at,
          frame_count, exposure_sec, filter, stack_type, preview_path, thumbnail_path)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      s.file_path,
      s.filename,
      s.target_id,
      s.session_id ?? null,
      s.stacked_at,
      s.frame_count,
      s.exposure_sec,
      s.filter ?? null,
      s.stack_type,
      s.preview_path ?? null,
      s.thumbnail_path ?? null,
    );
  return result.changes === 0;
}

export interface StackRow {
  id: number;
  catalog_id: string;
  common_name: string | null;
  filename: string;
  stacked_at: string;
  frame_count: number;
  exposure_sec: number;
  filter: string | null;
  stack_type: string;
  preview_path: string | null;
}

export function listStacks(catalogFilter?: string): StackRow[] {
  const db = getDb();
  if (catalogFilter) {
    const norm = normalizeCatalogId(catalogFilter);
    return db
      .prepare(
        `SELECT si.id, t.catalog_id, t.common_name, si.filename, si.stacked_at,
                si.frame_count, si.exposure_sec, si.filter, si.stack_type, si.preview_path
         FROM stacked_images si
         JOIN targets t ON t.id = si.target_id
         WHERE t.catalog_id = ?
         ORDER BY si.stacked_at DESC`,
      )
      .all(norm) as StackRow[];
  }
  return db
    .prepare(
      `SELECT si.id, t.catalog_id, t.common_name, si.filename, si.stacked_at,
              si.frame_count, si.exposure_sec, si.filter, si.stack_type, si.preview_path
       FROM stacked_images si
       JOIN targets t ON t.id = si.target_id
       ORDER BY si.stacked_at DESC`,
    )
    .all() as StackRow[];
}
