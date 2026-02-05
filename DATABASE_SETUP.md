# ERGODRIVE Database Setup Guide

**Setup TimescaleDB + Redis dengan data yang sama untuk development team**

---

## 📋 Prerequisites

- Docker Desktop installed
- Docker account (optional, bisa pakai local)
- Files yang dibagikan:
  - `backup_fumorive.sql` (database backup)
  - `redis_backup.rdb` (redis backup - optional)

---

## 🚀 Quick Setup (Copy-Paste Commands)

### Step 1: Create TimescaleDB Container

```bash
docker run -d \
  --name fumorive-db \
  -e POSTGRES_PASSWORD=12345 \
  -e POSTGRES_DB=fumorive \
  -p 5432:5432 \
  -v fumorive_db_data:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg16
```

**Wait 10 seconds** untuk database ready:
```bash
# Linux/Mac
sleep 10

# Windows PowerShell
Start-Sleep -Seconds 10

# Windows CMD
timeout /t 10
```

---

### Step 2: Create Redis Container

```bash
docker run -d \
  --name fumorive-redis \
  -p 6379:6379 \
  -v fumorive_redis_data:/data \
  redis:7.2-alpine
```

---

### Step 3: Restore Database

**Linux/Mac/Git Bash**:
```bash
cat backup_fumorive.sql | docker exec -i fumorive-db psql -U postgres -d fumorive
```

**Windows PowerShell**:
```powershell
Get-Content backup_fumorive.sql | docker exec -i fumorive-db psql -U postgres -d fumorive
```

**Windows CMD**:
```cmd
type backup_fumorive.sql | docker exec -i fumorive-db psql -U postgres -d fumorive
```

---

### Step 4: Restore Redis (Optional)

```bash
docker cp redis_backup.rdb fumorive-redis:/data/dump.rdb
docker restart fumorive-redis
```

---

### Step 5: Verify Setup

**Check containers running**:
```bash
docker ps
```

**Expected output**:
```
CONTAINER ID   IMAGE                               PORTS
xxxxxx         timescale/timescaledb:latest-pg16   0.0.0.0:5432->5432/tcp
xxxxxx         redis:7.2-alpine                    0.0.0.0:6379->6379/tcp
```

**Check database**:
```bash
docker exec -it fumorive-db psql -U postgres -d fumorive -c "SELECT COUNT(*) FROM users;"
```

**Expected**: `4` users

**Check Redis**:
```bash
docker exec -it fumorive-redis redis-cli PING
```

**Expected**: `PONG`

---

## 🔧 Backend Configuration

Update `.env` file di backend directory:

```env
DATABASE_URL=postgresql://postgres:12345@localhost:5432/fumorive
REDIS_URL=redis://localhost:6379
```

---

## 📦 Database Contents

After restore, database akan berisi:

**Tables**:
- `users` (4 users)
- `sessions` (2 sessions)
- `eeg_data` (time-series data)
- `face_detection_events` (78 events)
- `game_events`
- `alerts`

**Users (for testing)**:
- Email: `test123@gmail.com` / Password: `12345678`
- (check lainnya di database)

---

## 🛠️ Troubleshooting

### Container name conflict
```bash
# Remove old container
docker rm fumorive-db
docker rm fumorive-redis

# Run create commands again
```

### Port already in use
```bash
# Stop existing PostgreSQL/Redis
# Or change port mapping:
# -p 5433:5432  (for PostgreSQL)
# -p 6380:6379  (for Redis)
```

### Database restore fails
```bash
# Make sure container is running
docker ps | grep fumorive-db

# Check logs
docker logs fumorive-db
```

---

## 🗑️ Cleanup (Jika Perlu Ulang)

```bash
# Stop containers
docker stop fumorive-db fumorive-redis

# Remove containers
docker rm fumorive-db fumorive-redis

# Remove volumes (WARNING: deletes all data!)
docker volume rm fumorive_db_data fumorive_redis_data
```

---

## 📝 Alternative: Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  fumorive-db:
    image: timescale/timescaledb:latest-pg16
    container_name: fumorive-db
    environment:
      POSTGRES_PASSWORD: 12345
      POSTGRES_DB: fumorive
    ports:
      - "5432:5432"
    volumes:
      - fumorive_db_data:/var/lib/postgresql/data
    restart: unless-stopped

  fumorive-redis:
    image: redis:7.2-alpine
    container_name: fumorive-redis
    ports:
      - "6379:6379"
    volumes:
      - fumorive_redis_data:/data
    restart: unless-stopped

volumes:
  fumorive_db_data:
  fumorive_redis_data:
```

**Run**:
```bash
docker-compose up -d
```

**Restore** (setelah containers running):
```bash
cat backup_fumorive.sql | docker exec -i fumorive-db psql -U postgres -d fumorive
```

---

## ✅ Success Checklist

- [ ] TimescaleDB container running
- [ ] Redis container running
- [ ] Database restored (4 users confirmed)
- [ ] Redis working (PING returns PONG)
- [ ] Backend `.env` configured
- [ ] Backend can connect to database

---

## 🆘 Need Help?

Contact backend team atau check:
- `TROUBLESHOOTING.md` (jika ada)
- Docker logs: `docker logs fumorive-db`
- Backend logs saat startup

---

**Created**: 22 Januari 2026  
**Version**: 1.0  
**Last Updated**: Initial setup guide
