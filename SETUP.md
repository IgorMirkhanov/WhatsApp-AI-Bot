# MediaPeace Bot — Local Run Checklist

## Prerequisites (system)

| Tool | Status | Action |
|------|--------|--------|
| Node.js 20+ | Required | `node -v` |
| Redis | Required for worker | Docker: `docker run -d -p 6379:6379 redis:7-alpine` |
| ngrok | Required for Meta webhooks | `winget install ngrok.ngrok` |

## One-time project setup (automated)

- [x] `npm install`
- [x] `npm run typecheck` (strict, zero errors)
- [x] `.env` created from template (fill TODO credentials)
- [x] Terminal scripts in `scripts/` and `.vscode/tasks.json`

## After filling `.env`

1. Start Redis (if not running).
2. Run **three** processes (do not use "Run All" until credentials are valid):

| # | Command | Script |
|---|---------|--------|
| 1 | `npm run dev` | `scripts/start-webhook-server.ps1` |
| 2 | `npm run worker` | `scripts/start-bullmq-worker.ps1` |
| 3 | `ngrok http 3000` | `scripts/start-ngrok-tunnel.ps1` |

**Cursor:** `Terminal` → `Run Task` → pick `1. Webhook Server`, etc.

## Meta Dashboard

- Callback URL: `https://<ngrok-host>/webhook`
- Verify token: `mediapeace_secret_token` (must match `.env`)
