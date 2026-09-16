@echo off
title Aegis Character AI Launcher
echo ============================================================
echo   Starting Aegis Character AI (Backend + Vite Frontend)
echo   Local   : http://localhost:5173
echo   Network : http://192.168.29.240:5173
echo ============================================================
cd /d "%~dp0"
npm run dev
pause
