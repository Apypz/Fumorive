@echo off
title FUMORIVE - EEG Streaming Server
cd /d "C:\Users\User\Fumorive\eeg-processing"
echo.
echo ============================================
echo   FUMORIVE EEG - Streaming Server
echo   Session: 0e562bd8-d76d-4c74-8b45-76d7a955d728
echo   Backend: http://localhost:8000
echo ============================================
echo.
"C:\Users\User\Fumorive\eeg-processing\venv310\Scripts\python.exe" server.py --session-id 0e562bd8-d76d-4c74-8b45-76d7a955d728 --backend-url http://localhost:8000
echo.
echo EEG Server stopped. Press any key to close...
pause >nul
