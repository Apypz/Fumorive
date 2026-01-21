# Frontend Integration Guide - Authentication

**Quick reference for integrating with ERGODRIVE Backend Auth API**

---

## 🔗 Backend URL

```
Development: http://localhost:8000
API Base: http://localhost:8000/api/v1
```

---

## 🔐 Authentication Endpoints

### 1. Register User

**Endpoint**: `POST /api/v1/auth/register`

**Request**:
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "user@example.com",
    password: "SecurePass123",
    full_name: "John Doe",
    role: "student"  // or "researcher", "admin"
  })
});

const user = await response.json();
// Returns: { id, email, full_name, role, is_active, created_at }
```

**Success (201)**:
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "student",
  "is_active": true,
  "created_at": "2026-01-20T14:00:00Z"
}
```

---

### 2. Login

**Endpoint**: `POST /api/v1/auth/login/json`

**Request**:
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/login/json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "user@example.com",
    password: "SecurePass123"
  })
});

const tokens = await response.json();
// Save tokens to localStorage
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);
```

**Success (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 3. Access Protected Endpoints

**Example**: `GET /api/v1/sessions`

**Request**:
```javascript
const token = localStorage.getItem('access_token');

const response = await fetch('http://localhost:8000/api/v1/sessions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const sessions = await response.json();
```

---

### 4. Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**When to use**: When `access_token` expires (401 error)

**Request**:
```javascript
const refreshToken = localStorage.getItem('refresh_token');

const response = await fetch('http://localhost:8000/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

const tokens = await response.json();
// Update tokens
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);
```

---

### 5. Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Request**:
```javascript
const token = localStorage.getItem('access_token');

await fetch('http://localhost:8000/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Clear local storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

---

## 🛡️ Token Management Pattern

```javascript
// utils/auth.js
export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => !!getAccessToken();

// Auto refresh on 401
export const fetchWithAuth = async (url, options = {}) => {
  let token = getAccessToken();
  
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  // If 401, try refresh
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    const refreshResponse = await fetch('http://localhost:8000/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (refreshResponse.ok) {
      const tokens = await refreshResponse.json();
      setTokens(tokens.access_token, tokens.refresh_token);
      
      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
    } else {
      // Refresh failed, redirect to login
      clearTokens();
      window.location.href = '/login';
    }
  }
  
  return response;
};
```

---

## ❌ Error Handling

### Common Errors:

**422 Validation Error**:
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

**401 Unauthorized**:
```json
{
  "detail": "Could not validate credentials"
}
```

**Token Blacklisted (after logout)**:
```json
{
  "detail": "Token has been revoked"
}
```

---

## 🔧 CORS Configuration

Backend sudah configured untuk:
```
http://localhost:5173  (Vite default)
http://localhost:3000  (React/Next.js)
http://127.0.0.1:5173
```

Jika frontend pakai port lain, beri tahu backend team!

---

## 🧪 Testing Checklist

- [ ] Register new user → Success
- [ ] Login with credentials → Get tokens
- [ ] Access protected endpoint → Success
- [ ] Logout → Token blacklisted
- [ ] Try protected endpoint with old token → 401 Error
- [ ] Refresh token → New tokens received

---

## 📞 Support

**Jika ada issue**:
1. Check browser console untuk error
2. Check network tab untuk response
3. Verify backend running: `http://localhost:8000/health`
4. Contact backend team dengan error details

---

**Backend Status**: ✅ Ready for Integration!
