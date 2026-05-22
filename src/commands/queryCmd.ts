import { Command } from 'commander';
import { getDb } from '../db/index.js';
import { listTargetSummaries } from '../db/queries/targets.js';
import { listSessions } from '../db/queries/sessions.js';
import { listStacks } from '../db/queries/stacks.js';
import { listRenamed, listStageSummary } from '../db/queries/renamed.js';

// ─── Simple ASCII table printer ──────────────────────────────────────────────

function printTable(headers: string[], rows: string[][]): void {
  const allRows = [headers, ...rows];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)),
  );

  const sep = widths.map(w => '-'.repeat(w + 2)).join('+');
  const fmt = (cells: string[]) =>
    cells.map((c, i) => ` ${(c ?? '').padEnd(widths[i])} `).join('|');

  process.stdout.write(sep + '\n');
  process.stdout.write(fmt(headers) + '\n');
  process.stdout.write(sep + '\n');
  for (const row of rows) {
    process.stdout.write(fmt(row) + '\n');
  }
  process.stdout.write(sep + '\n');
  process.stdout.write(`${rows.length} row(s)\n`);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export function makeQueryCommand(): Command {
  const q = new Command('query').description('Query the database.');

  q.command('targets')
    .description('List observed targets with session counts, total integration, and renamed image count.')
    .option('--all', 'Include catalog entries with no observed data', false)
    .action((opts: { all: boolean }) => {
      const rows = listTargetSummaries(!opts.all);
      printTable(
        ['Catalog ID', 'Common Name', 'Type', 'Sessions', 'Frames', 'Int. (hrs)', 'Filters', 'Renamed'],
        rows.map(r => [
          r.catalog_id,
          r.common_name ?? '',
          r.object_type ?? '',
          String(r.total_sessions),
          String(r.total_frames),
          String(r.total_exposure_hrs),
          r.filters,
          String(r.renamed_count),
        ]),
      );
    });

  q
    .command('sessions [target]')
    .description('List imaging sessions. Optionally filter by catalog ID (e.g. M3, M 3, m3).')
    .action((target?: string) => {
      const rows = listSessions(target);
      printTable(
        ['ID', 'Catalog', 'Common Name', 'Date', 'Filter', 'Gain', 'Frames', 'Int. (s)', 'Telescope', 'Source'],
        rows.map(r => [
          String(r.id),
          r.catalog_id,
          r.common_name ?? '',
          r.session_date,
          r.filter ?? '',
          r.gain ? String(r.gain) : '',
          String(r.frame_count),
          String(r.total_exposure_sec),
          r.telescope ?? '',
          r.source,
        ]),
      );
    });

  q
    .command('stacks [target]')
    .description('List stacked images. Optionally filter by catalog ID.')
    .action((target?: string) => {
      const rows = listStacks(target);
      printTable(
        ['ID', 'Catalog', 'Common Name', 'Filename', 'Stacked At', 'Frames', 'Exp (s)', 'Filter', 'Type', 'Preview'],
        rows.map(r => [
          String(r.id),
          r.catalog_id,
          r.common_name ?? '',
          r.filename,
          r.stacked_at.slice(0, 16),
          String(r.frame_count),
          String(r.exposure_sec),
          r.filter ?? '',
          r.stack_type,
          r.preview_path ? 'yes' : '',
        ]),
      );
    });

  q
    .command('renamed [target]')
    .description('List renamed images from astro-photo-renamer. Optionally filter by catalog ID.')
    .action((target?: string) => {
      const rows = listRenamed(target);
      const stages = listStageSummary();

      printTable(
        ['ID', 'Catalog', 'Common Name', 'Filename', 'Stage', 'Processed At', 'Seq #', 'Source File'],
        rows.map(r => [
          String(r.id),
          r.catalog_id,
          r.common_name ?? '',
          r.filename,
          r.id_stage,
          r.processed_at.slice(0, 16),
          r.sequence_num ? String(r.sequence_num) : '',
          r.source_name ?? '',
        ]),
      );

      if (!target && stages.length) {
        process.stdout.write('\nIdentification stage breakdown:\n');
        for (const s of stages) {
          process.stdout.write(`  ${s.id_stage.padEnd(25)} ${s.count}\n`);
        }
      }
    });

  q.command('stats')
    .description('Overall summary statistics.')
    .action(() => {
      const db = getDb();

      const totalTargets = (db.prepare('SELECT COUNT(*) AS n FROM targets WHERE id IN (SELECT DISTINCT target_id FROM imaging_sessions)').get() as { n: number }).n;
      const totalSessions = (db.prepare('SELECT COUNT(*) AS n FROM imaging_sessions').get() as { n: number }).n;
      const totalNights = (db.prepare("SELECT COUNT(DISTINCT session_date) AS n FROM imaging_sessions").get() as { n: number }).n;
      const totalFrames = (db.prepare('SELECT COALESCE(SUM(frame_count),0) AS n FROM imaging_sessions').get() as { n: number }).n;
      const totalHrs = (db.prepare('SELECT ROUND(COALESCE(SUM(total_exposure_sec),0)/3600.0,2) AS n FROM imaging_sessions').get() as { n: number }).n;
      const totalStacks = (db.prepare('SELECT COUNT(*) AS n FROM stacked_images').get() as { n: number }).n;
      const totalRenamed = (db.prepare('SELECT COUNT(*) AS n FROM renamed_images').get() as { n: number }).n;

      process.stdout.write('\nAstronomy Database Summary\n');
      process.stdout.write('══════════════════════════\n');
      process.stdout.write(`  Targets observed   ${totalTargets}\n`);
      process.stdout.write(`  Imaging sessions   ${totalSessions}\n`);
      process.stdout.write(`  Unique nights      ${totalNights}\n`);
      process.stdout.write(`  Total frames       ${totalFrames}\n`);
      process.stdout.write(`  Total integration  ${totalHrs} hours\n`);
      process.stdout.write(`  Stacked images     ${totalStacks}\n`);
      process.stdout.write(`  Renamed images     ${totalRenamed}\n`);

      // Filter breakdown
      const filterBreakdown = db.prepare(
        `SELECT filter, COUNT(*) AS sessions, SUM(frame_count) AS frames,
                ROUND(SUM(total_exposure_sec)/3600.0,2) AS hrs
         FROM imaging_sessions
         WHERE filter IS NOT NULL
         GROUP BY filter
         ORDER BY hrs DESC`,
      ).all() as Array<{ filter: string; sessions: number; frames: number; hrs: number }>;

      if (filterBreakdown.length) {
        process.stdout.write('\nBy filter:\n');
        printTable(
          ['Filter', 'Sessions', 'Frames', 'Int. (hrs)'],
          filterBreakdown.map(r => [r.filter, String(r.sessions), String(r.frames), String(r.hrs)]),
        );
      }

      // ID stage breakdown
      const stages = db.prepare(
        `SELECT id_stage, COUNT(*) AS count FROM renamed_images GROUP BY id_stage ORDER BY count DESC`,
      ).all() as Array<{ id_stage: string; count: number }>;

      if (stages.length) {
        process.stdout.write('\nRenamer ID stages:\n');
        printTable(
          ['Stage', 'Count'],
          stages.map(r => [r.id_stage, String(r.count)]),
        );
      }
    });

  return q;
}
