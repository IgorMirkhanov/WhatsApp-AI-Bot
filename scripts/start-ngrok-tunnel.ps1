# Terminal 3 — Public HTTPS tunnel to localhost:3000 for Meta webhooks
Set-Location $PSScriptRoot\..
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Host "ngrok not found in PATH. Install: winget install ngrok.ngrok" -ForegroundColor Red
  exit 1
}
Write-Host "Starting ngrok tunnel -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "Use the https Forwarding URL + /webhook in Meta Dashboard" -ForegroundColor Yellow
ngrok http 3000
