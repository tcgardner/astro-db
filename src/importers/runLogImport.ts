import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { getDb } from '../db/index.js';
import { upsertTarget, normalizeCatalogId } from '../db/queries/targets.js';
import { insertRenamedImage } from '../db/queries/renamed.js';
import * as logger from '../logger.js';
import { cfg } from '../config.js';

// Matches: M31_Andromeda_Galaxy_02.jpg, M5_03.jpg, C21.jpg, NGC_5272.jpg
const SEQ_RE = /^(.+?)(?:_(\d{2}))?\.jpg$/i;

function parseSequenceNum(filename: string): { base: string; seqNum: number | null } {
  const m = SEQ_RE.exec(filename);
  if (!m) return { base: filename, seqNum: null };
  return {
    base: m[1],
    seqNum: m[2] ? parseInt(m[2], 10) : null,
  };
}

interface RunLogEntry {
  ts: string;
  source: string;
  stage: string;
  identifier: string | null;
  common_name: string | null;
  dest: string | null;
  success: boolean;
  notes: string;
}

interface RunLog {
  run_at: string;
  images: RunLogEntry[];
}

export interface RunLogImportResult {
  entriesRead: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export function importRunLog(outputDir: string = cfg.renamerOutputDir): RunLogImportResult {
  const result: RunLogImportResult = {
    entriesRead: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  const logPath = join(outputDir, 'run_log.json');
  const resolvedDir = join(outputDir, 'resolved');

  if (!existsSync(logPath)) {
    logger.warn(`run_log.json not found at: ${logPath}`);
    return result;
  }

  let log: RunLog;
  try {
    log = JSON.parse(readFileSync(logPath, 'utf8')) as RunLog;
  } catch (err) {
    logger.error(`Failed to parse run_log.json: ${String(err)}`);
    result.errors++;
    return result;
  }

  for (const entry of log.images) {
    result.entriesRead++;

    if (!entry.success || !entry.dest || !entry.identifier) {
      result.skipped++;
      continue;
    }

    const filePath = resolve(join(resolvedDir, entry.dest));

    if (!existsSync(filePath)) {
      logger.warn(`Renamed file not found on disk, skipping: ${filePath}`);
      result.skipped++;
      continue;
    }

    try {
      const catalogId = normalizeCatalogId(entry.identifier);
      const targetId = upsertTarget({
        catalog_id: catalogId,
        common_name: entry.common_name || null,
      });

      const { seqNum } = parseSequenceNum(entry.dest);

      const wasSkipped = insertRenamedImage({
        file_path: filePath,
        filename: entry.dest,
        source_name: entry.source || null,
        target_id: targetId,
        catalog_id: catalogId,
        common_name: entry.common_name || null,
        id_stage: entry.stage,
        processed_at: entry.ts,
        sequence_num: seqNum,
        run_log_path: logPath,
      });

      if (wasSkipped) result.skipped++;
      else result.inserted++;
    } catch (err) {
      logger.warn(`Entry ${entry.dest}: ${String(err)}`);
      result.errors++;
    }
  }

  getDb()
    .prepare(
      `INSERT INTO import_runs
         (source, files_scanned, files_inserted, files_skipped, errors)
       VALUES (?,?,?,?,?)`,
    )
    .run('renamer_log', result.entriesRead, result.inserted, result.skipped, result.errors);

  return result;
}
