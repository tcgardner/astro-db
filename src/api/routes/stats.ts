import { Router } from 'express';
import { getDb } from '../../db/index.js';

export const statsRouter = Router();

statsRouter.get('/', (_req, res) => {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      (SELECT COUNT(DISTINCT target_id) FROM sessions)                          AS targets_imaged,
      ROUND(COALESCE((SELECT SUM(total_exposure_sec) FROM sessions), 0) / 3600.0, 2) AS total_hours,
      (SELECT COUNT(*) FROM sessions)                                           AS session_count,
      (SELECT COUNT(*) FROM light_frames)                                       AS frame_count
  `).get();

  res.json(row);
});
