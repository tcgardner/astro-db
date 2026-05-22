import { Command } from 'commander';
import { getDb } from '../db/index.js';
import { seedTargets } from '../seed/targets.js';
import { cfg } from '../config.js';
import * as logger from '../logger.js';
import { SCHEMA_VERSION } from '../db/schema.js';

export function makeDbCommand(): Command {
  const db = new Command('db').description('Database management commands.');

  db.command('init')
    .description('Create the database, apply schema, and seed the DSO catalog.')
    .action(() => {
      const database = getDb();
      const count = seedTargets();
      const row = database
        .prepare('SELECT version FROM schema_version ORDER BY rowid DESC LIMIT 1')
        .get() as { version: number } | undefined;
      logger.ok(`Database initialized at: ${cfg.dbPath}`);
      logger.ok(`Schema version: ${row?.version ?? SCHEMA_VERSION}`);
      logger.ok(`Seed complete: ${count} catalog entries seeded (0 = already existed).`);
    });

  db.command('path')
    .description('Print the resolved database file path.')
    .action(() => {
      process.stdout.write(cfg.dbPath + '\n');
    });

  db.command('stats')
    .description('Print raw row counts for all tables.')
    .action(() => {
      const database = getDb();
      const tables = [
        'targets', 'imaging_sessions', 'light_frames',
        'stacked_images', 'renamed_images', 'import_runs',
      ];
      for (const t of tables) {
        const row = database.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number };
        process.stdout.write(`${t.padEnd(20)} ${String(row.n).padStart(6)} rows\n`);
      }
    });

  return db;
}
