# astro-db Redesign Plan

## Goals

- astro-db owns the **schema definition** and a **read-only analytics dashboard**.
- astro-db does **not** write data beyond initial schema creation and target seeding.
- All data population (light frames, stacks, sessions, renamed images, etc.) is handled by other apps.
- seestar-imaging-logger reads *from* astro-db (sessions table) instead of producing a CSV.
- messier-photos reads *from* astro-db (renamed_images table) for its catalog of finished images.
- Dashboard supports planning: total integration time per target, session history, pipeline status, seasonal prioritization.

---

## Image Type Distinctions

| Type | Source | Table | Downstream |
|---|---|---|---|
| Raw FITS light frames | Seestar capture; original filename is the unique ID | `light_frames` | Siril offline stacking |
| In-app stacked JPGs | Seestar auto-stack → astro-photo-renamer renames → Google Photos | `renamed_images` | Google Photos → messier-photos |
| Seestar S30 Pro FITS stacks | Seestar S30 Pro built-in stacker output | `stacks` | Archive / display |

astro-photo-renamer has **no involvement with light frames** — it only processes the in-app stacked JPGs.

---

## Schema

### `targets`
DSO catalog — Messier, Caldwell, NGC, IC objects.
Seeded once, rarely updated.

Fields: `id`, `catalog_id` (e.g. M31), `messier_num`, `caldwell_num`, `ngc_num`, `ic_num`,
`common_name`, `object_type`, `constellation`, `ra_deg`, `dec_deg`, `magnitude`, `size_arcmin`, `created_at`

### `light_frames`
One row per raw FITS light frame from the Seestar. Original filename is the unique identifier.
Primary source for integration time. Written by another app (not astro-db).

Fields: `id`, `file_path` (unique), `filename`, `target_id` (FK),
`captured_at` (from FITS DATE-OBS), `exposure_sec` (EXPTIME), `filter` (FILTER),
`gain` (GAIN), `ra_deg`, `dec_deg`, `created_at`

### `renamed_images`
One row per Seestar in-app stacked JPG, renamed by astro-photo-renamer.
These go to Google Photos and are consumed by messier-photos.
Written by another app (not astro-db); sourced from astro-photo-renamer run_log.json.

Mapping from run_log.json fields:
- `ts` → `processed_at`
- `source` → `original_filename`
- `dest` → `filename` (just the filename, e.g. M31_Andromeda_Galaxy.jpg)
- output directory + `dest` → `file_path` (full path to the renamed image file on disk)
- `identifier` → `catalog_id` (e.g. M31, C4)
- `stage` → `id_stage` (ai_vision | plate_solve | exif)
- `common_name` → `common_name` (may be null; look up from targets if null)
- `notes` → `notes`
- run-level `run_at` → `run_log_run_at` (for traceability)

Fields: `id`, `file_path` (unique — full path to the image file on disk), `filename`,
`original_filename`, `target_id` (FK), `catalog_id`, `common_name`, `id_stage`,
`processed_at`, `run_log_run_at`, `notes`, `created_at`

Only rows where `success = true` are imported by the writing app.

### `sessions`
One row per target + calendar date + filter combination.
Written and maintained by seestar-imaging-logger — not by astro-db.

Fields: `id`, `target_id` (FK), `session_date`, `filter`, `frame_count`,
`total_exposure_sec`,
`moon_illumination_pct` (0–100, computed from session_date by seestar-imaging-logger — no external data source needed),
`site_id` (FK to sites, nullable),
`seeing_rating` (1–5),
`transparency_rating` (1–5),
`sqm_reading` (mag/arcsec², optional — for users with a Sky Quality Meter),
`processing_status` (captured | stacked | processed | published),
`created_at`

**Moon phase:** Computed via astronomical formula (no API call, no new dependency) by
seestar-imaging-logger when writing session rows. Stored so the dashboard can filter
and correlate — e.g. "show only sessions where moon < 25%".

