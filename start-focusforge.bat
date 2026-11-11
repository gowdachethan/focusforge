@echo off
title FOCUSFORGE - GATE 2027 + Robotics & AI
cd /d "%~dp0"
echo.
echo ============================================================
echo   FOCUSFORGE - GATE 2027 + Robotics ^& AI
echo ============================================================
echo   Windows Local App URL:  http://127.0.0.1:4173
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do (
    echo   Mobile Wi-Fi LAN URL:   http://%%b:4173
  )
)
echo   Keep this terminal open while studying. Press Ctrl+C to stop.
echo ============================================================
echo.

REM Launch standalone Windows App window in Edge or Chrome after short delay
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" cmd /c "timeout /t 2 /nobreak >nul && start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:4173"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" cmd /c "timeout /t 2 /nobreak >nul && start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:4173"
) else (
  start "" cmd /c "timeout /t 2 /nobreak >nul && start "" http://127.0.0.1:4173"
)

if exist "C:\Users\rchet\.tools\nodejs\node.exe" (
  "C:\Users\rchet\.tools\nodejs\node.exe" "node_modules\vite\bin\vite.js" preview --port 4173 --host 0.0.0.0
) else (
  npx vite preview --port 4173 --host 0.0.0.0
)
