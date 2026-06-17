"""
DevFlow — github_client.py
Cliente HTTP fino sobre la API de GitHub (httpx).

Centraliza las llamadas externas y la lectura de las env vars de GitHub.
Lo usan:
  - routers/github_auth.py  → OAuth login (exchange_code_for_token, fetch_github_user)
  - routers/tickets.py      → crear issues (create_issue)
"""

import os

import httpx

# ─────────────────────────────────────────────
# Config (se lee en cada acceso para no congelar valores antes de load_dotenv)
# ─────────────────────────────────────────────
GITHUB_API = "https://api.github.com"


def _client_id() -> str:
    return os.getenv("GITHUB_CLIENT_ID", "")


def _client_secret() -> str:
    return os.getenv("GITHUB_CLIENT_SECRET", "")


def _redirect_uri() -> str:
    return os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/github/callback")


def _issue_token() -> str:
    return os.getenv("GITHUB_TOKEN", "")


def _repo() -> str:
    return os.getenv("GITHUB_REPO", "")


# ─────────────────────────────────────────────
# OAuth login
# ─────────────────────────────────────────────
def authorize_url(state: str) -> str:
    """URL de autorización de GitHub a la que redirigimos al usuario."""
    from urllib.parse import urlencode

    params = {
        "client_id": _client_id(),
        "redirect_uri": _redirect_uri(),
        "scope": "read:user user:email",
        "state": state,
        "allow_signup": "true",
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    """Intercambia el ?code del callback por un access_token de usuario."""
    resp = httpx.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "code": code,
            "redirect_uri": _redirect_uri(),
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise ValueError(f"GitHub no devolvió access_token: {data}")
    return token


def fetch_github_user(token: str) -> dict:
    """Datos del usuario de GitHub + su email primario verificado."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    with httpx.Client(headers=headers, timeout=15) as client:
        user = client.get(f"{GITHUB_API}/user")
        user.raise_for_status()
        profile = user.json()

        # El email del perfil puede ser null si es privado → pedir /user/emails
        email = profile.get("email")
        if not email:
            emails = client.get(f"{GITHUB_API}/user/emails")
            if emails.status_code == 200:
                primary = next(
                    (e for e in emails.json() if e.get("primary") and e.get("verified")),
                    None,
                )
                if primary:
                    email = primary["email"]

    return {
        "github_id": str(profile["id"]),
        "github_login": profile.get("login"),
        "name": profile.get("name") or profile.get("login"),
        "email": email or f"{profile.get('login')}@users.noreply.github.com",
        "avatar_url": profile.get("avatar_url"),
    }


# ─────────────────────────────────────────────
# Crear issue
# ─────────────────────────────────────────────
def create_issue(
    title: str,
    body: str,
    labels: list[str] | None = None,
    repo: str | None = None,
) -> dict:
    """
    Crea un issue usando el GITHUB_TOKEN del backend.
    `repo` (owner/repo) es el destino; si no se pasa, cae al GITHUB_REPO del .env.
    """
    repo = repo or _repo()
    token = _issue_token()
    if not repo or not token:
        raise RuntimeError(
            "Falta configurar el repo del cliente (o GITHUB_REPO) y/o GITHUB_TOKEN"
        )

    resp = httpx.post(
        f"{GITHUB_API}/repos/{repo}/issues",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        json={"title": title, "body": body, "labels": labels or []},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return {"number": data["number"], "html_url": data["html_url"]}
