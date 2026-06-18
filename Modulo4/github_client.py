"""
DevFlow — github_client.py
Cliente HTTP fino sobre la API de GitHub (httpx).

Centraliza las llamadas a la API de Issues y la lectura de las env vars.
Lo usa routers/tickets.py para crear, cerrar y reabrir issues a partir
de los tickets aprobados/resueltos.
"""

import os

import httpx

# ─────────────────────────────────────────────
# Config (se lee en cada acceso para no congelar valores antes de load_dotenv)
# ─────────────────────────────────────────────
GITHUB_API = "https://api.github.com"


def _issue_token() -> str:
    return os.getenv("GITHUB_TOKEN", "")


def _repo() -> str:
    return os.getenv("GITHUB_REPO", "")


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


# ─────────────────────────────────────────────
# Cerrar / reabrir issue
# ─────────────────────────────────────────────
def set_issue_state(number: int, state: str, repo: str | None = None) -> dict:
    """
    Cambia el estado de un issue existente.
    `state`: "closed" (cerrar) u "open" (reabrir).
    """
    if state not in ("closed", "open"):
        raise ValueError(f"Estado de issue inválido: {state}")

    repo = repo or _repo()
    token = _issue_token()
    if not repo or not token:
        raise RuntimeError(
            "Falta configurar el repo del cliente (o GITHUB_REPO) y/o GITHUB_TOKEN"
        )

    resp = httpx.patch(
        f"{GITHUB_API}/repos/{repo}/issues/{number}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        json={"state": state},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return {"number": data["number"], "state": data["state"], "html_url": data["html_url"]}
