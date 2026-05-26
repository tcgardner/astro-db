Set-Location $PSScriptRoot

Write-Host "── astro-db ──────────────────────────────────────────" -ForegroundColor Cyan

# 1. Node version (≥18 required)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed."; exit 1
}
$nodeVer = (node --version) -replace '^v', ''
if ([int]($nodeVer.Split('.')[0]) -lt 18) {
    Write-Error "Node.js 18+ required (found v$nodeVer)."; exit 1
}

# 2. .env must exist
if (-not (Test-Path '.env')) {
    Write-Error ".env not found.`n  Run: copy .env.example .env`n  Then edit DB_PATH and PORT."
    exit 1
}

# 3. Install dependencies if needed
if (-not (Test-Path 'node_modules\.bin\tsx.cmd')) {
    Write-Host "Installing dependencies..."
    npm install
}

# 4. Initialize database if the DB file does not exist yet
$dbLine = (Get-Content '.env' | Where-Object { $_ -match '^DB_PATH=' } | Select-Object -First 1)
$dbPath = if ($dbLine) { $dbLine -replace '^DB_PATH=', '' } else { 'C:\astro\astrophoto\astro.db' }
if (-not (Test-Path $dbPath)) {
    Write-Host "Database not found at $dbPath — running: npx tsx src/main.ts db init"
    npx tsx src/main.ts db init
}

$portLine = (Get-Content '.env' | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1)
$port = if ($portLine) { $portLine -replace '^PORT=', '' } else { '3001' }

Write-Host "Starting:"
Write-Host "  API + dashboard -> http://localhost:$port"
Write-Host "  Vite HMR        -> http://localhost:5173"
Write-Host ""

npm run dev
