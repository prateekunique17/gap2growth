@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)

rem If the portal is already running, open it instead of starting a duplicate.
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:3000; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo Java Exam Portal is already running at http://localhost:3000
  start "" http://localhost:3000
  exit /b 0
)

if not defined GEMINI_API_KEY if not exist ".env" echo Gemini is not configured. Add GEMINI_API_KEY to .env to enable question generation.

echo Starting Java Exam Portal at http://localhost:3000
start "" http://localhost:3000
node server.mjs
if errorlevel 1 (
  echo.
  echo The server stopped because of an error. Check the message above.
  pause
)
