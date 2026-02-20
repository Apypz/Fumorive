title FUMORIVE - Backend (FastAPI :8000)
cd /d "C:\Users\ASUS\Documents\Kuliah\Magang LPSKE\Fumorive\backend"
echo.
echo ============================================
echo   FUMORIVE BACKEND - FastAPI Server
echo   Port: 8000
echo   Docs: http://localhost:8000/api/docs
echo ============================================
echo.
"C:\Users\ASUS\Documents\Kuliah\Magang LPSKE\Fumorive\backend\venv\Scripts\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo Backend stopped. Press any key to close...
pause >nul
