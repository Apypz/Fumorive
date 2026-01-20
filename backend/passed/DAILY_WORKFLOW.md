# 📅 Daily Development Workflow

**Panduan step-by-step untuk development setiap hari**

---

## ⚠️ PENTING: Dua Komponen yang Harus Jalan

ERGODRIVE membutuhkan **DUA KOMPONEN** yang berjalan **BERSAMAAN**:

| Komponen | Fungsi | Port | Cara Start |
|----------|--------|------|------------|
| 🐳 **Docker (PostgreSQL)** | Database - menyimpan data | 5432 | `docker start fumorive-db` |
| 🐍 **Python (FastAPI)** | API Server - handle requests | 8000 | `python main.py` |

**KEDUANYA HARUS JALAN!** Tidak bisa pilih salah satu.

---

## 🚀 Workflow Harian (Copy-Paste Commands)

### 1️⃣ Start Docker Desktop
```
Buka aplikasi Docker Desktop (GUI)
Tunggu sampai ikon Docker di system tray hijau
```

### 2️⃣ Start PostgreSQL Database
```bash
docker start fumorive-db
```

**Verify database running:**
```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE              STATUS      NAMES
abc123...      timescale/...      Up X min    fumorive-db
```

✅ Jika ada `fumorive-db` dengan status `Up` → Database sudah jalan!

---

### 3️⃣ Start FastAPI Backend Server
```bash
# Masuk ke folder backend
cd C:\Users\User\Fumorive\backend

# Activate virtual environment
.\venv\Scripts\activate

# Start server
python main.py
```

**Expected output:**
```
============================================================
🚀 ERGODRIVE Backend API Starting...
📝 Environment: development
🌐 CORS Origins: ['http://localhost:5173', ...]
📚 Documentation: /api/docs
🔌 WebSocket: /api/v1/ws/session/{session_id}
============================================================
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ Jika muncul output seperti ini → Server sudah jalan!

---

### 4️⃣ Verify Semuanya Berfungsi

**Test 1: API Docs**
- Buka browser: http://localhost:8000/api/docs
- Harus muncul Swagger UI
- ✅ Sukses: API server jalan

**Test 2: Health Check**
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"healthy","service":"ergodrive-backend"}`

**Test 3: Database Connection**
```bash
docker exec fumorive-db psql -U postgres -d fumorive -c "\dt"
```
Expected: List of tables (users, sessions, eeg_data, dll)

✅ Semua test pass → System ready!

---

## 🛑 Selesai Development (Akhir Hari)

### Stop FastAPI Server
```
CTRL + C di terminal tempat python main.py jalan
```

### Stop Database (Optional)
```bash
# Optional - database bisa tetap jalan
docker stop fumorive-db

# Atau tutup Docker Desktop langsung
```

**Note**: Biasanya database dibiarkan jalan (tidak perlu di-stop).

---

## ❌ Troubleshooting - Error Umum

### Error 1: "Could not connect to database"
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Penyebab**: Docker database **TIDAK JALAN**

**Solusi**:
```bash
# 1. Cek Docker Desktop running
# 2. Start database
docker start fumorive-db

# 3. Verify
docker ps
```

---

### Error 2: "Connection refused localhost:8000"
```
Browser: This site can't be reached
```

**Penyebab**: FastAPI server **TIDAK JALAN**

**Solusi**:
```bash
cd C:\Users\User\Fumorive\backend
.\venv\Scripts\activate
python main.py
```

---

### Error 3: "Port 8000 already in use"
```
ERROR:    [Errno 10048] error while attempting to bind on address
```

**Penyebab**: Ada proses lain pakai port 8000

**Solusi**:
```bash
# Cari proses yang pakai port 8000 (Windows)
netstat -ano | findstr :8000

# Kill proses tersebut
taskkill /PID <PID_NUMBER> /F

# Atau ubah port di main.py:
# uvicorn.run(..., port=8001)
```

---

### Error 4: Database container tidak ada
```
Error response from daemon: No such container: fumorive-db
```

**Penyebab**: Container belum dibuat

**Solusi**: Lihat `SETUP.md` untuk setup database pertama kali

---

## 📊 Status Check Commands

### Cek Database Running
```bash
docker ps | findstr fumorive
```

### Cek FastAPI Running
```bash
# Windows
netstat -ano | findstr :8000

# Atau cek di browser
http://localhost:8000/health
```

### Cek Kedua Komponen Sekaligus
```bash
# Database
docker ps --filter name=fumorive-db --format "{{.Status}}"

# API (test endpoint)
curl http://localhost:8000/health
```

---

## 🎯 Quick Reference

### Minimal Commands (Development)
```bash
# Start database
docker start fumorive-db

# Start API server
cd C:\Users\User\Fumorive\backend
.\venv\Scripts\activate
python main.py

# ✅ Done! Open http://localhost:8000/api/docs
```

### Ports yang Digunakan
- **5432**: PostgreSQL Database (Docker)
- **8000**: FastAPI API Server (Python)
- **5173**: Frontend Vite (nanti, belum setup)

---

## 🔍 Diagram Alur

```
┌─────────────────────────────────────────────────────┐
│  YOU (Developer)                                    │
└─────────────────────────────────────────────────────┘
    │
    ├─── STEP 1: docker start fumorive-db
    │         ↓
    │    ┌─────────────────────────────┐
    │    │  Docker Container           │
    │    │  - PostgreSQL Database      │
    │    │  - Port: 5432               │
    │    │  - Data: users, sessions... │
    │    └─────────────────────────────┘
    │
    └─── STEP 2: python main.py
              ↓
         ┌─────────────────────────────┐
         │  FastAPI Server             │
         │  - API Routes               │
         │  - WebSocket                │
         │  - Port: 8000               │
         └─────────────────────────────┘
              ↓ (Connects to database)
         ┌─────────────────────────────┐
         │  PostgreSQL (from Docker)   │
         └─────────────────────────────┘
```

**KEDUANYA HARUS JALAN BERSAMAAN!**

---

## ✅ Checklist Harian

Setiap mulai development:
- [ ] Docker Desktop running (cek icon system tray)
- [ ] Database container running (`docker ps`)
- [ ] Virtual environment activated
- [ ] FastAPI server running (`python main.py`)
- [ ] API docs accessible (http://localhost:8000/api/docs)

✅ Semua checklist pass → Ready to code!

---

**Last Updated**: 15 Januari 2026  
**Untuk pertanyaan**: Cek SETUP.md atau QUICKSTART.md