### `stacks`
FITS stacks produced by the Seestar S30 Pro's built-in stacker.
Distinct from the in-app JPGs (`renamed_images`) — these are the FITS output files.
Siril/PixInsight stacks are out of scope for now.
Written by another app (not astro-db).

Fields: `id`, `file_path` (unique), `filename`, `target_id` (FK), `session_id` (FK, optional),
`stacked_at`, `frame_count`, `exposure_sec`, `filter`, `stack_type`,
`created_at`

### `sites`
Imaging locations. Referenced by sessions so analytics can compare backyard vs. dark site.
Written by another app (not astro-db); rarely changes.

Fields: `id`, `name` (e.g. "Backyard", "Cherry Springs"), `bortle_class` (1–9),
`latitude`, `longitude`, `notes`, `created_at`

### `import_runs`
Audit log — one row per import operation. Written by other apps when they load data.

Fields: `id`, `run_at`, `source`, `files_scanned`, `files_inserted`, `files_skipped`,
`errors`, `notes`

---

## Deferred: `integration_goals`
**Out of scope for this iteration. Do not forget.**

Future table for goal-setting per target + filter:
- `target_id`, `filter`, `goal_sec`, `notes`, `created_at`
- A summary query joining `sessions` against this table gives "have vs. want" per target.
- seestar-imaging-logger may eventually use this for prioritization output.

---

## Commands

### `db` group
| Command | Description |
|---|---|
| `db init` | Create schema and seed the targets catalog |
| `db serve` | Start the Express API + serve the dashboard |

These are the only two commands. All data writing is handled by other apps.

---

## seestar-imaging-logger Integration

The logger currently produces a CSV. Under the new design:
- seestar-imaging-logger writes all `sessions` rows, including quality fields (seeing_rating, transparency_rating, sqm_reading, processing_status, site_id).
- seestar-imaging-logger also reads from `sessions` (joined with `targets`) to produce its output, replacing the CSV.

This is separate work tracked in the seestar-imaging-logger project.

---

## Target Identification for Light Frames (guidance for writing apps)

The Seestar embeds target information in FITS headers. Whatever app writes `light_frames` should read these directly:

