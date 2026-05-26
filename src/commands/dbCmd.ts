import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { getDb } from '../db/index.js';
import { seedTargets } from '../seed/targets.js';
import { createServer } from '../api/server.js';
import { cfg } from '../config.js';
import * as logger from '../logger.js';

export function makeDbCommand(): Command {
  const db = new Command('db').description('Database management commands.');

  db.command('init')
    .description('Create the database schema and seed the DSO catalog.')
    .action(() => {
      getDb();
      const count = seedTargets();
      logger.ok(`Database ready at: ${cfg.dbPath}`);
      logger.ok(`Targets seeded: ${count} new (0 = catalog already current).`);
    });

  db.command('serve')
    .description('Start the analytics dashboard and API server.')
    .action(() => {
      const app = createServer();
      app.listen(cfg.port, () => {
        logger.ok(`Dashboard running at http://localhost:${cfg.port}`);
      });
    });

  db.command('migrate-images')
    .description('Copy externally-stored renamed images into IMAGES_DIR and update file_path in DB.')
    .action(() => {
      const db = getDb();
      const rows = db.prepare(
        `SELECT id, filename, original_filename, file_path FROM renamed_images
         WHERE file_path NOT LIKE ?`
      ).all(cfg.imagesDir + '%') as
        { id: number; filename: string; original_filename: string; file_path: string }[];

      if (!rows.length) {
        logger.ok('Nothing to migrate — all rows already point into IMAGES_DIR.');
        return;
      }

      logger.info(`Migrating ${rows.length} image(s) into ${cfg.imagesDir} …`);
      let ok = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!existsSync(row.file_path)) {
          logger.warn(`  ⚠ Skipped id=${row.id} (${row.filename}) — file not found: ${row.file_path}`);
          skipped++;
          continue;
        }

        const ext = extname(row.filename).toLowerCase() ||
                    extname(row.original_filename).toLowerCase() ||
                    '.jpg';
        const storedName = `${row.id}${ext}`;
        const storedPath = join(cfg.imagesDir, storedName);

        try {
          writeFileSync(storedPath, readFileSync(row.file_path));
          db.prepare('UPDATE renamed_images SET file_path = ? WHERE id = ?')
            .run(storedPath, row.id);
          logger.ok(`  ✓ id=${row.id}  ${row.filename} → ${storedName}`);
          ok++;
        } catch (err: any) {
          logger.warn(`  ⚠ Failed id=${row.id} (${row.filename}): ${err.message}`);
          skipped++;
        }
      }

      logger.ok(`Done. Migrated: ${ok}  Skipped: ${skipped}`);
    });

  return db;
}
