@echo off
title FaceSense AI Launcher
echo ===================================================
echo Launching FaceSense AI (Backend + Frontend)
echo ===================================================
start "FaceSense Backend" run_backend.bat
timeout /t 2 /nobreak >nul
start "FaceSense Frontend" run_frontend.bat
echo FaceSense AI is starting up!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo ===================================================

