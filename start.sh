#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "── astro-db ──────────────────────────────────────────"

# 1. Node version (≥18 required)
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed." >&2; exit 1
fi
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "Error: Node.js 24+ required (found $(node --version))." >&2; exit 1
fi

# 2. .env must exist
if [ ! -f .env ]; then
  echo "Error: .env not found. Run:" >&2
  echo "  cp .env.example .env" >&2
  echo "  Then edit DB_PATH and PORT." >&2
  exit 1
fi

# 3. Install dependencies if needed
if [ ! -f node_modules/.bin/tsx ]; then
  echo "Installing dependencies..."
  npm install
fi

# 4. Initialize database if the DB file does not exist yet
DB_PATH_RAW=$(grep '^DB_PATH=' .env | head -1 | cut -d= -f2-)
# Convert Windows backslash paths for bash (Git Bash / WSL)
DB_PATH="${DB_PATH_RAW//\\/\/}"
if [[ "$DB_PATH" =~ ^([A-Za-z]):/ ]]; then
  DB_PATH="/${BASH_REMATCH[1],,}${DB_PATH:2}"
fi
if [ -n "$DB_PATH" ] && [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH_RAW — running: npx tsx src/main.ts db init"
  npx tsx src/main.ts db init
fi

PORT_VAL=$(grep '^PORT=' .env | head -1 | cut -d= -f2- || echo "3001")
PORT_VAL="${PORT_VAL:-3001}"

echo "Starting:"
echo "  API + dashboard → http://localhost:${PORT_VAL}"
echo "  Vite HMR        → http://localhost:5173"
echo ""

exec npm run dev
