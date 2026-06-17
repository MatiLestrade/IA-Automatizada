"""
DevFlow — routers/github_auth.py
Login con GitHub (OAuth web flow).

  GET /auth/github/login     → redirige a GitHub (con state firmado anti-CSRF)
  GET /auth/github/callback  → intercambia code, vincula/crea User, emite JWT
                               DevFlow y redirige al frontend con ?token=...

Toda la lógica con secretos vive acá (no en el navegador). Reutiliza el
emisor de JWT de routers/auth.py para que el token sea idéntico al del login
email/password.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import github_client
from database import get_db
from models import RoleEnum, User
from routers.auth import ALGORITHM, SECRET_KEY, create_access_token

router = APIRouter(prefix="/auth/github", tags=["auth"])

_STATE_AUD = "github-oauth-state"


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:3000")


def _make_state() -> str:
    """State firmado (JWT corto) para protección CSRF del flujo OAuth."""
    payload = {
        "aud": _STATE_AUD,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _verify_state(state: str) -> None:
    try:
        jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM], audience=_STATE_AUD)
    except JWTError:
        raise HTTPException(status_code=400, detail="State inválido o expirado")


# ─────────────────────────────────────────────
# GET /auth/github/login
# ─────────────────────────────────────────────
@router.get("/login")
def github_login():
    if not os.getenv("GITHUB_CLIENT_ID"):
        raise HTTPException(status_code=500, detail="GitHub OAuth no está configurado")
    return RedirectResponse(github_client.authorize_url(_make_state()))


# ─────────────────────────────────────────────
# GET /auth/github/callback
# ─────────────────────────────────────────────
@router.get("/callback")
def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    _verify_state(state)

    try:
        token = github_client.exchange_code_for_token(code)
        gh = github_client.fetch_github_user(token)
    except Exception as exc:  # httpx/ValueError → error de autenticación
        raise HTTPException(status_code=401, detail=f"Fallo el OAuth de GitHub: {exc}")

    # 1) por github_id  2) por email  3) crear nuevo
    user = db.query(User).filter(User.github_id == gh["github_id"]).first()
    if not user:
        user = db.query(User).filter(User.email == gh["email"]).first()
        if user:
            # cuenta existente (email/password) → vincular GitHub
            user.github_id = gh["github_id"]
            user.github_login = gh["github_login"]
            user.avatar_url = gh["avatar_url"]
        else:
            user = User(
                id=f"gh-{gh['github_id']}",
                email=gh["email"],
                name=gh["name"],
                hashed_password=None,
                role=RoleEnum.client,
                github_id=gh["github_id"],
                github_login=gh["github_login"],
                avatar_url=gh["avatar_url"],
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token({"sub": user.id, "role": user.role})
    return RedirectResponse(f"{_frontend_url()}/auth/github/callback?token={jwt_token}")
