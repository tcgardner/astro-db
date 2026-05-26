import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', (req, res) => {
  const db = getDb();
  const { target, filter } = req.query as Record<string, string>;

  let sql = `
    SELECT
      s.id, s.session_date, s.filter, s.frame_count,
      s.total_exposure_sec,
      ROUND(s.total_exposure_sec / 3600.0, 2) AS hours,
      s.moon_illumination_pct, s.seeing_rating, s.transparency_rating,
      s.sqm_reading, s.processing_status,
      t.catalog_id, t.common_name,
      si.name AS site_name
    FROM sessions s
    JOIN targets t ON t.id = s.target_id
    LEFT JOIN sites si ON si.id = s.site_id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (target) { sql += ' AND t.catalog_id = ?'; params.push(target); }
  if (filter) { sql += ' AND s.filter = ?';     params.push(filter); }

  sql += ' ORDER BY s.session_date DESC';

  res.json(db.prepare(sql).all(...params));
});

sessionsRouter.get('/calendar', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT session_date, COUNT(*) AS session_count,
           ROUND(SUM(total_exposure_sec) / 3600.0, 2) AS hours
    FROM sessions
    GROUP BY session_date
    ORDER BY session_date
  `).all();
  res.json(rows);
});

sessionsRouter.get('/moon', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT moon_illumination_pct, seeing_rating, transparency_rating,
           ROUND(total_exposure_sec / 3600.0, 2) AS hours,
           session_date
    FROM sessions
    WHERE moon_illumination_pct IS NOT NULL
    ORDER BY session_date
  `).all();
  res.json(rows);
});

sessionsRouter.get('/funnel', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT processing_status, COUNT(*) AS count
    FROM sessions
    GROUP BY processing_status
  `).all();
  res.json(rows);
});
