import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const sitesRouter = Router();

sitesRouter.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      s.id, s.name, s.bortle_class, s.latitude, s.longitude, s.notes,
      COUNT(DISTINCT sess.id) AS session_count,
      ROUND(COALESCE(SUM(sess.total_exposure_sec), 0) / 3600.0, 2) AS total_hours
    FROM sites s
    LEFT JOIN sessions sess ON sess.site_id = s.id
    GROUP BY s.id
    ORDER BY total_hours DESC
  `).all();
  res.json(rows);
});
