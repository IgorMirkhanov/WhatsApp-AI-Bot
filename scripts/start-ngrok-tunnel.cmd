@echo off
cd /d "%~dp0.."
where ngrok >nul 2>&1
if errorlevel 1 (
  echo ngrok not found. Run: winget install ngrok.ngrok
  exit /b 1
)
echo Starting ngrok http 3000...
ngrok http 3000
