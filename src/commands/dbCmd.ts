import { Command } from 'commander';
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

  return db;
}
