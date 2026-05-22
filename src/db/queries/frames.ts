import { getDb } from '../index.js';

export interface LightFrame {
  file_path: string;
  filename: string;
  target_id?: number | null;
  session_id?: number | null;
  captured_at: string;  // ISO 8601
  exposure_sec: number;
  filter?: string | null;
  gain?: number | null;
  ra_deg?: number | null;
  dec_deg?: number | null;
}

/** Returns true if already in DB (skip). False if newly inserted. */
export function insertFrame(f: LightFrame): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO light_frames
         (file_path, filename, target_id, session_id, captured_at,
          exposure_sec, filter, gain, ra_deg, dec_deg)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      f.file_path,
      f.filename,
      f.target_id ?? null,
      f.session_id ?? null,
      f.captured_at,
      f.exposure_sec,
      f.filter ?? null,
      f.gain ?? null,
      f.ra_deg ?? null,
      f.dec_deg ?? null,
    );
  return result.changes === 0; // true = skipped (already existed)
}

export function frameExists(filePath: string): boolean {
  const db = getDb();
  return !!(db
    .prepare('SELECT 1 FROM light_frames WHERE file_path = ?')
    .get(filePath));
}

/** Back-fill session_id for a batch of frames by their file paths. */
export function setSessionId(filePaths: string[], sessionId: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE light_frames SET session_id = ? WHERE file_path = ?');
  const txn = db.transaction((paths: string[]) => {
    for (const p of paths) stmt.run(sessionId, p);
  });
  txn(filePaths);
}
