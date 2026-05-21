@echo off
cd /d "%~dp0.."
echo Starting BullMQ worker...
npm run worker
