import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { targetsRouter } from './routes/targets.js';
import { sessionsRouter } from './routes/sessions.js';
import { framesRouter } from './routes/frames.js';
import { sitesRouter } from './routes/sites.js';
import { statsRouter } from './routes/stats.js';
import { schemaRouter } from './routes/schema.js';
import { imagesRouter } from './routes/images.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(): express.Express {
  const app = express();

  app.use(express.json());

  app.use('/api/targets', targetsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/frames', framesRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/schema', schemaRouter);
  app.use('/api/images', imagesRouter);

  const distPath = join(__dirname, '..', '..', 'dashboard', 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.send('Dashboard not built. Run: npm run build'));
  }

  return app;
}
