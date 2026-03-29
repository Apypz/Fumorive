"""
Email Service
Sends transactional emails using Gmail SMTP (smtplib - no extra deps).
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("fumorive")


def _is_smtp_configured() -> bool:
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_password_reset_email(to_email: str, code: str) -> bool:
    """
    Send a 6-digit OTP reset code to the user's email.
    Returns True on success, False on failure.
    """
    if not _is_smtp_configured():
        logger.warning("SMTP not configured — cannot send password reset email.")
        return False

    subject = "Kode Reset Password Fumorive"

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
        <div class="logo">🧠 Fumorive</div>
        <h2>Reset Password</h2>
        <p>Kami menerima permintaan reset password untuk akun yang terhubung dengan email ini.</p>
        <div class="code-box">
          <p style="margin:0 0 8px;color:#475569;font-weight:600;">Kode Verifikasi</p>
          <div class="code">{code}</div>
          <p class="note">⏱ Berlaku selama <strong>15 menit</strong></p>
        </div>
        <p>Masukkan kode di atas pada halaman reset password Fumorive.</p>
        <p>Jika kamu tidak meminta reset password, abaikan email ini — akunmu aman.</p>
        <div class="footer">
          Email ini dikirim otomatis oleh sistem Fumorive. Jangan balas email ini.
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as srv:
            srv.ehlo()
            srv.starttls()
            srv.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            srv.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"Password reset email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
