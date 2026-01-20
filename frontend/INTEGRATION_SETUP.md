# Frontend Integration - Setup Guide

## ✅ Files Created

The following utilities have been created to support backend API integration:

### 1. Configuration
- **`src/config/api.ts`** - API endpoints configuration

### 2. Authentication Utilities  
- **`src/utils/auth.ts`** - Token management (localStorage)
- **`src/api/client.ts`** - API client with auto-refresh
- **`src/api/auth.ts`** - Auth service (register, login, logout)

### 3. Environment
- **`.env.example`** - Environment variables template

---

## 🚀 Quick Start

### 1. Setup Environment Variables
```bash
cp .env.example .env.local
```

`.env.local` will contain:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### 2. Import and Use in Components

**Register Example:**
```typescript
import { authService } from '@/api/auth';

const handleRegister = async () => {
  try {
    const user = await authService.register({
      email: 'user@example.com',
      password: 'SecurePass123',
      full_name: 'John Doe',
      role: 'student'
    });
    console.log('Registered:', user);
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

**Login Example:**
```typescript
import { authService } from '@/api/auth';
import { useNavigate } from 'react-router-dom';

const handleLogin = async () => {
  try {
    await authService.login({
      email: 'user@example.com',
      password: 'SecurePass123'
    });
    // Tokens automatically saved to localStorage
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

**Protected API Call:**
```typescript
import { apiClient } from '@/api/client';
import { SESSION_ENDPOINTS } from '@/config/api';

const fetchSessions = async () => {
  try {
    // Automatically adds Authorization header
    // Auto-refreshes token if expired
    const sessions = await apiClient.get(SESSION_ENDPOINTS.LIST);
    console.log('Sessions:', sessions);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
  }
};
```

**Logout:**
```typescript
import { authService } from '@/api/auth';

const handleLogout = async () => {
  await authService.logout();
  window.location.href = '/login'; // Redirect to login
};
```

---

## 🛡️ Protected Routes

**Example with React Router:**
```typescript
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/utils/auth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Usage in routes
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## 📋 Checklist yang Sudah Selesai

✅ Save backend URL configuration  
✅ Token storage (localStorage) utilities  
✅ API client with auto-refresh  
✅ Auth service (register, login, logout, refresh)  
✅ Environment variables setup  

---

## 📝 Next Steps (Frontend Developer)

1. **Create UI Components**:
   - Login form
   - Register form
   - Protected route wrapper

2. **Implement State Management** (optional):
   - User state in Zustand/Context
   - Auth status tracking

3. **Test Integration**:
   - Test registration flow
   - Test login → protected route
   - Test token refresh  
   - Test logout

---

## 🆘 Need Help?

Refer to:
- `backend/FRONTEND_INTEGRATION.md` - Complete integration guide
- `backend/TROUBLESHOOTING.md` - Common issues & solutions

Backend team is ready to support! 🚀
