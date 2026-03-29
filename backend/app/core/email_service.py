"""
Email Service
Sends transactional emails using Resend API (HTTPS — no SMTP ports needed).
Docs: https://resend.com/docs
"""

import os
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger("fumorive")

RESEND_API_URL = "https://api.resend.com/emails"


def _get_resend_key() -> str:
    # Read directly from os.environ to avoid pydantic-settings caching issues
    return os.environ.get("RESEND_API_KEY", "") or settings.RESEND_API_KEY


def _is_resend_configured() -> bool:
    return bool(_get_resend_key())


def send_password_reset_email(to_email: str, code: str) -> bool:
    """
    Send a 6-digit OTP reset code to the user's email via Resend API.
    Returns True on success, False on failure.
    """
    api_key = _get_resend_key()
    logger.info(f"[EMAIL] Checking RESEND config: key_present={bool(api_key)}, key_len={len(api_key)}")
    if not api_key:
        logger.warning("RESEND_API_KEY not configured — cannot send password reset email.")
        return False

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }}
        .card {{ background: white; max-width: 480px; margin: 0 auto; border-radius: 16px;
                 padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .logo {{ font-size: 1.5rem; font-weight: 800; color: #4f46e5; margin-bottom: 8px; }}
        h2 {{ color: #1e293b; margin: 0 0 8px; }}
        p {{ color: #64748b; line-height: 1.6; }}
        .code-box {{ background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px;
                     text-align: center; padding: 24px; margin: 28px 0; }}
        .code {{ font-size: 2.5rem; font-weight: 900; letter-spacing: 0.3em;
                 color: #4f46e5; font-family: monospace; }}
        .note {{ font-size: 0.8rem; color: #94a3b8; margin-top: 8px; }}
        .footer {{ color: #94a3b8; font-size: 0.78rem; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">&#129504; Fumorive</div>
        <h2>Reset Password</h2>
        <p>Kami menerima permintaan reset password untuk akun yang terhubung dengan email ini.</p>
        <div class="code-box">
          <p style="margin:0 0 8px;color:#475569;font-weight:600;">Kode Verifikasi</p>
          <div class="code">{code}</div>
          <p class="note">&#9201; Berlaku selama <strong>15 menit</strong></p>
        </div>
        <p>Masukkan kode di atas pada halaman reset password Fumorive.</p>
        <p>Jika kamu tidak meminta reset password, abaikan email ini &mdash; akunmu aman.</p>
        <div class="footer">
          Email ini dikirim otomatis oleh sistem Fumorive. Jangan balas email ini.
        </div>
      </div>
    </body>
    </html>
    """

    try:
        logger.info(f"[EMAIL] Sending reset email to {to_email} via Resend...")
        email_from_name = os.environ.get("EMAIL_FROM_NAME", "") or settings.EMAIL_FROM_NAME
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{email_from_name} <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": "Kode Reset Password Fumorive",
                    "html": html_body,
                },
            )

        if resp.status_code in (200, 201):
            logger.info(f"Password reset email sent to {to_email} via Resend")
            return True
        else:
            logger.error(f"Resend API error {resp.status_code}: {resp.text}")
            return False

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
