import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const framesRouter = Router();

framesRouter.get('/summary', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      t.catalog_id, t.common_name,
      lf.filter,
      COUNT(*) AS frame_count,
      ROUND(SUM(lf.exposure_sec) / 3600.0, 2) AS hours
    FROM light_frames lf
    JOIN targets t ON t.id = lf.target_id
    GROUP BY lf.target_id, lf.filter
    ORDER BY t.catalog_id, lf.filter
  `).all();
  res.json(rows);
});
