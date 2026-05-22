import { readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { getDb } from '../db/index.js';
import { upsertTarget, normalizeCatalogId } from '../db/queries/targets.js';
import { insertFrame } from '../db/queries/frames.js';
import { insertStack } from '../db/queries/stacks.js';
import { upsertSession, groupFramesIntoSessions } from '../db/queries/sessions.js';
import { setSessionId } from '../db/queries/frames.js';
import * as logger from '../logger.js';
import { cfg } from '../config.js';

// ─── Regex patterns ─────────────────────────────────────────────────────────

// Light_M 3_30.0s_IRCUT_20260426-210141.fit
const LIGHT_RE = /^Light_(.+?)_([\d.]+)s_(\w+)_(\d{8})-(\d{6})\.fit$/i;

// Stacked_351_C 21_30.0s_IRCUT_20260518-005911.fit
const STACKED_RE = /^Stacked_(\d+)_(.+?)_([\d.]+)s_(\w+)_(\d{8})-(\d{6})\.fit$/i;

// DSO_Stacked_42_M 100_30.0s_20260508_225556.fit  (no filter in name)
const DSO_STACKED_RE = /^DSO_Stacked_(\d+)_(.+?)_([\d.]+)s_(\d{8})_(\d{6})\.fit$/i;

function parseTimestamp(datePart: string, timePart: string): Date {
  // datePart: "20260426", timePart: "210141"
  const y = datePart.slice(0, 4);
  const mo = datePart.slice(4, 6);
  const d = datePart.slice(6, 8);
  const h = timePart.slice(0, 2);
  const mi = timePart.slice(2, 4);
  const s = timePart.slice(4, 6);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
}

interface ParsedLight {
  target: string;
  exposureSec: number;
  filter: string;
  capturedAt: Date;
}

interface ParsedStack {
  frameCount: number;
  target: string;
  exposureSec: number;
  filter: string | null;
  stackedAt: Date;
  stackType: 'Stacked' | 'DSO_Stacked';
}

function parseLightFilename(filename: string): ParsedLight | null {
  const m = LIGHT_RE.exec(filename);
  if (!m) return null;
  return {
    target: normalizeCatalogId(m[1]),
    exposureSec: parseFloat(m[2]),
    filter: m[3].toUpperCase(),
    capturedAt: parseTimestamp(m[4], m[5]),
  };
}

function parseStackedFilename(filename: string): ParsedStack | null {
  let m = STACKED_RE.exec(filename);
  if (m) {
    return {
      frameCount: parseInt(m[1], 10),
      target: normalizeCatalogId(m[2]),
      exposureSec: parseFloat(m[3]),
      filter: m[4].toUpperCase(),
      stackedAt: parseTimestamp(m[5], m[6]),
      stackType: 'Stacked',
    };
  }
  m = DSO_STACKED_RE.exec(filename);
  if (m) {
    return {
      frameCount: parseInt(m[1], 10),
      target: normalizeCatalogId(m[2]),
      exposureSec: parseFloat(m[3]),
      filter: null,
      stackedAt: parseTimestamp(m[4], m[5]),
      stackType: 'DSO_Stacked',
    };
  }
  return null;
}

export interface ScanResult {
  dirsScanned: number;
  framesInserted: number;
  framesSkipped: number;
  stacksInserted: number;
  stacksSkipped: number;
  sessionsCreated: number;
  errors: number;
}

export function scanStacksDir(stacksDir: string = cfg.stacksDir): ScanResult {
  const result: ScanResult = {
    dirsScanned: 0,
    framesInserted: 0,
    framesSkipped: 0,
    stacksInserted: 0,
    stacksSkipped: 0,
    sessionsCreated: 0,
    errors: 0,
  };

  if (!existsSync(stacksDir)) {
    logger.warn(`Stacks dir not found: ${stacksDir}`);
    return result;
  }

  const topDirs = readdirSync(stacksDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  result.dirsScanned = topDirs.length;

  for (const dirName of topDirs) {
    const dirPath = join(stacksDir, dirName);
    const isSub = dirName.endsWith('_sub');

    const files = readdirSync(dirPath);

    if (isSub) {
      // ── Light frames ──────────────────────────────────────────────────────
      const lightsByTarget = new Map<
        string,
        Array<{ filePath: string; capturedAt: Date; exposureSec: number; filter: string }>
      >();

      for (const filename of files) {
        if (!filename.endsWith('.fit')) continue;
        const parsed = parseLightFilename(filename);
        if (!parsed) {
          logger.warn(`Unrecognized light frame: ${filename}`);
          result.errors++;
          continue;
        }

        const targetId = upsertTarget({ catalog_id: parsed.target });
        const filePath = join(dirPath, filename);

        const skipped = insertFrame({
          file_path: filePath,
          filename,
          target_id: targetId,
          captured_at: parsed.capturedAt.toISOString(),
          exposure_sec: parsed.exposureSec,
          filter: parsed.filter,
        });

        if (skipped) {
          result.framesSkipped++;
        } else {
          result.framesInserted++;
        }

        if (!lightsByTarget.has(parsed.target)) lightsByTarget.set(parsed.target, []);
        lightsByTarget.get(parsed.target)!.push({
          filePath,
          capturedAt: parsed.capturedAt,
          exposureSec: parsed.exposureSec,
          filter: parsed.filter,
        });
      }

      // ── Session grouping ─────────────────────────────────────────────────
      for (const [catalogId, frames] of lightsByTarget) {
        const targetId = upsertTarget({ catalog_id: catalogId });
        const sessions = groupFramesIntoSessions(targetId, frames, cfg.sessionGapMinutes);

        for (const s of sessions) {
          const { id: sessionId, wasNew } = upsertSession({
            target_id: s.targetId,
            session_date: s.sessionDate,
            filter: s.filter,
            frame_count: s.frameCount,
            total_exposure_sec: s.totalExposureSec,
            first_frame_path: s.firstFramePath,
            source: 'stacks_scan',
          });

          // Back-fill session_id on the individual frames
          const paths = s.frameIndices.map(i => frames[i].filePath);
          setSessionId(paths, sessionId);

          if (wasNew) result.sessionsCreated++;
        }
      }
    } else {
      // ── Stacked images ────────────────────────────────────────────────────
      const fitFiles = files.filter(f => f.endsWith('.fit'));

      for (const filename of fitFiles) {
        const parsed = parseStackedFilename(filename);
        if (!parsed) {
          logger.warn(`Unrecognized stacked file: ${filename}`);
          result.errors++;
          continue;
        }

        const targetId = upsertTarget({ catalog_id: parsed.target });
        const filePath = join(dirPath, filename);
        const stem = filename.replace(/\.fit$/, '');

        const previewPath = join(dirPath, `${stem}.jpg`);
        const thumbPath   = join(dirPath, `${stem}_thn.jpg`);

        const skipped = insertStack({
          file_path: filePath,
          filename,
          target_id: targetId,
          stacked_at: parsed.stackedAt.toISOString(),
          frame_count: parsed.frameCount,
          exposure_sec: parsed.exposureSec,
          filter: parsed.filter,
          stack_type: parsed.stackType,
          preview_path:   existsSync(previewPath) ? previewPath : null,
          thumbnail_path: existsSync(thumbPath)   ? thumbPath   : null,
        });

        if (skipped) result.stacksSkipped++;
        else result.stacksInserted++;
      }
    }
  }

  // Record the import run
  getDb()
    .prepare(
      `INSERT INTO import_runs
         (source, files_scanned, files_inserted, files_skipped, errors)
       VALUES (?,?,?,?,?)`,
    )
    .run(
      'stacks_scan',
      result.framesInserted + result.framesSkipped + result.stacksInserted + result.stacksSkipped,
      result.framesInserted + result.stacksInserted,
      result.framesSkipped + result.stacksSkipped,
      result.errors,
    );

  return result;
}
