# astro-db

Personal astronomy SQLite database — index FITS light frames, stacked images, imaging sessions, and renamed images from your astrophotography workflow.

## Features

- **`db init`** — create the database, apply schema, and seed the DSO catalog (Messier, Caldwell, NGC, IC objects)
- **`import stacks`** — scan a stacks directory for FITS files; imports light frames, stacked images, and auto-groups them into imaging sessions
- **`import csv`** — import a [seestar-imaging-logger](https://github.com/tcgardner/seestar-imaging-logger) CSV export into `imaging_sessions`
- **`import renamer`** — import an [astro-photo-renamer](https://github.com/tcgardner/astro-photo-renamer) `run_log.json` into `renamed_images`
- **`db stats`** — print row counts for all tables
- **`db path`** — print the resolved database file path

## Requirements

- Node.js 18+
- Windows (default paths are Windows-style; override via `.env` for other platforms)

## Setup

```sh
cp .env.example .env
# Edit .env to set your paths
npm install
npm run build   # or: npx tsx src/main.ts ...
```

## Configuration

All settings are read from environment variables (`.env` file supported via dotenv).

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `C:\astro\astrophoto\astro.db` | Path to the SQLite database file |
| `STACKS_DIR` | `C:\astro\astrophoto\stacks` | Root directory scanned by `import stacks` |
| `RENAMER_OUTPUT_DIR` | `...\astro-photo-renamer\output` | Directory containing `run_log.json` |
| `SESSION_GAP_MINUTES` | `30` | Max gap (minutes) between frames before a new session is created |

## Usage

```sh
# Initialize (first run)
npx tsx src/main.ts db init

# Import stacks from default directory
npx tsx src/main.ts import stacks

# Import stacks from a specific directory
npx tsx src/main.ts import stacks "D:\captures\2025-05-10"

# Import a CSV log
npx tsx src/main.ts import csv imaging_log.csv

# Import renamer output
npx tsx src/main.ts import renamer

# Show table row counts
npx tsx src/main.ts db stats
```

## Schema

| Table | Description |
|---|---|
| `targets` | DSO catalog (Messier, Caldwell, NGC, IC) |
| `imaging_sessions` | One row per night/filter/target session |
| `light_frames` | Individual FITS light frames |
| `stacked_images` | Stacked FITS outputs |
| `renamed_images` | Files processed by astro-photo-renamer |
| `import_runs` | Audit log of each import run |

## License

MIT — see [LICENSE](LICENSE).
