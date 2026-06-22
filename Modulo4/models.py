"""
DevFlow — models.py
Modelos SQLAlchemy para User, Client y Ticket.
Todos los campos respetan el schema definido en devflow-referencia-maestro-1.md
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, Integer, event
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from database import Base


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────
class RoleEnum(str, enum.Enum):
    admin  = "admin"
    client = "client"


class TicketTypeEnum(str, enum.Enum):
    FE = "FE"
    BE = "BE"
    DB = "DB"


class PriorityEnum(str, enum.Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class StatusEnum(str, enum.Enum):
    received   = "received"
    analyzing  = "analyzing"
    queued     = "queued"
    approval   = "approval"
    inprogress = "inprogress"
    completed  = "completed"
    rejected   = "rejected"
    reopened   = "reopened"


# ─────────────────────────────────────────────
# ESCALADO DE PRIORIDAD AL REABRIR
# LOW → MEDIUM → HIGH (tope, sin llegar a CRITICAL)
# HIGH y CRITICAL se mantienen igual
# ─────────────────────────────────────────────
PRIORITY_ESCALATION = {
    PriorityEnum.LOW:      PriorityEnum.MEDIUM,
    PriorityEnum.MEDIUM:   PriorityEnum.HIGH,
    PriorityEnum.HIGH:     PriorityEnum.HIGH,
    PriorityEnum.CRITICAL: PriorityEnum.CRITICAL,
}


# ─────────────────────────────────────────────
# CLIENT
# ─────────────────────────────────────────────
class Client(Base):
    __tablename__ = "clients"

    id    = Column(String, primary_key=True)      # "c1", "c2", etc.
    name  = Column(String, nullable=False)         # "TechPyme SA"
    email = Column(String, nullable=False, unique=True)

    # Repo de GitHub de este cliente (owner/repo). Los issues de sus tickets
    # se crean acá. Lo configura el admin. null = sin repo asignado.
    github_repo = Column(String, nullable=True)

    users   = relationship("User",   back_populates="client")
    tickets = relationship("Ticket", back_populates="client")


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True)
    email         = Column(String, nullable=False, unique=True)
    name          = Column(String, nullable=False)
    # nullable: un usuario que se registra solo con GitHub no tiene password local
    hashed_password = Column(String, nullable=True)
    role          = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.client)
    client_id     = Column(String, ForeignKey("clients.id"), nullable=True)

    # Vínculo con GitHub (OAuth) — null si el usuario nunca usó "Continuar con GitHub"
    github_id     = Column(String, nullable=True, unique=True)  # id numérico de GitHub
    github_login  = Column(String, nullable=True)               # "octocat"
    avatar_url    = Column(String, nullable=True)

    client = relationship("Client", back_populates="users")


# ─────────────────────────────────────────────
# TICKET
# ─────────────────────────────────────────────
class Ticket(Base):
    __tablename__ = "tickets"

    # Identificación
    id          = Column(String, primary_key=True)   # "T-001"
    client_id   = Column(String, ForeignKey("clients.id"), nullable=False)
    client_name = Column(String, nullable=False)     # desnormalizado para queries rápidas

    # Descripción
    title       = Column(String,  nullable=False)
    description = Column(Text,    nullable=False)
    type        = Column(Enum(TicketTypeEnum), nullable=True)   # asignado por IA
    page        = Column(String,  nullable=False)    # URL completa
    page_name   = Column(String,  nullable=False)    # "/ruta"

    # Clasificación IA
    priority    = Column(Enum(PriorityEnum), nullable=True)
    status      = Column(Enum(StatusEnum),   nullable=False, default=StatusEnum.received)
    eta         = Column(String, nullable=True)      # "2h", "30m", "1d"

    # Timestamps
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))

    # Campos de análisis IA (solo visibles para admin)
    ai_suggestion  = Column(Text,  nullable=True)
    page_analysis  = Column(Text,  nullable=True)
    # code_hints: lista de { file, lines, description, fix }
    code_hints     = Column(JSONB, nullable=True, default=list)

    # Flags operacionales
    page_fetched   = Column(Boolean, nullable=False, default=False)
    auto_executed  = Column(Boolean, nullable=False, default=False)
    approved       = Column(Boolean, nullable=True)   # null=pendiente, True=aprobado, False=rechazado
    ai_error       = Column(Text,  nullable=True)

    # Resumabilidad del agente (Módulo 4+)
    step_checkpoint = Column(String, nullable=True)   # último paso completado
    agent_history   = Column(JSONB,  nullable=True, default=list)  # historial de mensajes

    # Historial de cambios de estado (legacy, ya no se actualiza).
    status_history  = Column(JSONB,  nullable=True, default=list)

    # Registro de auditoría: lista de eventos { at, changes:[{field, old, new}] }.
    # Lo mantiene el listener before_flush de abajo en cada guardado, detectando
    # automáticamente QUÉ campos cambiaron (estado, título, descripción, etc.).
    change_log      = Column(JSONB,  nullable=True, default=list)

    # Pool order (Módulo 3)
    pool_position   = Column(Integer, nullable=True)  # orden manual del admin

    # Integración GitHub (Módulo 5) — issue publicado a partir de este ticket
    github_issue_number = Column(Integer, nullable=True)
    github_issue_url    = Column(String,  nullable=True)

    client = relationship("Client", back_populates="tickets")
    comments = relationship(
        "Comment", back_populates="ticket",
        cascade="all, delete-orphan", order_by="Comment.created_at",
    )


# ─────────────────────────────────────────────
# COMMENT — hilo de conversación por ticket
# Mensajes entre el cliente y soporte. El autor sale del usuario
# autenticado (no del body). Se borran junto al ticket (cascade).
# ─────────────────────────────────────────────
class Comment(Base):
    __tablename__ = "comments"

    id          = Column(String, primary_key=True)   # uuid
    ticket_id   = Column(String, ForeignKey("tickets.id"), nullable=False, index=True)
    author_id   = Column(String, nullable=False)
    author_name = Column(String, nullable=False)
    author_role = Column(String, nullable=False)      # "admin" | "client"
    body        = Column(Text,   nullable=False)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="comments")


# ─────────────────────────────────────────────
# Auditoría automática de cambios (change_log)
# En cada flush, detecta qué campos rastreados cambiaron en cada Ticket y
# agrega un evento { at, changes:[{field, old, new}] }. Cubre TODOS los
# caminos (crear, analizar, aprobar/rechazar, reabrir, arrastre, editar).
# ─────────────────────────────────────────────
from sqlalchemy import inspect as _sa_inspect           # noqa: E402
from sqlalchemy.orm import Session as _SASession         # noqa: E402

# Campos rastreados → etiqueta legible (en español) para el frontend.
TRACKED_FIELDS = {
    "status":      "Estado",
    "title":       "Título",
    "description": "Descripción",
    "priority":    "Prioridad",
    "type":        "Tipo",
    "eta":         "ETA",
    "page":        "Página",
    "page_name":   "Ruta",
}


def _plain(v):
    """Normaliza enums a su valor string; deja el resto igual."""
    return v.value if hasattr(v, "value") else v


@event.listens_for(_SASession, "before_flush")
def _track_ticket_changes(session, flush_context, instances):
    now = datetime.now(timezone.utc).isoformat()

    # Tickets nuevos → evento de creación (estado inicial)
    for obj in session.new:
        if isinstance(obj, Ticket):
            obj.change_log = [{
                "at": now,
                "changes": [{"field": "status", "old": None, "new": _plain(obj.status)}],
            }]

    # Tickets modificados → diff de los campos rastreados
    for obj in session.dirty:
        if not isinstance(obj, Ticket):
            continue
        state = _sa_inspect(obj)
        changes = []
        for field in TRACKED_FIELDS:
            hist = state.attrs[field].history
            if hist.has_changes():
                old = hist.deleted[0] if hist.deleted else None
                new = hist.added[0] if hist.added else None
                if _plain(old) != _plain(new):
                    changes.append({"field": field, "old": _plain(old), "new": _plain(new)})
        if changes:
            log = list(obj.change_log or [])
            log.append({"at": now, "changes": changes})
            obj.change_log = log
