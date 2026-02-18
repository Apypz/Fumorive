@echo off
REM ============================================================
REM FUMORIVE - Stop All Services
REM ============================================================
REM Double-click this file to stop all Fumorive services.
REM ============================================================

title FUMORIVE - Stopping All Services...

cd /d "%~dp0"

echo.
echo   Stopping Fumorive services...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0stop_game.ps1"
