"""
DevFlow — email_client.py
Envío de emails best-effort vía SMTP (smtplib, stdlib — sin dependencias).

Sigue el mismo patrón que github_client: si no está configurado (falta
SMTP_HOST) es un no-op silencioso, y cualquier error se loguea sin romper
el flujo que lo llamó. La config se lee en cada llamada para no congelar
valores antes de load_dotenv.

Variables de entorno:
  SMTP_HOST   host del servidor SMTP (si falta → email desactivado)
  SMTP_PORT   puerto (default 587)
  SMTP_USER   usuario de autenticación
  SMTP_PASS   contraseña / app-password
  SMTP_FROM   remitente (default: SMTP_USER)
"""

import os
import smtplib
from email.message import EmailMessage


def is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def admin_email() -> str:
    """
    Casilla del dueño de DevFlow que recibe los avisos de actividad de los
    clientes. Usa ADMIN_NOTIFY_EMAIL; si no está, cae al remitente configurado.
    """
    return os.getenv("ADMIN_NOTIFY_EMAIL") or os.getenv("SMTP_FROM") or os.getenv("SMTP_USER", "")


def notify_admin(subject: str, html: str, text: str | None = None) -> bool:
    """Manda un aviso al admin (best-effort, no-op si no hay casilla/SMTP)."""
    to = admin_email()
    if not to:
        return False
    return send_email(to, subject, html, text=text)


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """
    Envía un email. Devuelve True si se envió, False si está desactivado o
    falló. NUNCA lanza excepción (best-effort): el caller no debe romperse
    porque el mail no salga.
    """
    host = os.getenv("SMTP_HOST")
    if not host or not to:
        return False  # desactivado o sin destinatario → no-op

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    sender = os.getenv("SMTP_FROM") or user

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(text or "Abrí DevFlow para ver los detalles.")
    msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            if port == 587:
                server.starttls()
                server.ehlo()
            if user and password:
                server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 — best-effort, no romper el flujo
        print(f"[email] no se pudo enviar a {to}: {exc}")
        return False
