import { Router } from 'express';
import { existsSync } from 'fs';
import { getDb } from '../../db/index.js';

export const imagesRouter = Router();

// POST /api/images — register a renamed image
imagesRouter.post('/', (req, res) => {
  const { catalog_id, filename, original_filename, file_path, id_stage, processed_at,
          captured_at, common_name, run_log_run_at } = req.body ?? {};

  if (!catalog_id || !filename || !original_filename || !file_path || !id_stage || !processed_at) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const db = getDb();

  const target = db.prepare('SELECT id FROM targets WHERE catalog_id = ?').get(catalog_id) as
    { id: number } | undefined;

  try {
    const result = db.prepare(`
      INSERT INTO renamed_images
        (catalog_id, filename, original_filename, file_path, target_id, id_stage,
         captured_at, processed_at, common_name, run_log_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      catalog_id, filename, original_filename, file_path,
      target?.id ?? null, id_stage,
      captured_at ?? null, processed_at,
      common_name ?? null, run_log_run_at ?? null,
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Already registered' });
    } else {
      throw err;
    }
  }
});

// GET /api/images/:catalogId — list images for a DSO
imagesRouter.get('/:catalogId', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, filename, original_filename, catalog_id, common_name,
           captured_at, id_stage, processed_at, created_at
    FROM renamed_images
    WHERE catalog_id = ?
    ORDER BY captured_at DESC, created_at DESC
  `).all(req.params.catalogId) as Record<string, unknown>[];

  const withUrl = rows.map(r => ({ ...r, file_url: `/api/images/${r['id']}/file` }));
  res.json(withUrl);
});

// GET /api/images/:imageId/file — stream image from disk
imagesRouter.get('/:imageId/file', (req, res) => {
  const id = parseInt(req.params.imageId, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const db = getDb();
  const row = db.prepare('SELECT file_path FROM renamed_images WHERE id = ?').get(id) as
    { file_path: string } | undefined;

  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  if (!existsSync(row.file_path)) { res.status(404).json({ error: 'File not on disk' }); return; }

  res.sendFile(row.file_path);
});
