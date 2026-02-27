# ERGODRIVE Backend - Setup Guide

## Prerequisites

### 1. Install PostgreSQL
Download and install PostgreSQL 15+ from [official website](https://www.postgresql.org/download/windows/)

During installation:
- Set password for `postgres` user (e.g., `postgres`)
- Use default port: `5432`
- Remember the installation directory

**Note:** If you installed PostgreSQL 18, use `C:\Program Files\PostgreSQL\18\bin` instead of `C:\Program Files\PostgreSQL\15\bin` in all commands below.

### 2. Install TimescaleDB Extension

**Option A: Using Installer (Recommended for Windows)**
```powershell
# Download TimescaleDB installer for Windows
# Visit: https://docs.timescale.com/install/latest/self-hosted/installation-windows/

# Run the installer and select your PostgreSQL version
```

**Option B: Using psql Command**
```powershell
# Open Command Prompt as Administrator
# Navigate to PostgreSQL bin directory (adjust version if needed)
cd "C:\Program Files\PostgreSQL\18\bin"

# Connect to PostgreSQL
.\psql.exe -U postgres

# Enable TimescaleDB extension (run inside psql)
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

---

## Database Setup

### 1. Create Database
```powershell
# Open Command Prompt and navigate to PostgreSQL bin (adjust version if needed)
cd "C:\Program Files\PostgreSQL\18\bin"

# Create database
.\psql.exe -U postgres -c "CREATE DATABASE ergodrive;"

# Verify database created
.\psql.exe -U postgres -l
```

### 2. Update Environment Variables
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ergodrive
DATABASE_URL_ASYNC=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/ergodrive
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

---

## Python Environment Setup

### 1. Create Virtual Environment
```powershell
# Navigate to backend directory
cd c:\Users\User\Fumorive\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Install Dependencies
```powershell
# Activate venv first
.\venv\Scripts\Activate.ps1

# Install all requirements
pip install -r requirements.txt
```

---

## Initialize Database

### 1. Run Database Migration Script
```powershell
# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Initialize database tables and TimescaleDB hypertables
python -m app.db.init_db
```

This script will:
- Create all database tables (users, sessions, eeg_data, etc.)
- Enable TimescaleDB extension
- Convert time-series tables to hypertables
- Create composite indexes for performance

### 2. Verify Database Setup
```powershell
# Connect to database (adjust PostgreSQL version if needed)
cd "C:\Program Files\PostgreSQL\18\bin"
.\psql.exe -U postgres -d ergodrive

# Check tables
\dt

# Check hypertables
SELECT * FROM timescaledb_information.hypertables;

# Exit psql
\q
```

Expected tables:
- `users`
- `sessions`
- `eeg_data` (hypertable)
- `face_detection_events` (hypertable)
- `game_events` (hypertable)
- `alerts` (hypertable)

---

## Run Backend Server

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Run FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: http://localhost:8000

API Documentation: http://localhost:8000/docs

---

## Install Redis (Optional - for Week 2 Wednesday)

### Using Memurai (Redis for Windows)
```powershell
# Download Memurai from: https://www.memurai.com/get-memurai
# Install and start service

# Or use Docker:
docker run -d -p 6379:6379 redis:7.2-alpine
```

---

## Troubleshooting

### pgAdmin4 ModuleNotFoundError
```
ModuleNotFoundError: No module named 'pgadmin'
```

**Solution:**
This is a pgAdmin4 GUI issue, NOT a PostgreSQL server issue. Your PostgreSQL is likely working fine.

**Option 1: Use psql instead (Recommended for this project)**
```powershell
# Navigate to PostgreSQL bin
cd "C:\Program Files\PostgreSQL\18\bin"

# Connect using command line
.\psql.exe -U postgres

# Enter your password when prompted
```

**Option 2: Fix pgAdmin4**
1. Download standalone pgAdmin4: https://www.pgadmin.org/download/pgadmin-4-windows/
2. Install as standalone application
3. Or reinstall PostgreSQL with all components selected

**Option 3: Use Alternative GUI**
- DBeaver: https://dbeaver.io/download/
- DataGrip: https://www.jetbrains.com/datagrip/
- VS Code with PostgreSQL extension

### PostgreSQL Connection Error
```
psycopg2.OperationalError: could not connect to server
```

**Solution:**
1. Check PostgreSQL service is running:
   - Open Services (Win+R → `services.msc`)
   - Find `postgresql-x64-15` service
   - Start if stopped

2. Verify connection string in `.env` matches your setup

### TimescaleDB Extension Not Found
```
ERROR: extension "timescaledb" does not exist
```

**Solution:**
1. Install TimescaleDB extension (see Prerequisites)
2. Restart PostgreSQL service
3. Run: `CREATE EXTENSION timescaledb;` in psql

### Python Module Not Found
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Reinstall requirements
pip install -r requirements.txt
```

---

## Next Steps

After successful setup:

1. ✅ PostgreSQL + TimescaleDB installed and configured
2. ✅ Database tables created as hypertables
3. ✅ FastAPI server running

**Week 2 Tuesday Tasks:**
- Implement API authentication routes (`/api/auth/register`, `/api/auth/login`)
- Create session management endpoints
- Setup WebSocket handler for real-time EEG streaming
- Create database query utilities

**Directory Structure:**
```
backend/
├── main.py                    # FastAPI app entry point
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables
├── app/
│   ├── __init__.py
│   ├── core/
│   │   └── config.py         # Settings
│   ├── db/
│   │   ├── database.py       # SQLAlchemy setup
│   │   ├── models.py         # ORM models
│   │   ├── init_db.py        # Database initialization
│   │   └── init_timescaledb.py  # TimescaleDB setup
│   ├── api/                  # API routes (create Tuesday)
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── sessions.py
│   │       └── websocket.py
│   └── schemas/              # Pydantic schemas (create Tuesday)
│       └── user.py
└── venv/                     # Virtual environment
```
