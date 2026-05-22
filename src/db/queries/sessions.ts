import { getDb } from '../index.js';
import { normalizeCatalogId } from './targets.js';

export interface Session {
  id?: number;
  target_id: number;
  session_date: string;
  filter?: string | null;
  gain?: number | null;
  frame_count: number;
  total_exposure_sec: number;
  ra_deg?: number | null;
  dec_deg?: number | null;
  telescope?: string | null;
  notes?: string | null;
  first_frame_path?: string | null;
  source: string;
}

export function upsertSession(s: Session): { id: number; wasNew: boolean } {
  const db = getDb();
  // Idempotency: match on target + date + source + first_frame_path
  const existing = db
    .prepare(
      `SELECT id FROM imaging_sessions
       WHERE target_id = ? AND session_date = ? AND source = ?
         AND COALESCE(first_frame_path,'') = COALESCE(?,'')`,
    )
    .get(s.target_id, s.session_date, s.source, s.first_frame_path ?? null) as
    | { id: number }
    | undefined;
  if (existing) return { id: existing.id, wasNew: false };

  const result = db
    .prepare(
      `INSERT INTO imaging_sessions
         (target_id, session_date, filter, gain, frame_count, total_exposure_sec,
          ra_deg, dec_deg, telescope, notes, first_frame_path, source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      s.target_id,
      s.session_date,
      s.filter ?? null,
      s.gain ?? null,
      s.frame_count,
      s.total_exposure_sec,
      s.ra_deg ?? null,
      s.dec_deg ?? null,
      s.telescope ?? null,
      s.notes ?? null,
      s.first_frame_path ?? null,
      s.source,
    );
  return { id: result.lastInsertRowid as number, wasNew: true };
}

export interface SessionRow {
  id: number;
  catalog_id: string;
  common_name: string | null;
  session_date: string;
  filter: string | null;
  gain: number | null;
  frame_count: number;
  total_exposure_sec: number;
  telescope: string | null;
  source: string;
  notes: string | null;
}

export function listSessions(catalogFilter?: string): SessionRow[] {
  const db = getDb();
  if (catalogFilter) {
    const norm = normalizeCatalogId(catalogFilter);
    return db
      .prepare(
        `SELECT s.id, t.catalog_id, t.common_name, s.session_date, s.filter,
                s.gain, s.frame_count, s.total_exposure_sec, s.telescope, s.source, s.notes
         FROM imaging_sessions s
         JOIN targets t ON t.id = s.target_id
         WHERE t.catalog_id = ?
         ORDER BY s.session_date DESC`,
      )
      .all(norm) as SessionRow[];
  }
  return db
    .prepare(
      `SELECT s.id, t.catalog_id, t.common_name, s.session_date, s.filter,
              s.gain, s.frame_count, s.total_exposure_sec, s.telescope, s.source, s.notes
       FROM imaging_sessions s
       JOIN targets t ON t.id = s.target_id
       ORDER BY s.session_date DESC, t.catalog_id`,
    )
    .all() as SessionRow[];
}

/**
 * Group a sorted list of [{ filePath, capturedAt, exposureSec }] into sessions
 * based on a maximum gap in minutes. Returns array of session objects ready for DB insert.
 */
export function groupFramesIntoSessions(
  targetId: number,
  frames: Array<{ filePath: string; capturedAt: Date; exposureSec: number; filter: string }>,
  gapMinutes: number,
): Array<{
  targetId: number;
  sessionDate: string;
  filter: string;
  frameCount: number;
  totalExposureSec: number;
  firstFramePath: string;
  frameIndices: number[];
}> {
  if (frames.length === 0) return [];

  const sorted = [...frames].map((f, i) => ({ ...f, idx: i }));
  sorted.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

  const sessions: ReturnType<typeof groupFramesIntoSessions> = [];
  let groupStart = 0;

  const flush = (end: number) => {
    const group = sorted.slice(groupStart, end);
    const first = group[0];
    const filters = [...new Set(group.map(f => f.filter))];
    sessions.push({
      targetId,
      sessionDate: first.capturedAt.toISOString().slice(0, 10),
      filter: filters.length === 1 ? filters[0] : 'mixed',
      frameCount: group.length,
      totalExposureSec: group.reduce((sum, f) => sum + f.exposureSec, 0),
      firstFramePath: first.filePath,
      frameIndices: group.map(f => f.idx),
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const gapMs = sorted[i].capturedAt.getTime() - sorted[i - 1].capturedAt.getTime();
    if (gapMs > gapMinutes * 60 * 1000) {
      flush(i);
      groupStart = i;
    }
  }
  flush(sorted.length);

  return sessions;
}
