# Integration Troubleshooting Guide

**Common issues saat integrate frontend dengan backend**

---

## 🔴 CORS Errors

### Error:
```
Access to fetch at 'http://localhost:8000/api/v1/auth/login' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

### Solution:
1. **Check frontend port di CORS config**
   - Backend saat ini allow: `localhost:5173`, `localhost:3000`
   - Jika pakai port lain, update `.env`:
     ```
     CORS_ORIGINS=["http://localhost:5173","http://localhost:YOUR_PORT"]
     ```
   - Restart backend

2. **Check request headers**
   - Pastikan `Content-Type: application/json`
   - Jangan tambahkan custom headers yang tidak perlu

---

## 🔴 401 Unauthorized

### Error:
```json
{"detail": "Could not validate credentials"}
```

### Possible Causes:

**1. Token tidak dikirim**
```javascript
// ❌ Wrong
fetch('http://localhost:8000/api/v1/sessions')

// ✅ Correct
fetch('http://localhost:8000/api/v1/sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**2. Token expired**
- Access token valid 30 menit
- Use refresh token untuk dapat token baru

**3. Token format salah**
- Harus: `Bearer <token>`
- Bukan: `<token>` atau `bearer <token>`

---

## 🔴 422 Validation Error

### Error:
```json
{
  "detail": [
    {"loc": ["body", "password"], "msg": "ensure this value has at least 8 characters"}
  ]
}
```

### Solution:
Check request body format:

```javascript
// Register requirements
{
  email: "valid@email.com",     // Must be valid email
  password: "Min8Chars",         // Minimum 8 characters
  full_name: "John Doe",         // Required
  role: "student"                // Must be: student/researcher/admin
}
```

---

## 🔴 Network Error / Connection Refused

### Error:
```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```

### Checklist:
1. **Backend running?**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Database running?**
   ```bash
   docker ps | findstr fumorive-db
   ```

3. **Redis running?**
   - Check health endpoint: includes Redis status

4. **Correct URL?**
   - Development: `http://localhost:8000`
   - NOT: `http://localhost:8000/` (trailing slash bisa cause issues)

---

## 🔴 Token Revoked After Logout

### Error:
```json
{"detail": "Token has been revoked"}
```

### This is CORRECT behavior!

- After logout, token masuk blacklist
- User harus login ulang
- Clear localStorage setelah logout:
  ```javascript
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  ```

---

## 🔴 Refresh Token Failed

### Error:
```json
{"detail": "Invalid refresh token"}
```

### Possible Causes:
1. Refresh token expired (7 hari)
2. Refresh token sudah digunakan (rotation)
3. Token format salah

### Solution:
- Redirect user ke login page
- Clear all tokens

---

## 🔴 Registration Failed

### Common Issues:

**Email already exists**:
```json
{"detail": "Email already registered"}
```
→ User sudah register, arahkan ke login

**Weak password**:
- Minimum 8 characters
- Tidak ada requirement special char (saat ini)

---

## 🧪 Debug Checklist

### 1. Check Backend Logs
Terminal yang running `python main.py` akan show:
```
[abc12345] POST /api/v1/auth/login - Status: 200 - Time: 0.042s
```

### 2. Check Browser Console
- Look for JavaScript errors
- Check network tab untuk request/response

### 3. Check Network Tab
- Request URL correct?
- Request headers include Authorization?
- Response status code?
- Response body error message?

### 4. Test with Swagger UI
- Go to: `http://localhost:8000/api/docs`
- Test endpoint directly
- If works di Swagger tapi tidak di frontend → likely frontend issue

---

## 📞 Contact Backend Team

**Include these details**:
1. ❌ Error message (exact text)
2. 📸 Screenshot of console error
3. 🌐 Network tab screenshot (request/response)
4. 💻 Code snippet yang cause error
5. 🎯 Expected vs Actual behavior

---

## ✅ Quick Health Check

```javascript
// Test backend availability
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(data => console.log('Backend status:', data))
  .catch(err => console.error('Backend down:', err));

// Expected response:
// {
//   "status": "healthy",
//   "service": "ergodrive-backend",
//   "redis": { "status": "connected" }
// }
```

---

**Last Updated**: 20 Januari 2026
