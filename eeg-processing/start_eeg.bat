@echo off
chcp 65001 > nul
title Fumorive EEG Server
color 0B

echo.
echo ============================================================
echo   FUMORIVE EEG SERVER - Muse 2 Integration
echo ============================================================
echo.

:: Cek apakah venv tersedia
if not exist "%~dp0venv310\Scripts\python.exe" (
    echo [ERROR] Virtual environment tidak ditemukan!
    echo Jalankan setup_venv.ps1 terlebih dahulu.
    pause
    exit /b 1
)

:: Pastikan muselsl stream sudah jalan
echo [STEP 1] Memulai Muse 2 LSL Stream...
echo Pastikan Muse 2 sudah dinyalakan dan Bluetooth aktif.
echo.
start "Muse 2 LSL Stream" cmd /k "%~dp0venv310\Scripts\muselsl.exe" stream
timeout /t 5 /nobreak > nul

:: Minta Session ID dari user
echo ============================================================
echo [STEP 2] Masukkan Session ID
echo ============================================================
echo.
echo Buka browser dan akses: https://fumorive.app
echo Klik "Mulai Sesi" di dashboard, lalu salin SESSION ID yang muncul.
echo.
echo Contoh format: 0e5c3f8a-1b2d-4e7f-9a3c-8d6e2f1b0c5a
echo.
set /p SESSION_ID=Paste Session ID di sini: 

if "%SESSION_ID%"=="" (
    echo [ERROR] Session ID tidak boleh kosong!
    pause
    exit /b 1
)

echo.
echo [INFO] Memulai EEG Server dengan Session ID: %SESSION_ID%
echo.
echo ============================================================
echo   EEG data akan dikirim ke backend Fumorive secara real-time
echo   Tutup window ini untuk menghentikan streaming
echo ============================================================
echo.

"%~dp0venv310\Scripts\python.exe" "%~dp0server.py" --session-id "%SESSION_ID%"

echo.
echo [INFO] EEG Server berhenti.
pause
