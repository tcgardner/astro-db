import { Command } from 'commander';
import { scanStacksDir } from '../importers/stacksScan.js';
import { importCsv } from '../importers/csvImport.js';
import { importRunLog } from '../importers/runLogImport.js';
import { cfg } from '../config.js';
import * as logger from '../logger.js';

export function makeImportCommand(): Command {
  const imp = new Command('import').description('Import data into the database.');

  imp
    .command('stacks [dir]')
    .description(
      'Scan a stacks directory for FITS files and import light frames, stacked images, and sessions.\n' +
        `Default dir: ${cfg.stacksDir}`,
    )
    .action((dir?: string) => {
      const target = dir ?? cfg.stacksDir;
      logger.info(`Scanning stacks directory: ${target}`);
      const r = scanStacksDir(target);
      logger.ok(
        `Done. Dirs=${r.dirsScanned} | ` +
          `Frames +${r.framesInserted} skip=${r.framesSkipped} | ` +
          `Stacks +${r.stacksInserted} skip=${r.stacksSkipped} | ` +
          `Sessions +${r.sessionsCreated} | ` +
          `Errors=${r.errors}`,
      );
    });

  imp
    .command('csv <file>')
    .description('Import a seestar-imaging-logger CSV export into imaging_sessions.')
    .action((file: string) => {
      logger.info(`Importing CSV: ${file}`);
      const r = importCsv(file);
      logger.ok(
        `Done. Rows read=${r.rowsRead} | Sessions +${r.sessionsInserted} skip=${r.sessionsSkipped} | Errors=${r.errors}`,
      );
    });

  imp
    .command('renamer [dir]')
    .description(
      'Import astro-photo-renamer run_log.json into renamed_images.\n' +
        `Default dir: ${cfg.renamerOutputDir}`,
    )
    .action((dir?: string) => {
      const target = dir ?? cfg.renamerOutputDir;
      logger.info(`Importing renamer log from: ${target}`);
      const r = importRunLog(target);
      logger.ok(
        `Done. Read=${r.entriesRead} | Inserted=${r.inserted} | Skipped=${r.skipped} | Errors=${r.errors}`,
      );
    });

  return imp;
}
