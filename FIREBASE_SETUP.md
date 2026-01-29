# Firebase Google OAuth Setup Guide

This guide will walk you through setting up Firebase Authentication for Google Sign-In in Fumorive.

## Prerequisites

- Google account
- Firebase project (will create in this guide)
- PostgreSQL database running

---

## Part 1: Firebase Console Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: **Fumorive** (or your preferred name)
4. (Optional) Disable Google Analytics if not needed
5. Click "Create project"

### 1.2 Enable Google Authentication

1. In Firebase Console, navigate to:
   **Authentication** → **Sign-in method** tab
2. Click on **Google** provider
3. Toggle "Enable"
4. Set **Project support email** (your email)
5. Click "Save"

### 1.3 Add Web App

1. Navigate to **Project Settings** (gear icon) → **General** tab
2. Scroll to "Your apps" section
3. Click the **Web** icon (`</>`)
4. Register app:
   - **App nickname**: `Fumorive Web`
   - ✅ Check "Also set up Firebase Hosting" (optional)  
   - Click "Register app"
5. **Copy the Firebase config object** - you'll need this!

```javascript
// It will look like this:
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fumorive-xxxxx.firebaseapp.com",
  projectId: "fumorive-xxxxx",
  storageBucket: "fumorive-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890"
};
```

### 1.4 Get Service Account Key (for Backend)

1. Navigate to **Project Settings** → **Service accounts** tab
2. Click **"Generate new private key"** button
3. Confirm by clicking **"Generate key"**
4. A JSON file will download automatically
5. **Important**: Rename this file to `firebase-service-account.json`
6. Move it to: `backend/firebase-service-account.json`

> **⚠️ Security Warning**: Never commit this file to Git! It contains sensitive credentials.

### 1.5 Configure Authorized Domains

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. `localhost` should already be there
3. Add your production domain when deploying (e.g., `fumorive.com`)

---

## Part 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd backend
pip install firebase-admin
```

### 2.2 Place Service Account File

Ensure `firebase-service-account.json` is in the `backend/` directory:

```
backend/
├── app/
├── firebase-service-account.json  ← HERE
├── main.py
└── requirements.txt
```

### 2.3 Update .gitignore

Add to `backend/.gitignore`:

```
firebase-service-account.json
*.json  # If not already there
```

### 2.4 Run Database Migration

```bash
# Using psql
psql -U postgres -d fumorive -f migrations/001_add_oauth_to_users.sql

# OR using Python
cd backend
python -c "from app.db.database import engine; from pathlib import Path; engine.execute(open('migrations/001_add_oauth_to_users.sql').read())"
```

Verify migration:
```sql
-- Connect to database
psql -U postgres -d fumorive

-- Check new columns exist
\d users

-- You should see: oauth_provider, google_id, profile_picture
```

### 2.5 Start Backend

```bash
cd backend
python main.py
```

Check logs for:
```
✅ Firebase Admin SDK initialized successfully
```

If you see a warning about missing service account, double-check the file path.

---

## Part 3: Frontend Setup

### 3.1 Install Firebase SDK

```bash
cd frontend
npm install firebase
```

### 3.2 Configure Environment Variables

1. Copy the example file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your Firebase config values:

```bash
# Use the values from Step 1.3
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=fumorive-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fumorive-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=fumorive-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

### 3.3 Start Frontend

```bash
npm run dev
```

---

## Part 4: Testing

### 4.1 Test Google OAuth Flow

1. Open browser: `http://localhost:5173`
2. Navigate to login page
3. Click **"Sign in with Google"** button
4. Google popup should appear
5. Select your Google account
6. Grant permissions
7. You should be redirected to dashboard

### 4.2 Verify in Database

```sql
SELECT id, email, full_name, oauth_provider, google_id 
FROM users 
WHERE oauth_provider = 'google';
```

You should see your Google account!

### 4.3 Test Traditional Login Still Works

1. Create account with email/password
2. Logout
3. Login with email/password
4. Should work normally ✅

---

## Troubleshooting

### Error: "Firebase not initialized"

**Cause**: Service account file missing or wrong path

**Fix**:
```bash
# Check file exists
ls backend/firebase-service-account.json

# Check backend logs for Firebase initialization
```

### Error: "CORS error when calling /auth/google"

**Cause**: Frontend origin not in CORS_ORIGINS

**Fix**: Add to `backend/app/core/config.py`:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",  # ← Make sure this matches your frontend
    ...
]
```

### Error: "Popup blocked"

**Cause**: Browser blocking popups

**Fix**: Allow popups for localhost in browser settings

### Error: "Email not verified"

**Cause**: Google account email not verified

**Fix**: Verify email in Google account settings, or remove the check in backend:
```python
# In auth.py, comment out:
# if not email_verified:
#     raise HTTPException(...)
```

### Firebase token errors

**Cause**: Clock skew or expired token

**Fix**: 
1. Check system time is correct
2. Try signing in again
3. Clear browser cache

---

## Next Steps

### Production Deployment

1. **Update Authorized Domains** in Firebase Console
2. **Use environment variables** for service account (don't deploy the JSON file)
3. **Enable HTTPS** for OAuth redirect URLs
4. Consider **Firebase Security Rules**

### Optional Enhancements

- Add GitHub OAuth
- Add Microsoft OAuth
- Add account linking UI (merge OAuth + password accounts)
- Add profile picture display in UI
- Sync Google profile updates periodically

---

## FAQ

**Q: Can users sign up with email AND Google?**  
A: Yes! If they sign up with email first, then sign in with Google (same email), the accounts will be linked automatically.

**Q: What happens to existing users?**  
A: No impact. Existing email/password users continue working normally. They can optionally link Google later.

**Q: Do I need to keep the service account JSON forever?**  
A: Yes, it's needed for backend to verify Firebase tokens. In production, use environment variable or secret manager instead of file.

**Q: Can I remove Firebase later?**  
A: Yes, just remove the Google Sign-In button. Existing OAuth users won't be able to login, but email/password users are unaffected.

---

## Security Notes

✅ **DO**:
- Keep service account key secret
- Use HTTPS in production
- Validate tokens server-side
- Use environment variables for secrets

❌ **DON'T**:
- Commit service account JSON to Git
- Trust client-provided tokens without verification
- Hardcode secrets in source code
- Use HTTP in production

---

## Support

If you encounter issues:
1. Check Firebase Console for errors
2. Check backend logs for Firebase initialization
3. Check browser console for frontend errors
4. Verify database migration succeeded

Good luck! 🚀
