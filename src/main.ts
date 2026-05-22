#!/usr/bin/env node
import { Command } from 'commander';
import { makeDbCommand } from './commands/dbCmd.js';
import { makeImportCommand } from './commands/importCmd.js';
import { makeQueryCommand } from './commands/queryCmd.js';
import * as logger from './logger.js';

const program = new Command();

program
  .name('astro-db')
  .description('Personal astronomy SQLite database — index FITS stacks, sessions, and renamed images.')
  .version('1.0.0');

program.addCommand(makeDbCommand());
program.addCommand(makeImportCommand());
program.addCommand(makeQueryCommand());

program.parseAsync(process.argv).catch(err => {
  logger.error(String(err));
  process.exit(1);
});
