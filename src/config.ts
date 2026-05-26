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
  readonly port: number;

  constructor() {
    this.dbPath = optional(
      'DB_PATH',
      resolve('C:\\Users\\tcgar\\astro\\astrophoto\\astro.db'),
    );
    this.port = parseInt_('PORT', 3001);
  }
}

export const cfg = new Config();
