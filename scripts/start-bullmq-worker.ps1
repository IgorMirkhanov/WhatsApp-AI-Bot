# Terminal 2 — BullMQ touchpoint worker (requires Redis)
Set-Location $PSScriptRoot\..
Write-Host "Starting BullMQ worker (npm run worker)..." -ForegroundColor Cyan
npm run worker
