"""
DevFlow — routers/comments.py
Hilo de conversación por ticket entre el cliente y soporte.

Endpoints:
  GET  /tickets/{id}/comments  → lista de comentarios (orden cronológico)
  POST /tickets/{id}/comments  → agregar un comentario

Reglas de acceso: las mismas que en tickets.py — un cliente solo puede
ver/comentar sus propios tickets. El autor sale del usuario autenticado.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import email_client
from database import get_db
from models import Comment, Ticket, User
from routers.auth import get_current_user
from schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/tickets", tags=["comments"])


def _get_ticket_or_403(ticket_id: str, db: Session, user: User) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if user.role == "client" and ticket.client_id != user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return ticket


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
def list_comments(
    ticket_id:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    _get_ticket_or_403(ticket_id, db, current_user)
    comments = (
        db.query(Comment)
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [CommentOut.model_validate(c) for c in comments]


@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    ticket_id:    str,
    body:         CommentCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = _get_ticket_or_403(ticket_id, db, current_user)

    comment = Comment(
        id          = uuid.uuid4().hex,
        ticket_id   = ticket_id,
        author_id   = current_user.id,
        author_name = current_user.name,
        author_role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role,
        body        = body.body,
        created_at  = datetime.now(timezone.utc),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Avisar al admin si el comentario lo dejó un cliente (best-effort)
    if current_user.role == "client" and email_client.is_configured():
        subject = f"[DevFlow] {current_user.name} ({ticket.client_name}) comentó · {ticket.id}"
        html = (
            '<div style="font-family:sans-serif;max-width:520px">'
            f'<h2 style="margin:0 0 8px">Nuevo comentario — {ticket.id}</h2>'
            f'<p style="margin:0 0 8px;color:#64748b">{ticket.title} · {current_user.name} ({current_user.email})</p>'
            f'<div style="background:#f1f5f9;border-radius:8px;padding:10px;color:#334155">{comment.body}</div>'
            '<hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">'
            '<p style="color:#64748b;font-size:13px">Ingresá a DevFlow para responder.</p>'
            '</div>'
        )
        text = f"{current_user.name} ({ticket.client_name}) comentó en {ticket.id} ({ticket.title}): {comment.body}"
        email_client.notify_admin(subject, html, text=text)

    return CommentOut.model_validate(comment)
