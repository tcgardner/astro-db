import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const targetsRouter = Router();

targetsRouter.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      t.id, t.catalog_id, t.messier_num, t.caldwell_num, t.ngc_num, t.ic_num,
      t.common_name, t.object_type, t.constellation, t.ra_deg, t.dec_deg,
      t.magnitude, t.size_arcmin,
      ROUND(COALESCE(SUM(s.total_exposure_sec), 0) / 3600.0, 2) AS total_hours,
      COUNT(DISTINCT s.id) AS session_count
    FROM targets t
    LEFT JOIN sessions s ON s.target_id = t.id
    GROUP BY t.id
    ORDER BY total_hours DESC
  `).all();
  res.json(rows);
});

targetsRouter.get('/:id/sessions', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      s.id, s.session_date, s.filter, s.frame_count,
      ROUND(s.total_exposure_sec / 3600.0, 2) AS hours,
      s.moon_illumination_pct, s.seeing_rating, s.transparency_rating,
      s.sqm_reading, s.processing_status,
      si.name AS site_name
    FROM sessions s
    LEFT JOIN sites si ON si.id = s.site_id
    WHERE s.target_id = ?
    ORDER BY s.session_date DESC
  `).all(req.params.id);
  res.json(rows);
});
