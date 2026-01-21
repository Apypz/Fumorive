# 🧪 Redis Testing Quick Guide

**Quick steps to test Redis session caching**

---

## Prerequisites

✅ PostgreSQL database running (from Week 2 Monday)  
✅ Redis server running (new for Week 2 Wednesday)

---

## Step 1: Start Redis

### Option A: Docker (Recommended)
```bash
docker run -d --name fumorive-redis -p 6379:6379 redis:7.2-alpine
```

### Option B: If already created, just start it
```bash
docker start fumorive-redis
```

### Verify Redis is running
```bash
docker ps | findstr redis
# Should show container with status "Up"
```

---

## Step 2: Start Database (if not running)
```bash
docker start fumorive-db
```

---

## Step 3: Start FastAPI Backend
```bash
cd C:\Users\User\Fumorive\backend
.\venv\Scripts\activate
python main.py
```

**Look for this in output:**
```
🔧 Initializing Redis...
✅ Redis connected: redis://localhost:6379/0
```

✅ If you see this → Redis is working!

---

## Step 4: Test Health Endpoint

**Open browser or use curl:**
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "ergodrive-backend",
  "redis": {
    "status": "connected",     ← Check this!
    "redis_version": "7.2.4"
  },
  "cache": {
    "status": "available",     ← And this!
    "cached_users": 0,
    "blacklisted_tokens": 0
  }
}
```

---

## Step 5: Test Complete Login Flow

### 5a. Register a new user
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"redis@test.com\",\"password\":\"Test1234\",\"full_name\":\"Redis Test\",\"role\":\"student\"}"
```

### 5b. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/json \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"redis@test.com\",\"password\":\"Test1234\"}"
```

**Copy the `access_token` from the response!**

Example:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**→ Copy the long string after `"access_token":"`**

---

## Step 6: Test Protected Endpoint (Should Work)

```bash
curl http://localhost:8000/api/v1/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token from Step 5b.

**Expected**: Returns empty sessions list:
```json
{
  "total": 0,
  "sessions": [],
  "page": 1,
  "page_size": 20
}
```

✅ If you get this → Authentication is working!

---

## Step 7: Check Redis Cache

**Open Redis CLI:**
```bash
docker exec -it fumorive-redis redis-cli
```

**In Redis CLI, check cached user:**
```redis
127.0.0.1:6379> KEYS user:*
1) "user:abc-123-def-456..."  ← Your user ID

127.0.0.1:6379> GET user:abc-123...
{"id":"abc-123...","email":"redis@test.com",...}  ← User cached!

127.0.0.1:6379> TTL user:abc-123...
(integer) 1795  ← ~30 minutes remaining

127.0.0.1:6379> exit
```

✅ If you see user data → Caching is working!

---

## Step 8: Test Logout (Token Blacklist)

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected**:
```json
{
  "message": "Successfully logged out",
  "detail": "Token has been revoked and cache cleared"
}
```

---

## Step 9: Try Protected Endpoint Again (Should FAIL!)

```bash
curl http://localhost:8000/api/v1/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected** (should get error):
```json
{
  "detail": "Token has been revoked"
}
```

✅ If you get this error → Token blacklist is working!

---

## Step 10: Check Blacklist in Redis

```bash
docker exec -it fumorive-redis redis-cli
```

**In Redis CLI:**
```redis
127.0.0.1:6379> KEYS blacklist:*
1) "blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

127.0.0.1:6379> GET "blacklist:eyJ..."
"1"  ← Token is blacklisted!

127.0.0.1:6379> TTL "blacklist:eyJ..."
(integer) 1785  ← Will expire with token

127.0.0.1:6379> exit
```

---

## ✅ All Tests Passed!

If all steps worked, you have successfully:

1. ✅ Redis connection established
2. ✅ User session caching working
3. ✅ Token blacklist working
4. ✅ Logout properly revokes tokens

---

## Troubleshooting

### "Redis connection failed"
```
⚠️  Redis connection failed: Connection refused
```

**Fix**: Start Redis
```bash
docker start fumorive-redis
# or
docker run -d -p 6379:6379 redis:7.2-alpine
```

---

### "Could not connect to database"
```
sqlalchemy.exc.OperationalError
```

**Fix**: Start PostgreSQL
```bash
docker start fumorive-db
```

---

### Token still works after logout
**Issue**: Redis not connected, blacklist check skipped

**Fix**: 
1. Check Redis: `docker ps | findstr redis`
2. Restart FastAPI server
3. Look for "✅ Redis connected" in startup logs

---

## Summary Commands

**Daily startup:**
```bash
# 1. Start Redis
docker start fumorive-redis

# 2. Start PostgreSQL
docker start fumorive-db

# 3. Start FastAPI
cd C:\Users\User\Fumorive\backend
.\venv\Scripts\activate
python main.py
```

**Quick health check:**
```bash
curl http://localhost:8000/health
```

---

**For detailed documentation, see: `WEEK2_WEDNESDAY_COMPLETE.md`**