- `OBJECT` → catalog name (e.g. "M31") → matched to `targets.catalog_id` to get `target_id`
- `CRVAL1` / `CRVAL2` → RA/Dec fallback if OBJECT is absent (same pattern as astro-photo-renamer's exifProbe)
- `DATE-OBS` → `captured_at`
- `EXPTIME` → `exposure_sec`
- `FILTER` → `filter`
- `GAIN` → `gain`

No renamer involvement, no manual flag needed.

---

## Web Dashboard

### Architecture

```
astro-db/                        ← npm workspace root
├── package.json                 ← workspace: ["dashboard"]
├── src/                         ← existing CLI + new API server
│   └── commands/
│       └── serveCmd.ts          ← new: db serve command
│   └── api/
│       ├── server.ts            ← Express app, mounts all routers
│       └── routes/
│           ├── targets.ts
│           ├── sessions.ts
│           ├── frames.ts
│           ├── sites.ts
│           └── stats.ts
└── dashboard/                   ← React + Vite app
    ├── package.json
    ├── vite.config.ts           ← proxies /api → Express (dev only)
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── views/
            ├── Overview.tsx
            ├── Targets.tsx
            ├── Sessions.tsx
            ├── Calendar.tsx
            ├── MoonCorrelation.tsx
            ├── Pipeline.tsx
            ├── Sites.tsx
            └── SeeingTrends.tsx
```

### Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | React + Vite | Lightweight, huge charting ecosystem |
| Charting | Recharts | React-native, composable, clean defaults |
| API server | Express | Already familiar, pairs directly with better-sqlite3 |
| Styling | Tailwind CSS | Utility-first, no component library needed for a personal tool |

### `db serve` command

Starts the Express API server. In production, also serves the built dashboard statically from `dashboard/dist/`.

Default port: **3001** (configurable via `PORT` env var).

### API endpoints (read-only)

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Summary: total targets imaged, total hours, session count, frame count |
| `GET /api/targets` | All targets with total integration time and session count |
| `GET /api/targets/:id/sessions` | Session history for one target |
| `GET /api/sessions` | All sessions, newest first; supports `?target=M31&filter=Ha` |
| `GET /api/sessions/calendar` | Session counts by date, formatted for heatmap |
| `GET /api/sessions/moon` | Sessions with moon illumination, for scatter plot |
| `GET /api/sessions/funnel` | Counts by processing_status for pipeline funnel |
| `GET /api/frames/summary` | Frame counts and total exposure grouped by target + filter |
| `GET /api/sites` | All sites with session count and total integration hours |

### Dashboard views

| View | Chart type | Key question answered |
|---|---|---|
| Overview | Stat cards + area chart | Total hours, sessions, targets imaged; integration over time |
| Targets | Horizontal bar chart | Which targets have the most integration time? |
| Filter breakdown | Stacked bar per target | L vs. Ha vs. OIII vs. RGB balance |
| Session calendar | GitHub-style heatmap | When am I actually imaging? |
| Sessions list | Sortable table | Drill into individual sessions by date/target/filter |
| Moon correlation | Scatter plot | Session quality vs. moon illumination — do I actually avoid full moon? |
| Pipeline funnel | Funnel / stacked bar | Captured → stacked → processed → published; what's sitting idle? |
| Site comparison | Grouped bar | Integration hours and session count by imaging site |
| Seeing trends | Box plot or line | Seeing/transparency over time; best months to image |

### Dev workflow

```sh
# From repo root — starts both Express (port 3001) and Vite (port 5173)
npm run dev

# Build dashboard for production
npm run build

# Run the dashboard in production
npx tsx src/main.ts db serve
```

Root `package.json` uses `concurrently` to run both processes with one command.
Vite proxies `/api/*` to `http://localhost:3001` in dev so CORS is never an issue.

### New config vars

```
PORT=3001   # Express API / dashboard server port
```

---

## Implementation Order

1. Wipe old schema and all old importers/commands
2. Write new DDL (`schema.ts`) — includes `sites` table and all new `sessions` fields
3. Implement `db init` (create schema, seed targets)
4. Set up npm workspace (root `package.json`)
5. Scaffold `dashboard/` (Vite + React + Tailwind + Recharts)
6. Implement Express API server + `db serve` command
7. Implement dashboard views:
   - Overview (stat cards + area chart)
   - Targets (bar chart)
   - Filter breakdown (stacked bar)
   - Session calendar (heatmap)
   - Sessions list (table)
   - Moon correlation (scatter)
   - Pipeline funnel
   - Site comparison
8. Update README

---

## Feature Plan: Renamed Images Tab

### Goal

Add a "Renamed Images" tab to the existing React dashboard that shows all rows in `renamed_images` — with thumbnails, metadata, filtering by catalog_id, set-primary, and delete.

### Design decision: extend the existing dashboard

No new server or build tooling needed. The React dashboard (`dashboard/`) is already the right home — it uses Tailwind, React Router, and the `/api` proxy. Adding a new view follows the exact pattern of every existing view.

---

### API changes — `src/api/routes/images.ts`

Two endpoints are missing for the view:

#### 1. `GET /api/images` (new)

List all `renamed_images`, optional `?catalog_id=` filter.

```sql
SELECT id, filename, original_filename, catalog_id, common_name,
       captured_at, id_stage, is_primary, created_at
FROM renamed_images
[WHERE catalog_id = ?]   -- only when query param is present
ORDER BY catalog_id ASC, is_primary DESC, captured_at DESC
```

- Returns JSON array.
- Must be registered **before** `/:catalogId` in the router so `/api/images` is not swallowed by that catch-all (the root path `''` vs `'/:catalogId'` don't conflict in Express, but ordering matters for clarity).

#### 2. `DELETE /api/images/:id` (new)

Delete one image: remove DB row + file from disk.

Steps:
1. Parse `id` — 400 if NaN.
2. Look up `file_path` from DB — 404 if not found.
3. Delete file from disk (ignore `ENOENT` — row may exist without file).
4. Delete DB row.
5. Return 204 No Content.

---

### Dashboard changes

#### New file: `dashboard/src/views/RenamedImages.tsx`

**State (managed locally — not via `useFetch` — because we need manual refetch after mutations):**

```ts
const [images, setImages]   = useState<RenamedImage[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError]     = useState<string | null>(null);
const [filter, setFilter]   = useState('');   // catalog_id text input
const [pending, setPending] = useState(false); // true while a mutation is in-flight
```

Fetch logic lives in a `useCallback`-wrapped `loadImages()` that builds the URL:
```ts
const url = filter.trim()
  ? `/api/images?catalog_id=${encodeURIComponent(filter.trim())}`
  : '/api/images';
```
Called on mount and after every mutation. No debounce — filter triggers on form submit / Enter key, keeping fetches predictable.

**`RenamedImage` interface:**
```ts
interface RenamedImage {
  id: number;
  filename: string;
  original_filename: string;
  catalog_id: string;
  common_name: string | null;
  captured_at: string | null;
  id_stage: string;
  is_primary: number;   // 0 | 1
  created_at: string;
}
```

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Renamed Images                    [42 images] │
│ [catalog_id filter input] [Search]            │
├────┬───────────┬──────────────────┬───────────┤
│ 64px│ Catalog  │ Filename / Stage │ Actions   │
│ thumb│ + name  │ Captured at      │           │
├────┴───────────┴──────────────────┴───────────┤
│ <img> │ M31 · Andromeda… │ M31_…jpg [primary] │  [Set Primary] [Delete]
│        │                  │ 2025-11-04         │
│ …                                             │
└──────────────────────────────────────────────┘
```

**Table columns:**
| Column | Content |
|---|---|
| Thumbnail | `<img src="/api/images/{id}/file" loading="lazy" />` — 64×64, `object-cover`, rounded |
| Target | `catalog_id` bold + `common_name` muted below |
| File | `filename` + `id_stage` badge (pill: `ai_vision` / `plate_solve` / `exif`) + `captured_at` date below |
| Primary | Indigo "Primary" pill if `is_primary = 1`, else empty |
| Actions | "Set Primary" button (hidden when already primary) + "Delete" button (red) |

**Interactions:**

- *Filter*: controlled text input, submit on Enter or button click — calls `loadImages()`.
- *Set Primary*: `PATCH /api/images/:id/primary` → optimistic-UI or just `loadImages()` after.
- *Delete*: `window.confirm('Delete this image?')` → `DELETE /api/images/:id` → `loadImages()`.

Both mutations set `pending = true` during the request, disabling all action buttons to prevent double-fire.

#### Edit: `dashboard/src/App.tsx`

Two additions, matching the existing pattern exactly:

```ts
// import
import RenamedImages from './views/RenamedImages.tsx';

// NAV array — add one entry
{ to: '/images', label: 'Images' },

// Routes — add one route
<Route path="/images" element={<RenamedImages />} />
```

Place the nav entry between `Pipeline` and `Sites` (thematically fits — images are pipeline output).

---

### What is NOT changing

- No new npm packages.
- No changes to the Vite config or proxy.
- No changes to the Express server mount or `db serve` command.
- No changes to existing routes or views.
- The `POST /api/images/upload` and `PATCH /api/images/:id/primary` routes already exist and are unchanged (the view calls PATCH but doesn't re-implement it).

---

### Implementation order

1. `src/api/routes/images.ts` — add `GET /` and `DELETE /:id` handlers.
2. `dashboard/src/views/RenamedImages.tsx` — new view, ~120 lines.
3. `dashboard/src/App.tsx` — import + nav entry + route (3 lines each).
