#!/usr/bin/env node
import { Command } from 'commander';
import { makeDbCommand } from './commands/dbCmd.js';
import * as logger from './logger.js';

const program = new Command();

program
  .name('astro-db')
  .description('Personal astronomy SQLite database — schema and read-only analytics dashboard.')
  .version('2.0.0');

program.addCommand(makeDbCommand());

program.parseAsync(process.argv).catch(err => {
  logger.error(String(err));
  process.exit(1);
});
