// ============================================================
// DevFlow — Módulo 5
// types/index.ts — Interfaces TypeScript
// ============================================================

export type TicketStatus =
  | "received"
  | "analyzing"
  | "queued"
  | "approval"
  | "inprogress"
  | "completed"
  | "rejected"
  | "reopened";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TicketType = "FE" | "BE" | "DB";

export type UserRole = "admin" | "client";

// ─── Cambio de estado (timeline) ────────────────────────────
export interface StatusChange {
  status: TicketStatus;
  at: string; // ISO 8601
}

// ─── Auditoría de cambios (change_log) ───────────────────────
export interface FieldChange {
  field: string;            // "status" | "title" | "description" | ...
  old: string | null;
  new: string | null;
}
export interface ChangeEvent {
  at: string;               // ISO 8601
  changes: FieldChange[];
}

// ─── CodeHint ───────────────────────────────────────────────
export interface CodeHint {
  file: string;        // "LoginButton.jsx"
  lines: string;       // "línea 40" | "entre 20 y 40"
  description: string; // qué cambiar, en español
  fix: string;         // snippet de código con el arreglo
}

// ─── Ticket ─────────────────────────────────────────────────
export interface Ticket {
  id: string;                    // "T-001"
  clientId: string;              // "c1"
  clientName: string;
  title: string;
  description: string;
  type: TicketType;
  page: string;                  // URL completa
  pageName: string;              // "/ruta"
  priority: TicketPriority;
  status: TicketStatus;
  eta: string;                   // "2h", "30m", "1d"
  createdAt: string;             // ISO 8601
  // Campos IA — solo visibles para admin
  aiSuggestion: string;
  pageAnalysis: string;
  codeHints: CodeHint[];
  pageFetched: boolean;
  autoExecuted: boolean;
  approved: boolean | null;
  aiError: string | null;
  stepCheckpoint: string;
  agentHistory: AgentMessage[];
  statusHistory?: StatusChange[];
  changeLog?: ChangeEvent[];
  poolPosition: number;
  // Integración GitHub — issue creado a partir del ticket
  githubIssueNumber?: number;
  githubIssueUrl?: string;
}

// Versión del ticket que devuelve el backend para clientes
// (sin campos IA)
export interface TicketClient {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  type: TicketType;
  page: string;
  pageName: string;
  priority: TicketPriority;
  status: TicketStatus;
  eta: string;
  createdAt: string;
  approved: boolean | null;
  autoExecuted: boolean;
  aiError: string | null;
  statusHistory?: StatusChange[];
  changeLog?: ChangeEvent[];
  poolPosition: number;
}

// Union — el frontend puede recibir cualquiera de los dos
export type AnyTicket = Ticket | TicketClient;

// ─── Comentario (hilo del ticket) ───────────────────────────
export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  createdAt: string; // ISO 8601
}

// ─── Usuario / Sesión ────────────────────────────────────────
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  clientId?: string; // solo si role === "client"
  githubLogin?: string; // si conectó GitHub
  avatarUrl?: string;
}

// ─── Cliente ────────────────────────────────────────────────
export interface Client {
  id: string;   // "c1", "c2"
  name: string; // "TechPyme SA"
  email: string;
  githubRepo?: string | null; // "owner/repo" — repo destino de sus issues
}

// ─── Agente IA ───────────────────────────────────────────────
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIAnalysisResult {
  type: TicketType;
  priority: TicketPriority;
  eta: string;
  aiSuggestion: string;
  pageAnalysis: string | null;
  codeHints: CodeHint[];
}

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Payloads de API ─────────────────────────────────────────
//- le dice al frontend qué datos incluir en el POST /tickets--
export interface CreateTicketPayload {
  title: string;
  description: string;
  page: string;
  page_name: string;
  type?: TicketType;
  priority?: TicketPriority;
  eta?: string;
  aiSuggestion?: string;
  pageAnalysis?: string;
  codeHints?: CodeHint[];
  pageFetched?: boolean;
  autoExecuted?: boolean;
  status?: TicketStatus;
  agentHistory?: AgentMessage[];
  stepCheckpoint?: string;
  createdAt?: string;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  eta?: string;
  aiSuggestion?: string;
  pageAnalysis?: string;
  codeHints?: CodeHint[];
  pageFetched?: boolean;
  autoExecuted?: boolean;
  approved?: boolean | null;
  aiError?: string | null;
  stepCheckpoint?: string;
  agentHistory?: AgentMessage[];
  poolPosition?: number;
}

export interface ReorderPayload {
  order: Array<{ id: string; poolPosition: number }>;
}

// ─── Toast ───────────────────────────────────────────────────
export interface ToastItem {
  id: string;          // uuid interno del toast
  ticketId: string;
  ticketTitle: string;
  newStatus: TicketStatus;
  timestamp: number;
}