@echo off
cd /d "%~dp0"

echo -- astro-db --

where node >nul 2>&1 || (echo Error: Node.js is not installed. && exit /b 1)

if not exist .env (
    echo Error: .env not found. Run: copy .env.example .env
    exit /b 1
)

if not exist node_modules\.bin\tsx.cmd (
    echo Installing dependencies...
    call npm install
)

:: Read DB_PATH from .env and check if DB needs init
for /f "usebackq tokens=1* delims==" %%a in (".env") do (
    if "%%a"=="DB_PATH" set "_DB_PATH=%%b"
)
if not defined _DB_PATH set "_DB_PATH=C:\astro\astrophoto\astro.db"
if not exist "%_DB_PATH%" (
    echo Database not found at %_DB_PATH% -- running: npx tsx src/main.ts db init
    call npx tsx src/main.ts db init
)

echo Starting:
echo   API + dashboard -^> http://localhost:3001
echo   Vite HMR        -^> http://localhost:5173
echo.

call npm run dev
