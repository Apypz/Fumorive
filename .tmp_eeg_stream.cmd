@echo off
title FUMORIVE - EEG Muse LSL Stream
cd /d "C:\Users\User\Fumorive\eeg-processing"
echo.
echo ============================================
echo   FUMORIVE EEG - Muse 2 LSL Stream
echo   Searching for Muse 2 headband...
echo ============================================
echo.
"C:\Users\User\Fumorive\eeg-processing\venv310\Scripts\muselsl.exe" stream
echo.
echo Muse stream stopped. Press any key to close...
pause >nul
