"""
DevFlow — routers/clients.py
Gestión de clientes (solo admin).

  GET   /clients        → lista de clientes (con su repo de GitHub)
  PATCH /clients/{id}    → asignar/actualizar el repo de GitHub del cliente
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Client, User
from routers.auth import require_admin
from schemas import ClientOut, ClientUpdate

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/")
def list_clients(
    db: Session = Depends(get_db),
    _:  User    = Depends(require_admin),
):
    clients = db.query(Client).order_by(Client.id.asc()).all()
    return [ClientOut.model_validate(c).model_dump() for c in clients]


@router.patch("/{client_id}")
def update_client(
    client_id: str,
    body:      ClientUpdate,
    db:        Session = Depends(get_db),
    _:         User    = Depends(require_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Normaliza: cadena vacía → null (sin repo)
    repo = (body.github_repo or "").strip() or None
    client.github_repo = repo

    db.commit()
    db.refresh(client)
    return ClientOut.model_validate(client).model_dump()
