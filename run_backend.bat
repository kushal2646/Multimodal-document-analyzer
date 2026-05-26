@echo off
title DocMind AI Backend Server (Root Redirect)
cd /d "%~dp0backend"
echo Activating Python virtual environment...
call .\venv\Scripts\activate.bat
echo Starting DocMind AI FastAPI Server on port 8000...
python -m uvicorn app.main:app --port 8000 --reload
pause
