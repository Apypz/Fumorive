"""
Firebase Admin SDK Integration
Token verification and user info extraction for OAuth
"""

import os
import logging
from typing import Optional, Dict, Any
from firebase_admin import credentials, auth, initialize_app
from firebase_admin.exceptions import FirebaseError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global Firebase app instance
_firebase_app = None


def init_firebase() -> None:
    """
    Initialize Firebase Admin SDK.

    Priority order:
      1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string) — used on Railway/cloud
      2. FIREBASE_SERVICE_ACCOUNT_PATH (local JSON file)     — used in local dev
    """
    global _firebase_app

    if _firebase_app is not None:
        logger.info("Firebase Admin SDK already initialized")
        return

    try:
        # Option 1: JSON content from environment variable (Railway / cloud deploy)
        sa_json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if sa_json_str:
            import json
            sa_dict = json.loads(sa_json_str)
            cred = credentials.Certificate(sa_dict)
            _firebase_app = initialize_app(cred)
            logger.info("[OK] Firebase initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var")
            return

        # Option 2: Local file path (local development fallback)
        service_account_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            _firebase_app = initialize_app(cred)
            logger.info(f"[OK] Firebase initialized from file: {service_account_path}")
            return

        logger.warning(
            "Firebase service account not configured. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON env var (Railway) or "
            f"place JSON file at '{service_account_path}' (local dev). "
            "OAuth authentication will not be available."
        )

    except Exception as e:
        logger.error(f"[ERR] Failed to initialize Firebase Admin SDK: {e}")
        logger.warning("OAuth authentication will not be available")


def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token and extract user information
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        Dict with user info if valid:
        {
            'uid': 'firebase-user-id',
            'email': 'user@example.com',
            'name': 'Full Name',
            'picture': 'https://...',
            'email_verified': True
        }
        None if token is invalid
    """
    if _firebase_app is None:
        logger.error("Firebase not initialized. Cannot verify token.")
        return None
    
    try:
        # Verify the token with Firebase
        # Add leeway (tolerance) for clock skew between client and server
        # This prevents "Token used too early" errors from minor time differences
        decoded_token = auth.verify_id_token(
            id_token,
            check_revoked=False,  # Don't check revocation for performance
            clock_skew_seconds=10  # Allow 10 seconds of clock difference
        )
        
        # Extract user information
        user_info = {
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture'),
            'email_verified': decoded_token.get('email_verified', False)
        }
        
        logger.info(f"[OK] Firebase token verified for user: {user_info['email']}")
        return user_info
        
    except auth.ExpiredIdTokenError as e:
        logger.warning(f"[WARN] Firebase token EXPIRED: {e}")
        return None
        
    except auth.RevokedIdTokenError as e:
        logger.warning(f"[WARN] Firebase token REVOKED: {e}")
        return None
        
    except auth.InvalidIdTokenError as e:
        logger.warning(f"[ERR] INVALID Firebase token: {e}")
        return None
        
    except FirebaseError as e:
        logger.error(f"Firebase error while verifying token: {e}")
        return None
        
    except Exception as e:
        logger.error(f"[ERR] Unexpected error verifying Firebase token: {type(e).__name__}: {e}")
        return None


def is_firebase_available() -> bool:
    """
    Check if Firebase Admin SDK is initialized and available
    
    Returns:
        True if Firebase is ready for use, False otherwise
    """
    return _firebase_app is not None
