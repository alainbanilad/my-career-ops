@echo off
:: career-ops daily scan automation
:: Runs portal scan, exports dashboard, commits and pushes to GitHub
:: Scheduled via Windows Task Scheduler — 9AM and 6PM daily
::
:: Setup: schtasks /create /tn "career-ops-9am" /tr "D:\career-ops\career-ops\scripts\daily-scan.bat" /sc daily /st 09:00 /f
::        schtasks /create /tn "career-ops-6pm" /tr "D:\career-ops\career-ops\scripts\daily-scan.bat" /sc daily /st 18:00 /f

setlocal

:: ── Config ──────────────────────────────────────────────────────────
set CAREER_OPS_DIR=D:\career-ops\career-ops
set LOG_FILE=%CAREER_OPS_DIR%\scripts\scan.log
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2% %time:~0,8%

:: ── Logging helper ──────────────────────────────────────────────────
echo [%TIMESTAMP%] === daily-scan START === >> "%LOG_FILE%"

:: ── Change to project directory ─────────────────────────────────────
cd /d "%CAREER_OPS_DIR%"
if errorlevel 1 (
  echo [%TIMESTAMP%] ERROR: Could not cd to %CAREER_OPS_DIR% >> "%LOG_FILE%"
  exit /b 1
)

:: ── Step 1: Portal scan (zero-token) ────────────────────────────────
echo [%TIMESTAMP%] Running portal scan... >> "%LOG_FILE%"
node scan.mjs >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  echo [%TIMESTAMP%] WARN: scan.mjs exited with error >> "%LOG_FILE%"
) else (
  echo [%TIMESTAMP%] scan.mjs completed OK >> "%LOG_FILE%"
)

:: ── Step 2: Export static HTML dashboard ────────────────────────────
echo [%TIMESTAMP%] Exporting dashboard... >> "%LOG_FILE%"
node export-dashboard.mjs >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  echo [%TIMESTAMP%] WARN: export-dashboard.mjs exited with error >> "%LOG_FILE%"
) else (
  echo [%TIMESTAMP%] export-dashboard.mjs completed OK >> "%LOG_FILE%"
)

:: ── Step 3: Git commit and push ─────────────────────────────────────
echo [%TIMESTAMP%] Committing changes... >> "%LOG_FILE%"

:: Note: data/ files are gitignored (privacy) — only the HTML snapshot is committed
git add docs/index.html >> "%LOG_FILE%" 2>&1

:: Only commit if there are staged changes
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "auto: daily scan %date:~10,4%-%date:~4,2%-%date:~7,2% %time:~0,5%" >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo [%TIMESTAMP%] WARN: git commit failed >> "%LOG_FILE%"
  ) else (
    echo [%TIMESTAMP%] git commit OK >> "%LOG_FILE%"
    git push origin main >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
      echo [%TIMESTAMP%] WARN: git push failed (check credentials) >> "%LOG_FILE%"
    ) else (
      echo [%TIMESTAMP%] git push OK — dashboard live on GitHub Pages >> "%LOG_FILE%"
    )
  )
) else (
  echo [%TIMESTAMP%] No changes to commit (scan found no new offers) >> "%LOG_FILE%"
)

echo [%TIMESTAMP%] === daily-scan END === >> "%LOG_FILE%"
endlocal
