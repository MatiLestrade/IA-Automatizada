"""
DevFlow — github_client.py
Cliente HTTP fino sobre la API de GitHub (httpx).

Centraliza las llamadas a la API de GitHub y la lectura de las env vars.
Lo usa routers/tickets.py para crear/cerrar/reabrir issues, y ai_agent.py
para que la IA lectora navegue y lea el código del repo del cliente.
"""

import base64
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


# ─────────────────────────────────────────────
# Lectura de código (la usa la IA lectora en ai_agent.py)
# Requiere que el GITHUB_TOKEN tenga permiso "Contents: Read".
# ─────────────────────────────────────────────
def _read_headers() -> dict:
    token = _issue_token()
    if not token:
        raise RuntimeError("Falta GITHUB_TOKEN")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# Tope de bytes que devolvemos por archivo (evita reventar el contexto/costo)
_MAX_FILE_BYTES = 30_000


def get_dir(repo: str, path: str = "") -> list[dict]:
    """
    Lista los hijos de un directorio del repo (un nivel).
    Devuelve [{name, path, type}], type ∈ "file"|"dir". Si `path` es un archivo,
    devuelve una lista con ese único item.
    """
    resp = httpx.get(
        f"{GITHUB_API}/repos/{repo}/contents/{path.strip('/')}",
        headers=_read_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    items = data if isinstance(data, list) else [data]
    return [
        {"name": it.get("name"), "path": it.get("path"), "type": it.get("type")}
        for it in items
    ]


def get_file(repo: str, path: str) -> dict:
    """
    Devuelve el contenido de un archivo del repo: {path, content, truncated}.
    Decodifica base64 y trunca a _MAX_FILE_BYTES.
    """
    resp = httpx.get(
        f"{GITHUB_API}/repos/{repo}/contents/{path.strip('/')}",
        headers=_read_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) or data.get("type") != "file":
        raise ValueError(f"'{path}' no es un archivo")

    raw = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
    truncated = len(raw.encode("utf-8")) > _MAX_FILE_BYTES
    return {"path": path, "content": raw[:_MAX_FILE_BYTES], "truncated": truncated}


def search_code(repo: str, query: str) -> list[dict]:
    """
    Busca código dentro del repo (best-effort, GitHub code search).
    Devuelve [{path}]. Si la búsqueda falla (422, sin indexar, etc.), devuelve [].
    """
    try:
        resp = httpx.get(
            f"{GITHUB_API}/search/code",
            headers=_read_headers(),
            params={"q": f"{query} repo:{repo}", "per_page": 10},
            timeout=15,
        )
        resp.raise_for_status()
        return [{"path": it.get("path")} for it in resp.json().get("items", [])]
    except Exception:
        return []
