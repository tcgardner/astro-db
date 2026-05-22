import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

function optional(key: string, defaultValue = ''): string {
  return (process.env[key] ?? defaultValue).trim();
}

function parseInt_(key: string, defaultValue = 0): number {
  const val = parseInt(process.env[key] ?? String(defaultValue), 10);
  return isNaN(val) ? defaultValue : val;
}

class Config {
  readonly dbPath: string;
  readonly stacksDir: string;
  readonly renamerOutputDir: string;
  readonly sessionGapMinutes: number;

  constructor() {
    this.dbPath = optional(
      'DB_PATH',
      resolve('C:\\Users\\tcgar\\astro\\astrophoto\\astro.db'),
    );
    this.stacksDir = optional(
      'STACKS_DIR',
      resolve('C:\\Users\\tcgar\\astro\\astrophoto\\stacks'),
    );
    this.renamerOutputDir = optional(
      'RENAMER_OUTPUT_DIR',
      resolve('C:\\Users\\tcgar\\astro\\astrophoto\\tools\\astro-photo-renamer\\output'),
    );
    this.sessionGapMinutes = parseInt_('SESSION_GAP_MINUTES', 30);
  }
}

export const cfg = new Config();
