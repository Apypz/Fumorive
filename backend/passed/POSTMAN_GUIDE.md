# Postman Testing Guide

**Complete guide for testing ERGODRIVE API with Postman**

---

## 📦 Setup

### 1. Import Collection

1. Open Postman
2. Click "Import" button (top left)
3. Select `ergodrive.postman_collection.json`
4. Collection "ERGODRIVE API" akan muncul di sidebar

### 2. Configure Variables

Collection sudah include variables:
- `base_url`: `http://localhost:8000`
- `access_token`: Auto-filled after login
- `refresh_token`: Auto-filled after login

**Untuk development lokal**, tidak perlu ubah apapun!

---

## 🧪 Testing Flow

### **Scenario 1: Complete Authentication Flow**

**Step 1: Register New User**
1. Expand folder "Authentication"
2. Click "Register"
3. Click "Send"
4. ✅ Expected: `201 Created` with user data

**Step 2: Login**
1. Click "Login (JSON)"
2. Click "Send"
3. ✅ Expected: `200 OK` with tokens
4. ✅ Variables `access_token` dan `refresh_token` otomatis tersimpan!

**Step 3: Test Protected Endpoint**
1. Go to "Sessions" → "List Sessions"
2. Click "Send"
3. ✅ Expected: `200 OK` with session list (kosong jika belum ada)

**Step 4: Refresh Token**
1. Go to "Authentication" → "Refresh Token"
2. Click "Send"
3. ✅ Expected: New tokens, variables auto-updated

**Step 5: Logout**
1. Go to "Authentication" → "Logout"
2. Click "Send"
3. ✅ Expected: `200 OK` with logout message

**Step 6: Try Protected Endpoint Again**
1. Go to "Sessions" → "List Sessions"
2. Click "Send"
3. ✅ Expected: `401 Unauthorized` (token blacklisted)

---

### **Scenario 2: Session Management**

**Prerequisites**: Login first (Scenario 1, Step 2)

**Create Session**
1. Go to "Sessions" → "Create Session"
2. Modify body if needed:
   ```json
   {
     "session_name": "My Test Drive",
     "device_type": "Muse 2",
     "settings": {"difficulty": "easy"}
   }
   ```
3. Click "Send"
4. ✅ Expected: `201 Created` with session data
5. **Copy the `id` from response!**

**Get Session Details**
1. Go to "Sessions" → "Get Session"
2. Replace `<session_id>` in URL with actual ID
3. Click "Send"
4. ✅ Expected: `200 OK` with session details

**Update Session**
1. Go to "Sessions" → "Update Session"
2. Replace `<session_id>` in URL
3. Modify body:
   ```json
   {"session_name": "Updated Name"}
   ```
4. Click "Send"
5. ✅ Expected: `200 OK` with updated session

**Complete Session**
1. Go to "Sessions" → "Complete Session"
2. Replace `<session_id>` in URL
3. Click "Send"
4. ✅ Expected: `200 OK`, session status changed to "completed"

**Delete Session**
1. Go to "Sessions" → "Delete Session"
2. Replace `<session_id>` in URL
3. Click "Send"
4. ✅ Expected: `200 OK`, session deleted

---

## 🎯 Test Scripts

Collection sudah include **automatic test scripts**:

### Register Endpoint
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has user data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
});
```

### Login Endpoint
```javascript
// Auto-save tokens to variables
var jsonData = pm.response.json();
pm.collectionVariables.set("access_token", jsonData.access_token);
pm.collectionVariables.set("refresh_token", jsonData.refresh_token);
```

**Lihat hasil test** di tab "Test Results" setelah send request!

---

## 🔧 Advanced Tips

### Custom Environment Variables

Create environment untuk different scenarios:

**1. Create Environment**
- Click gear icon (top right)
- Click "Add"
- Name: "Development"

**2. Add Variables**
```
base_url: http://localhost:8000
test_email: your@email.com
test_password: YourPassword123
```

**3. Use in Request Body**
```json
{
  "email": "{{test_email}}",
  "password": "{{test_password}}"
}
```

### Bulk Testing

**Run Collection**:
1. Click "..." di collection name
2. Click "Run collection"
3. Select requests yang mau ditest
4. Click "Run ERGODRIVE API"
5. Lihat summary semua tests!

---

## 📊 Headers to Check

Setiap response akan include custom headers:

```
X-Request-ID: abc12345        ← Unique request ID
X-Process-Time: 0.042         ← Processing time (seconds)
```

**Gunakan untuk debugging!**

---

## ❌ Troubleshooting

### Error: 401 Unauthorized
**Cause**: Token expired atau tidak valid
**Fix**: 
1. Login lagi untuk dapat token baru
2. Check variable `access_token` sudah terisi

### Error: 422 Validation Error
**Cause**: Request body tidak sesuai schema
**Fix**: Check request body format, pastikan semua required fields ada

### Error: 500 Internal Server Error
**Cause**: Backend error
**Fix**: 
1. Check backend logs di terminal
2. Pastikan database & Redis running

---

## 🚀 Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/health` | GET | ❌ | Health check |
| `/api/v1/auth/register` | POST | ❌ | Register user |
| `/api/v1/auth/login/json` | POST | ❌ | Login |
| `/api/v1/auth/refresh` | POST | ❌ | Refresh token |
| `/api/v1/auth/logout` | POST | ✅ | Logout |
| `/api/v1/sessions` | GET | ✅ | List sessions |
| `/api/v1/sessions` | POST | ✅ | Create session |
| `/api/v1/sessions/{id}` | GET | ✅ | Get session |
| `/api/v1/sessions/{id}` | PATCH | ✅ | Update session |
| `/api/v1/sessions/{id}/complete` | POST | ✅ | Complete session |
| `/api/v1/sessions/{id}` | DELETE | ✅ | Delete session |

---

**Happy Testing! 🎉**

For more details, see `API_GUIDE.md` or Swagger UI at http://localhost:8000/api/docs
