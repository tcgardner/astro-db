import { Router } from 'express';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import multer from 'multer';
import { getDb } from '../../db/index.js';
import { cfg } from '../../config.js';

export const imagesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// POST /api/images/upload — receive image binary + metadata, store in IMAGES_DIR
imagesRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing file part' });
    return;
  }

  const { catalog_id, filename, original_filename, id_stage, processed_at,
          captured_at, common_name, run_log_run_at } = req.body ?? {};

  if (!catalog_id || !filename || !original_filename || !id_stage || !processed_at) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const db = getDb();
  const target = db.prepare('SELECT id FROM targets WHERE catalog_id = ?').get(catalog_id) as
    { id: number } | undefined;

  // Use a unique temp path so the UNIQUE constraint never collides during the two-step insert.
  const tempPath = `__pending_${Date.now()}_${Math.random()}`;

  let id: number | bigint;
  try {
    const result = db.prepare(`
      INSERT INTO renamed_images
        (catalog_id, filename, original_filename, file_path, target_id, id_stage,
         captured_at, processed_at, common_name, run_log_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      catalog_id, filename, original_filename, tempPath,
      target?.id ?? null, id_stage,
      captured_at ?? null, processed_at,
      common_name ?? null, run_log_run_at ?? null,
    );
    id = result.lastInsertRowid;
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Already registered' });
    } else {
      throw err;
    }
    return;
  }

  // Derive stable storage path: {id}{ext}
  const ext = extname(filename).toLowerCase() || extname(original_filename).toLowerCase() || '.jpg';
  const storedName = `${id}${ext}`;
  const storedPath = join(cfg.imagesDir, storedName);

  try {
    writeFileSync(storedPath, req.file.buffer);
  } catch (err: any) {
    // Disk write failed — remove the orphaned DB row and return 500
    db.prepare('DELETE FROM renamed_images WHERE id = ?').run(id);
    res.status(500).json({ error: `Failed to write image: ${err.message}` });
    return;
  }

  db.prepare('UPDATE renamed_images SET file_path = ? WHERE id = ?').run(storedPath, id);

  res.status(201).json({ id, filename, file_url: `/api/images/${id}/file` });
});

// GET /api/images — list all images, optional ?catalog_id= filter
imagesRouter.get('/', (req, res) => {
  const db = getDb();
  const { catalog_id } = req.query as { catalog_id?: string };
  const rows = catalog_id
    ? db.prepare(`
        SELECT id, filename, original_filename, catalog_id, common_name,
               captured_at, id_stage, is_primary, created_at
        FROM renamed_images
        WHERE catalog_id = ?
        ORDER BY is_primary DESC, captured_at DESC, created_at DESC
      `).all(catalog_id)
    : db.prepare(`
        SELECT id, filename, original_filename, catalog_id, common_name,
               captured_at, id_stage, is_primary, created_at
        FROM renamed_images
        ORDER BY catalog_id ASC, is_primary DESC, captured_at DESC, created_at DESC
      `).all();
  res.json(rows);
});

// DELETE /api/images/:id — remove DB row and file from disk
imagesRouter.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const db = getDb();
  const row = db.prepare('SELECT file_path FROM renamed_images WHERE id = ?').get(id) as
    { file_path: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }

  try { unlinkSync(row.file_path); } catch { /* ignore ENOENT */ }
  db.prepare('DELETE FROM renamed_images WHERE id = ?').run(id);
  res.status(204).end();
});

// GET /api/images/summary — one best image URL per catalog_id (primary preferred, else most recent)
imagesRouter.get('/summary', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT catalog_id,
           '/api/images/' || id || '/file' AS file_url
    FROM (
      SELECT catalog_id, id,
             ROW_NUMBER() OVER (
               PARTITION BY catalog_id
               ORDER BY is_primary DESC, id DESC
             ) AS rn
      FROM renamed_images
    )
    WHERE rn = 1
  `).all() as { catalog_id: string; file_url: string }[];
  res.json(rows);
});

// PATCH /api/images/:id/primary — designate an image as primary for its catalog_id
imagesRouter.patch('/:id/primary', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const db = getDb();
  const row = db.prepare('SELECT id, catalog_id FROM renamed_images WHERE id = ?').get(id) as
    { id: number; catalog_id: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }

  db.transaction(() => {
    db.prepare('UPDATE renamed_images SET is_primary = 0 WHERE catalog_id = ? AND is_primary = 1')
      .run(row.catalog_id);
    db.prepare('UPDATE renamed_images SET is_primary = 1 WHERE id = ?').run(id);
  })();

  res.json({ id, catalog_id: row.catalog_id, is_primary: 1 });
});

// GET /api/images/:catalogId — list images for a DSO (primary first)
imagesRouter.get('/:catalogId', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, filename, original_filename, catalog_id, common_name,
           captured_at, id_stage, processed_at, created_at, is_primary
    FROM renamed_images
    WHERE catalog_id = ?
    ORDER BY is_primary DESC, captured_at DESC, created_at DESC
  `).all(req.params.catalogId) as Record<string, unknown>[];

  const withUrl = rows.map(r => ({ ...r, file_url: `/api/images/${r['id']}/file` }));
  res.json(withUrl);
});

// GET /api/images/:imageId/file — stream image from IMAGES_DIR
imagesRouter.get('/:imageId/file', (req, res) => {
  const id = parseInt(req.params.imageId, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const db = getDb();
  const row = db.prepare('SELECT file_path FROM renamed_images WHERE id = ?').get(id) as
    { file_path: string } | undefined;

  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  if (!existsSync(row.file_path)) { res.status(404).json({ error: 'File not found' }); return; }

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Vary', 'Accept');
  res.sendFile(row.file_path);
});
