@echo off
REM ============================================================
REM FUMORIVE - Start Game (All Services)
REM ============================================================
REM Double-click this file to start all Fumorive services!
REM EEG akan ditanyakan di akhir setelah game jalan.
REM
REM Options:
REM   start_game.bat            = Start game (EEG ditanyakan di akhir)
REM   start_game.bat noeeg      = Start game tanpa EEG
REM   start_game.bat skipdb     = Skip Docker startup
REM ============================================================

title FUMORIVE - Starting All Services...

cd /d "%~dp0"

REM Check for parameters
set "PARAMS="
if /i "%1"=="noeeg" set "PARAMS=-SkipEEG"
if /i "%1"=="skipdb" set "PARAMS=-SkipDocker"
if /i "%1"=="skipdb" if /i "%2"=="noeeg" set "PARAMS=-SkipDocker -SkipEEG"
if /i "%1"=="noeeg" if /i "%2"=="skipdb" set "PARAMS=-SkipDocker -SkipEEG"

echo.
echo   Starting Fumorive...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0start_game.ps1" %PARAMS%
