import { getDb } from '../index.js';

export interface Target {
  id?: number;
  catalog_id: string;
  messier_num?: number | null;
  caldwell_num?: number | null;
  ngc_num?: number | null;
  ic_num?: number | null;
  common_name?: string | null;
  object_type?: string | null;
  constellation?: string | null;
  ra_deg?: number | null;
  dec_deg?: number | null;
  magnitude?: number | null;
  size_arcmin?: number | null;
}

/**
 * Insert or ignore a target row. Returns the rowid (existing or new).
 */
export function upsertTarget(t: Target): number {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM targets WHERE catalog_id = ?')
    .get(t.catalog_id) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db
    .prepare(
      `INSERT INTO targets
         (catalog_id, messier_num, caldwell_num, ngc_num, ic_num,
          common_name, object_type, constellation, ra_deg, dec_deg,
          magnitude, size_arcmin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      t.catalog_id,
      t.messier_num ?? null,
      t.caldwell_num ?? null,
      t.ngc_num ?? null,
      t.ic_num ?? null,
      t.common_name ?? null,
      t.object_type ?? null,
      t.constellation ?? null,
      t.ra_deg ?? null,
      t.dec_deg ?? null,
      t.magnitude ?? null,
      t.size_arcmin ?? null,
    );
  return result.lastInsertRowid as number;
}

export function findTargetByCatalogId(catalogId: string): (Target & { id: number }) | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM targets WHERE catalog_id = ?')
    .get(catalogId) as (Target & { id: number }) | undefined;
}

/** Normalize catalog strings: "M 3" → "M3", "m3" → "M3", "NGC 5272" → "NGC5272" etc. */
export function normalizeCatalogId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export interface TargetSummaryRow {
  catalog_id: string;
  common_name: string | null;
  object_type: string | null;
  total_sessions: number;
  total_frames: number;
  total_exposure_hrs: number;
  filters: string;
  renamed_count: number;
}

export function listTargetSummaries(observedOnly = true): TargetSummaryRow[] {
  const db = getDb();
  const havingClause = observedOnly
    ? `HAVING total_sessions > 0
            OR (SELECT COUNT(*) FROM light_frames lf WHERE lf.target_id = t.id) > 0
            OR (SELECT COUNT(*) FROM stacked_images si WHERE si.target_id = t.id) > 0
            OR renamed_count > 0`
    : '';
  return db
    .prepare(
      `SELECT
         t.catalog_id,
         t.common_name,
         t.object_type,
         COUNT(DISTINCT s.id)                              AS total_sessions,
         COALESCE(SUM(s.frame_count), 0)                  AS total_frames,
         ROUND(COALESCE(SUM(s.total_exposure_sec), 0) / 3600.0, 2) AS total_exposure_hrs,
         COALESCE(GROUP_CONCAT(DISTINCT s.filter), '')     AS filters,
         (SELECT COUNT(*) FROM renamed_images r WHERE r.target_id = t.id) AS renamed_count
       FROM targets t
       LEFT JOIN imaging_sessions s ON s.target_id = t.id
       GROUP BY t.id
       ${havingClause}
       ORDER BY total_frames DESC`,
    )
    .all() as TargetSummaryRow[];
}
