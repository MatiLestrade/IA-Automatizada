"""
DevFlow — routers/tickets.py
CRUD completo de tickets + acciones: aprobar, rechazar, reabrir.

Endpoints:
  GET    /tickets              → lista (admin: todos | client: los suyos)
  POST   /tickets              → crear ticket nuevo
  GET    /tickets/{id}         → detalle de un ticket
  PATCH  /tickets/{id}         → actualización general (admin)
  DELETE /tickets/{id}         → eliminar (admin)
  POST   /tickets/{id}/approve → aprobar o rechazar (admin)
  POST   /tickets/{id}/reopen  → reabrir ticket rechazado (admin o cliente dueño)
  POST   /tickets/pool/reorder → guardar orden manual del pool (admin)
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import ai_agent
import github_client
from database import get_db
from models import (
    Client, PriorityEnum, PRIORITY_ESCALATION,
    StatusEnum, TicketTypeEnum, Ticket
)
from routers.auth import get_current_user, require_admin
from schemas import (
    AnalyzeRequest, ApproveRejectRequest, PoolReorderRequest,
    TicketCreate, TicketOut, TicketOutClient, TicketUpdate
)
from models import User

# Prioridades que SIEMPRE requieren aprobación manual, incluso en modo AUTO
AUTO_REQUIRES_APPROVAL = (PriorityEnum.HIGH, PriorityEnum.CRITICAL)

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ─────────────────────────────────────────────
# Helper: siguiente ID de ticket
# ─────────────────────────────────────────────
def _next_ticket_id(db: Session) -> str:
    # max(número existente) + 1 — no usar count(): tras borrar un ticket
    # count+1 puede chocar con un ID que todavía existe (PK duplicada).
    max_n = 0
    for (tid,) in db.query(Ticket.id).all():
        if tid and tid.startswith("T-"):
            try:
                max_n = max(max_n, int(tid[2:]))
            except ValueError:
                continue
    return f"T-{max_n + 1:03d}"


# ─────────────────────────────────────────────
# Helper: serializar ticket según rol
# ─────────────────────────────────────────────
def _serialize(ticket: Ticket, role: str) -> dict:
    if role == "admin":
        return TicketOut.model_validate(ticket).model_dump()
    # cliente: eliminar campos IA
    out = TicketOutClient.model_validate(ticket).model_dump()
    return out


# ─────────────────────────────────────────────
# GET /tickets
# ─────────────────────────────────────────────
@router.get("")
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority:      Optional[str] = Query(None),
    type_filter:   Optional[str] = Query(None, alias="type"),
    client_id:     Optional[str] = Query(None),
    db:            Session       = Depends(get_db),
    current_user:  User          = Depends(get_current_user),
):
    q = db.query(Ticket)

    # Clientes solo ven sus propios tickets
    if current_user.role == "client":
        q = q.filter(Ticket.client_id == current_user.client_id)
    elif client_id:
        q = q.filter(Ticket.client_id == client_id)

    if status_filter:
        q = q.filter(Ticket.status == status_filter)
    if priority:
        q = q.filter(Ticket.priority == priority)
    if type_filter:
        q = q.filter(Ticket.type == type_filter)

    # Ordenar: primero por pool_position (si existe), luego por created_at desc
    tickets = q.order_by(
        Ticket.pool_position.asc().nullslast(),
        Ticket.created_at.desc()
    ).all()

    return [_serialize(t, current_user.role) for t in tickets]


# ─────────────────────────────────────────────
# POST /tickets
# ─────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_ticket(
    body:         TicketCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # Determinar client_id
    if current_user.role == "client":
        client_id = current_user.client_id
    else:
        # Admin: usar el client_id del body o el primer cliente disponible como fallback
        client_id = body.client_id
        if not client_id:
            first = db.query(Client).first()
            if not first:
                raise HTTPException(status_code=400, detail="No hay clientes registrados")
            client_id = first.id

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    ticket = Ticket(
        id          = _next_ticket_id(db),
        client_id   = client_id,
        client_name = client.name,
        title       = body.title,
        description = body.description,
        page        = body.page,
        page_name   = body.page_name,
        priority    = body.priority,
        status      = StatusEnum.received,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _serialize(ticket, current_user.role)


# ─────────────────────────────────────────────
# POST /tickets/{id}/analyze
# Corre el agente IA en el backend (antes corría en el browser).
# ─────────────────────────────────────────────
@router.post("/{ticket_id}/analyze")
def analyze_ticket(
    ticket_id:    str,
    body:         AnalyzeRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # El cliente solo puede analizar sus propios tickets
    if current_user.role == "client" and ticket.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Marcar como analizando
    ticket.status          = StatusEnum.analyzing
    ticket.step_checkpoint = "analyzing"
    ticket.updated_at      = datetime.now(timezone.utc)
    db.commit()

    # Traer el contenido de la página (server-side) y correr el análisis
    page_text, page_fetched = ai_agent.fetch_page_text(ticket.page)
    try:
        result = ai_agent.analyze(
            ticket_id=ticket.id,
            title=ticket.title,
            description=ticket.description,
            page=ticket.page,
            page_name=ticket.page_name,
            admin_prompt=body.admin_prompt,
            page_content=page_text,
        )
    except Exception as exc:  # noqa: BLE001 — degradar a 'received' sin romper
        print(f"[ai] análisis falló para {ticket.id}: {exc}")
        ticket.status          = StatusEnum.received
        ticket.ai_error        = "No se pudo analizar el ticket. Revisá ANTHROPIC_API_KEY en el backend."
        ticket.step_checkpoint = "error"
        ticket.updated_at      = datetime.now(timezone.utc)
        db.commit()
        db.refresh(ticket)
        return _serialize(ticket, current_user.role)

    # Parsear prioridad / tipo de forma tolerante (la IA podría devolver algo raro)
    try:
        ai_priority = PriorityEnum(result.get("priority"))
    except ValueError:
        ai_priority = PriorityEnum.MEDIUM
    try:
        ai_type = TicketTypeEnum(result.get("type"))
    except ValueError:
        ai_type = None

    # Siguiente estado según modo AUTO + prioridad
    requires_approval = (not body.auto_mode) or (ai_priority in AUTO_REQUIRES_APPROVAL)
    next_status = StatusEnum.approval if requires_approval else StatusEnum.queued

    ticket.type           = ai_type
    if ticket.priority is None:           # respetar la prioridad elegida por el usuario
        ticket.priority = ai_priority
    ticket.eta            = result.get("eta")
    ticket.ai_suggestion  = result.get("aiSuggestion")
    ticket.page_analysis  = result.get("pageAnalysis") or ""
    ticket.code_hints     = result.get("codeHints") or []
    ticket.page_fetched   = page_fetched
    ticket.auto_executed  = not requires_approval
    ticket.status         = next_status
    ticket.ai_error       = None
    ticket.step_checkpoint = "completed"
    ticket.updated_at     = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)
    return _serialize(ticket, current_user.role)


# ─────────────────────────────────────────────
# GET /tickets/{id}
# ─────────────────────────────────────────────
@router.get("/{ticket_id}")
def get_ticket(
    ticket_id:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # Cliente solo puede ver sus propios tickets
    if current_user.role == "client" and ticket.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return _serialize(ticket, current_user.role)


# ─────────────────────────────────────────────
# PATCH /tickets/{id}
# ─────────────────────────────────────────────
@router.patch("/{ticket_id}")
def update_ticket(
    ticket_id:    str,
    body:         TicketUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # El cliente solo puede actualizar sus propios tickets (runAgent corre en el browser)
    if current_user.role == "client" and ticket.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    old_status = ticket.status
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)

    ticket.updated_at = datetime.now(timezone.utc)

    # Sincronizar el issue de GitHub con el estado del ticket (best-effort):
    # completed → cierra el issue · sale de completed → lo reabre
    if "status" in update_data:
        _sync_github_issue_state(ticket, old_status)

    db.commit()
    db.refresh(ticket)
    return _serialize(ticket, current_user.role)


# ─────────────────────────────────────────────
# DELETE /tickets/{id}
# ─────────────────────────────────────────────
@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if current_user.role == "client":
        if ticket.client_id != current_user.client_id:
            raise HTTPException(status_code=403, detail="Acceso denegado")
        if ticket.status not in (StatusEnum.received, StatusEnum.rejected):
            raise HTTPException(
                status_code=400,
                detail="Solo podés borrar tickets en estado 'received' o 'rejected'"
            )

    db.delete(ticket)
    db.commit()


# ─────────────────────────────────────────────
# POST /tickets/{id}/approve
# Aprobar (True) o rechazar (False) — solo admin
# ─────────────────────────────────────────────
@router.post("/{ticket_id}/approve")
def approve_or_reject(
    ticket_id: str,
    body:      ApproveRejectRequest,
    db:        Session = Depends(get_db),
    _:         User    = Depends(require_admin),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket.status not in (StatusEnum.approval, StatusEnum.reopened):
        raise HTTPException(
            status_code=400,
            detail=f"Solo se puede aprobar/rechazar un ticket en estado 'approval' o 'reopened'. Estado actual: {ticket.status}"
        )

    if body.approved:
        ticket.status   = StatusEnum.inprogress
        ticket.approved = True
        # Al aprobar, publicar el ticket como issue en el repo base (best-effort)
        _ensure_github_issue(ticket)
    else:
        ticket.status   = StatusEnum.rejected
        ticket.approved = False

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket).model_dump()


# ─────────────────────────────────────────────
# POST /tickets/{id}/reopen
# Reabrir un ticket rechazado — admin o cliente dueño
# Escala prioridad un nivel y vuelve a "approval"
# ─────────────────────────────────────────────
@router.post("/{ticket_id}/reopen")
def reopen_ticket(
    ticket_id:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # Verificar que el cliente solo pueda reabrir sus propios tickets
    if current_user.role == "client" and ticket.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if ticket.status != StatusEnum.rejected:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se puede reabrir un ticket rechazado. Estado actual: {ticket.status}"
        )

    # Escalar prioridad
    if ticket.priority:
        ticket.priority = PRIORITY_ESCALATION[ticket.priority]

    ticket.status      = StatusEnum.reopened
    ticket.approved    = None   # reset para nueva aprobación
    ticket.updated_at  = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)
    return _serialize(ticket, current_user.role)


# ─────────────────────────────────────────────
# POST /tickets/{id}/github-issue
# Publica el ticket como issue de GitHub — solo admin
# Idempotente: si ya existe el issue, devuelve el ticket sin recrearlo
# ─────────────────────────────────────────────
def _build_issue(ticket: Ticket) -> tuple[str, str, list[str]]:
    title = f"[{ticket.id}] {ticket.title}"

    lines = [
        ticket.description or "",
        "",
        "---",
        f"- **Ticket:** {ticket.id}",
        f"- **Cliente:** {ticket.client_name}",
        f"- **Prioridad:** {ticket.priority.value if ticket.priority else '—'}",
        f"- **Tipo:** {ticket.type.value if ticket.type else '—'}",
        f"- **ETA:** {ticket.eta or '—'}",
        f"- **Página:** {ticket.page or '—'}",
    ]
    if ticket.ai_suggestion:
        lines += ["", "### 💡 Sugerencia IA", ticket.ai_suggestion]
    lines += ["", "_Creado automáticamente desde DevFlow._"]
    body = "\n".join(lines)

    labels = ["devflow"]
    if ticket.type:
        labels.append(ticket.type.value)
    if ticket.priority:
        labels.append(ticket.priority.value)

    return title, body, labels


def _ensure_github_issue(ticket: Ticket) -> None:
    """
    Crea el issue en GitHub para este ticket si todavía no existe.
    Best-effort: si GitHub no está configurado o falla, NO rompe el flujo
    (la aprobación del ticket debe completarse igual). Setea los campos
    github_issue_* en el ticket cuando tiene éxito (no hace commit).
    """
    if ticket.github_issue_url:
        return  # ya tiene issue (idempotente)

    # Repo destino: el del cliente del ticket; si no tiene, cae al GITHUB_REPO global
    repo = (ticket.client.github_repo if ticket.client else None) or os.getenv("GITHUB_REPO")
    if not (repo and os.getenv("GITHUB_TOKEN")):
        return  # sin repo asignado o GitHub no configurado → se omite silenciosamente

    try:
        title, body, labels = _build_issue(ticket)
        issue = github_client.create_issue(title, body, labels, repo=repo)
        ticket.github_issue_number = issue["number"]
        ticket.github_issue_url    = issue["html_url"]
    except Exception as exc:  # noqa: BLE001 — no abortar la aprobación por GitHub
        print(f"[github] no se pudo crear el issue para {ticket.id}: {exc}")


def _sync_github_issue_state(ticket: Ticket, old_status) -> None:
    """
    Mantiene el estado del issue de GitHub en sincronía con el del ticket.
    Best-effort: si GitHub no está configurado o falla, NO rompe el flujo.
      - pasa a 'completed'        → cierra el issue (state=closed)
      - sale de 'completed'       → reabre el issue (state=open)
    No hace commit (lo hace el caller).
    """
    if not ticket.github_issue_number:
        return  # el ticket no tiene issue asociado

    repo = (ticket.client.github_repo if ticket.client else None) or os.getenv("GITHUB_REPO")
    if not (repo and os.getenv("GITHUB_TOKEN")):
        return  # GitHub no configurado → se omite silenciosamente

    new_status = ticket.status
    if new_status == StatusEnum.completed and old_status != StatusEnum.completed:
        desired = "closed"
    elif old_status == StatusEnum.completed and new_status != StatusEnum.completed:
        desired = "open"
    else:
        return  # el cambio de estado no afecta al issue

    try:
        github_client.set_issue_state(ticket.github_issue_number, desired, repo=repo)
    except Exception as exc:  # noqa: BLE001 — no abortar el update por GitHub
        print(f"[github] no se pudo poner el issue de {ticket.id} en '{desired}': {exc}")


@router.post("/{ticket_id}/github-issue")
def create_github_issue(
    ticket_id: str,
    db:        Session = Depends(get_db),
    _:         User    = Depends(require_admin),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # Idempotente: no recrear si ya tiene issue
    if ticket.github_issue_url:
        return TicketOut.model_validate(ticket).model_dump()

    repo = (ticket.client.github_repo if ticket.client else None) or os.getenv("GITHUB_REPO")
    if not repo:
        raise HTTPException(
            status_code=400,
            detail="El cliente de este ticket no tiene repo de GitHub asignado",
        )

    title, body, labels = _build_issue(ticket)
    try:
        issue = github_client.create_issue(title, body, labels, repo=repo)
    except RuntimeError as exc:  # config faltante
        raise HTTPException(status_code=500, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub rechazó la creación del issue ({exc.response.status_code})",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Error al contactar GitHub: {exc}")

    ticket.github_issue_number = issue["number"]
    ticket.github_issue_url    = issue["html_url"]
    ticket.updated_at          = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket).model_dump()


# ─────────────────────────────────────────────
# POST /tickets/pool/reorder
# Guardar orden manual del pool (admin)
# Body: { "ordered_ids": ["T-001", "T-003", "T-002", ...] }
# ─────────────────────────────────────────────
@router.post("/pool/reorder", status_code=status.HTTP_200_OK)
def reorder_pool(
    body: PoolReorderRequest,
    db:   Session = Depends(get_db),
    _:    User    = Depends(require_admin),
):
    for position, ticket_id in enumerate(body.ordered_ids, start=1):
        db.query(Ticket).filter(Ticket.id == ticket_id).update(
            {"pool_position": position, "updated_at": datetime.now(timezone.utc)}
        )
    db.commit()
    return {"detail": f"Pool reordenado: {len(body.ordered_ids)} tickets actualizados"}
