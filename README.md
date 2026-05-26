# astro-db

Personal astronomy SQLite database — schema definition and read-only analytics dashboard for astrophotography data.

astro-db owns the schema and serves the dashboard. All data (light frames, sessions, stacks, renamed images) is written by other tools in the ecosystem.

## Ecosystem

| Tool | Role |
|---|---|
| **astro-db** | Schema owner + read-only analytics dashboard |
| **seestar-imaging-logger** | Writes `sessions`; reads sessions to produce output |
| **astro-photo-renamer** | Produces `run_log.json` consumed by the renamer importer |
| **messier-photos** | Reads `renamed_images` for its DSO image catalog |

## Getting Started

```bash
# 1. Copy and edit env
cp .env.example .env
# Edit DB_PATH (path to your SQLite file) and PORT (default: 3001)

# 2. Install dependencies (root + dashboard workspace)
npm install

# 3. Initialize the database (first run only)
npx tsx src/main.ts db init

# 4. Start the server + dashboard
npm run dev
```

Or use the startup script (handles steps 3 and 4 automatically):

```bash
bash start.sh          # macOS / Linux / Git Bash
./start.ps1            # PowerShell (Windows)
start.cmd              # CMD (Windows)
```

Open the dashboard at **http://localhost:5173** (Vite dev) or **http://localhost:3001** (production build served by Express).

## Commands

```sh
# First run — create schema and seed the DSO catalog
npx tsx src/main.ts db init

# Start the analytics dashboard (default port 3001)
npx tsx src/main.ts db serve
```

## Setup

```sh
cp .env.example .env
# Edit .env to set DB_PATH and PORT
npm install
npm run build
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `C:\astro\astrophoto\astro.db` | Path to the SQLite database file |
| `PORT` | `3001` | Port for the Express API and dashboard server |

## Dashboard

Open `http://localhost:3001` after running `db serve`.

| View | What it shows |
|---|---|
| Overview | Total hours, sessions, targets imaged; integration over time |
| Targets | Integration time per target |
| Filter breakdown | L / Ha / OIII / RGB balance per target |
| Session calendar | Imaging activity heatmap by date |
| Sessions | Full session list, sortable and filterable |
| Moon correlation | Session quality vs. moon illumination |
| Pipeline | Captured → stacked → processed → published funnel |
| Sites | Integration hours and sessions by imaging location |
| Seeing trends | Seeing and transparency over time |

## Schema

| Table | Description | Written by |
|---|---|---|
| `targets` | DSO catalog (Messier, Caldwell, NGC, IC) | astro-db (`db init`) |
| `sessions` | One row per target + date + filter session | seestar-imaging-logger |
| `light_frames` | Individual raw FITS light frames | TBD |
| `stacks` | Seestar S30 Pro FITS stacks | TBD |
| `renamed_images` | In-app JPGs renamed by astro-photo-renamer | TBD |
| `sites` | Imaging locations (backyard, dark site, etc.) | TBD |
| `import_runs` | Audit log of data import operations | Writing apps |

## Development

```sh
# Starts Express (port 3001) and Vite dev server (port 5173) concurrently
npm run dev

# Build the dashboard for production
npm run build
```

## License

MIT — see [LICENSE](LICENSE).
