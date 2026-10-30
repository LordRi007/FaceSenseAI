@echo off
title FaceSense AI - FastAPI Backend Server
echo ===================================================
echo Starting FaceSense AI Backend Server (FastAPI)
echo ===================================================
cd /d "%~dp0backend"
set "PYTHONPATH=."
D:\face_scan_venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

