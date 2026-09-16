@echo off
title Aegis Character AI Launcher
echo ============================================================
echo   Starting Aegis Character AI (Backend + Vite Frontend)
echo   Backend : http://localhost:3001
echo   Frontend: http://localhost:5173
echo ============================================================
cd /d "%~dp0"
npm run dev
pause
