@echo off
title DocMind AI Project Runner

echo ===================================================
echo     Starting DocMind AI Full-Stack Application
echo ===================================================
echo.

echo [1/2] Launching Backend Server on port 8000 in a new window...
start "DocMind AI Backend" cmd /k "cd /d %~dp0backend && echo Activating virtual environment... && call .\venv\Scripts\activate.bat && echo Starting FastAPI backend... && python -m uvicorn app.main:app --port 8000 --reload"

echo [2/2] Launching Frontend Vite Server on port 5173 in a new window...
start "DocMind AI Frontend" cmd /k "cd /d %~dp0frontend && echo Starting React Vite frontend... && npm run dev"

echo.
echo ===================================================
echo     Both services are starting up!
echo.
echo     ➜ Backend API Docs:  http://localhost:8000/docs
echo     ➜ Frontend App:      http://localhost:5173/
echo ===================================================
echo.
pause
