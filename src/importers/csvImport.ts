import { readFileSync, existsSync } from 'fs';
import { getDb } from '../db/index.js';
import { upsertTarget, normalizeCatalogId } from '../db/queries/targets.js';
import { upsertSession } from '../db/queries/sessions.js';
import * as logger from '../logger.js';

export interface CsvImportResult {
  rowsRead: number;
  sessionsInserted: number;
  sessionsSkipped: number;
  errors: number;
}

export function importCsv(csvPath: string): CsvImportResult {
  const result: CsvImportResult = {
    rowsRead: 0,
    sessionsInserted: 0,
    sessionsSkipped: 0,
    errors: 0,
  };

  if (!existsSync(csvPath)) {
    logger.warn(`CSV file not found: ${csvPath}`);
    return result;
  }

  const raw = readFileSync(csvPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    logger.warn('CSV file has no data rows.');
    return result;
  }

  // Detect delimiter: tab (seestar-imaging-logger default) or comma
  const header = lines[0];
  const delimiter = header.includes('\t') ? '\t' : ',';
  const headers = header.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  const col = (row: string[], name: string): string => {
    const idx = headers.indexOf(name);
    if (idx === -1) return '';
    return (row[idx] ?? '').trim().replace(/^"|"$/g, '');
  };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter);
    result.rowsRead++;

    try {
      const sessionDate = col(row, 'Date (YYYY-MM-DD)');
      const catalogRaw  = col(row, 'Catalog #');
      const commonName  = col(row, 'Target/Object Name');
      const objectType  = col(row, 'Object Type');
      const filterStr   = col(row, 'Filter Used');
      const gainStr     = col(row, 'Gain / ISO');
      const raStr       = col(row, 'RA');
      const decStr      = col(row, 'DEC');
      const telescope   = col(row, 'TELESCOP');
      const fitsPath    = col(row, 'FITS File Path');
      const notes       = col(row, 'Notes / Issues');

      // "129 / 3870" → frameCount=129, totalExposureSec=3870
      const subsCell = col(row, 'Number of Subs / Total Integration Time (seconds)');
      let frameCount = 0;
      let totalExposureSec = 0;
      const subsMatch = subsCell.match(/(\d+)\s*\/\s*(\d+)/);
      if (subsMatch) {
        frameCount = parseInt(subsMatch[1], 10);
        totalExposureSec = parseInt(subsMatch[2], 10);
      }

      if (!sessionDate || !catalogRaw) {
        result.errors++;
        continue;
      }

      const catalogId = normalizeCatalogId(catalogRaw);

      const targetId = upsertTarget({
        catalog_id: catalogId,
        common_name: commonName || null,
        object_type: objectType || null,
        ra_deg: raStr ? parseFloat(raStr) : null,
        dec_deg: decStr ? parseFloat(decStr) : null,
      });

      const { wasNew } = upsertSession({
        target_id: targetId,
        session_date: sessionDate,
        filter: filterStr || null,
        gain: gainStr ? parseInt(gainStr, 10) || null : null,
        frame_count: frameCount,
        total_exposure_sec: totalExposureSec,
        ra_deg: raStr ? parseFloat(raStr) : null,
        dec_deg: decStr ? parseFloat(decStr) : null,
        telescope: telescope || null,
        notes: notes || null,
        first_frame_path: fitsPath || null,
        source: 'csv_import',
      });

      if (wasNew) result.sessionsInserted++;
      else result.sessionsSkipped++;
    } catch (err) {
      logger.warn(`Row ${i + 1}: ${String(err)}`);
      result.errors++;
    }
  }

  getDb()
    .prepare(
      `INSERT INTO import_runs
         (source, files_scanned, files_inserted, files_skipped, errors)
       VALUES (?,?,?,?,?)`,
    )
    .run('csv_import', result.rowsRead, result.sessionsInserted, result.sessionsSkipped, result.errors);

  return result;
}
