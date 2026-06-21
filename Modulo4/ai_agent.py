"""
DevFlow — ai_agent.py
Análisis IA de tickets con la API de Claude, corriendo en el BACKEND.

Dos etapas (dos "agentes"):
  1. LECTOR (read_code): con tools sobre la API de GitHub, navega y lee el código
     REAL del repo del cliente para encontrar el archivo/causa raíz del bug.
  2. CLASIFICADOR (classify): a partir de los hallazgos del lector, produce los
     metadatos del ticket (tipo, prioridad, ETA) y arma aiSuggestion/codeHints
     fundamentados en archivos reales.

Si no hay repo/permiso, el lector se saltea y el clasificador trabaja solo con la
descripción (comportamiento degradado, como antes). La API key vive solo server-side.
"""

import json
import os
import re

import anthropic

import github_client

# claude-sonnet-4-6: modelo de costo intermedio (entre Opus y Haiku). Para ambas etapas.
MODEL = "claude-sonnet-4-6"

# Tope de vueltas del loop del agente lector (evita reventar tokens/costo).
_MAX_READER_ITERS = 8

_CLASSIFIER_SYSTEM = (
    "You are DevFlow AI, a technical support agent specialized in web development. "
    "Always respond ONLY with the requested JSON. No markdown, no explanation, just "
    "the raw JSON object. All text fields must be in Spanish."
)

_READER_SYSTEM = (
    "Sos un investigador de bugs de software. Tenés herramientas para navegar y leer un "
    "repositorio de GitHub (listar carpetas, leer archivos, buscar código). Tu objetivo "
    "es localizar en el CÓDIGO REAL el origen del problema reportado y proponer un arreglo "
    "concreto.\n"
    "Reglas:\n"
    "- Solo afirmá cosas que verificaste leyendo el código real. NO inventes archivos, "
    "rutas ni líneas.\n"
    "- Sé eficiente: no leas todo el repo, andá directo a lo relevante (usá la ruta de la "
    "página y la descripción como pistas).\n"
    "- Cuando tengas la respuesta (o si tras explorar no encontrás nada), respondé "
    "ÚNICAMENTE con este JSON, sin markdown ni texto extra:\n"
    "{\n"
    '  "found": true,\n'
    '  "files": [{"path": "ruta/real.ext", "lines": "línea X o rango", "problem": "qué está mal ahí"}],\n'
    '  "root_cause": "causa raíz en español",\n'
    '  "suggestion": "cómo arreglarlo, pasos en español",\n'
    '  "fix_snippet": "snippet de código del arreglo o cadena vacía"\n'
    "}"
)

_READER_TOOLS = [
    {
        "name": "list_repo_files",
        "description": "Lista archivos y carpetas de un directorio del repo (un nivel). Usá path vacío para la raíz.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ruta del directorio, ej 'src/app'. Vacío = raíz."}
            },
            "required": [],
        },
    },
    {
        "name": "read_repo_file",
        "description": "Lee el contenido de un archivo del repo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Ruta del archivo, ej 'Modulo4/routers/tickets.py'."}
            },
            "required": ["path"],
        },
    },
    {
        "name": "search_repo_code",
        "description": "Busca texto/código dentro del repo. Devuelve rutas de archivos que coinciden.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Texto a buscar, ej 'def login' o 'pointer-events'."}},
            "required": ["query"],
        },
    },
]


def is_configured() -> bool:
    """True si hay API key de Anthropic cargada en el backend."""
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY no está configurada en el backend")
    return anthropic.Anthropic(api_key=api_key)


def _parse_json(text: str) -> dict:
    clean = text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


# ─────────────────────────────────────────────
# Contexto opcional de la página (fetch server-side)
# ─────────────────────────────────────────────
def _strip_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:2000]


def fetch_page_text(url: str) -> tuple[str, bool]:
    """Trae el contenido de la página (server-side). (texto, ok). Nunca lanza."""
    if not url:
        return "", False
    try:
        import httpx

        resp = httpx.get(url, timeout=10, follow_redirects=True,
                         headers={"User-Agent": "DevFlow-AI/1.0"})
        resp.raise_for_status()
        return _strip_html(resp.text), True
    except Exception:
        return "", False


# ─────────────────────────────────────────────
# ETAPA 1 — Agente LECTOR (tool-use loop sobre el repo)
# ─────────────────────────────────────────────
def _run_tool(name: str, tool_input: dict, repo: str) -> tuple[str, bool]:
    """Ejecuta una tool del lector. Devuelve (resultado_texto, is_error)."""
    try:
        if name == "list_repo_files":
            items = github_client.get_dir(repo, tool_input.get("path", "") or "")
            return json.dumps(items[:80], ensure_ascii=False), False
        if name == "read_repo_file":
            data = github_client.get_file(repo, tool_input["path"])
            suffix = "\n\n[...truncado...]" if data.get("truncated") else ""
            return data["content"] + suffix, False
        if name == "search_repo_code":
            hits = github_client.search_code(repo, tool_input["query"])
            return json.dumps(hits, ensure_ascii=False), False
        return f"Tool desconocida: {name}", True
    except Exception as exc:  # noqa: BLE001 — devolver el error al modelo para que se adapte
        return f"Error ejecutando {name}: {exc}", True


def read_code(
    repo: str,
    *,
    ticket_id: str,
    title: str,
    description: str,
    page: str | None,
    page_name: str | None,
) -> dict:
    """
    Agente lector: investiga el repo con tools y devuelve hallazgos fundamentados.
    Nunca lanza: ante cualquier falla devuelve {"found": False, "error": ...}.
    """
    try:
        client = _client()
    except RuntimeError:
        raise  # la falta de API key sí debe propagar (la maneja analyze/endpoint)

    user_prompt = (
        f"Investigá este bug en el código del repo `{repo}`.\n"
        f"Ticket: {title}\n"
        f"Descripción: {description}\n"
        f"Página afectada: {page or '—'}   Ruta: {page_name or '—'}\n\n"
        "Usá las herramientas para navegar el repo, encontrar el/los archivo(s) y la causa "
        "raíz. Si no sabés por dónde empezar, listá la raíz. Cuando termines, respondé SOLO "
        "con el JSON pedido."
    )
    messages: list[dict] = [{"role": "user", "content": user_prompt}]

    try:
        for _ in range(_MAX_READER_ITERS):
            resp = client.messages.create(
                model=MODEL,
                max_tokens=2000,
                system=_READER_SYSTEM,
                tools=_READER_TOOLS,
                messages=messages,
            )
            messages.append({"role": "assistant", "content": resp.content})

            if resp.stop_reason == "tool_use":
                tool_results = []
                for block in resp.content:
                    if block.type == "tool_use":
                        out, is_err = _run_tool(block.name, block.input or {}, repo)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": out,
                            "is_error": is_err,
                        })
                messages.append({"role": "user", "content": tool_results})
                continue

            # end_turn (o similar): el lector debería haber devuelto el JSON final
            text = "".join(b.text for b in resp.content if b.type == "text")
            return _parse_json(text)

        # Se acabaron las iteraciones sin un cierre limpio
        return {"found": False, "error": "El lector no concluyó dentro del límite de pasos"}
    except Exception as exc:  # noqa: BLE001 — degradar sin romper el análisis
        print(f"[ai/reader] falló leyendo el repo {repo}: {exc}")
        return {"found": False, "error": str(exc)}


# ─────────────────────────────────────────────
# ETAPA 2 — CLASIFICADOR
# ─────────────────────────────────────────────
def classify(
    *,
    ticket_id: str,
    title: str,
    description: str,
    page: str | None,
    page_name: str | None,
    admin_prompt: str | None = None,
    page_content: str = "",
    findings: dict | None = None,
) -> dict:
    """Devuelve {type, priority, eta, aiSuggestion, pageAnalysis, codeHints}."""
    client = _client()
    extra = (admin_prompt or "").strip()

    if findings and findings.get("found"):
        grounding = (
            "Un agente LECTOR ya investigó el CÓDIGO REAL del repo y encontró esto "
            "(usalo como única base; NO inventes archivos ni líneas):\n"
            f"{json.dumps(findings, ensure_ascii=False)}\n"
            "Armá `aiSuggestion` y `codeHints` a partir de estos hallazgos: cada codeHint "
            "debe usar el `path` real como `file`, las `lines` reales y el `fix_snippet` como `fix`."
        )
    else:
        grounding = (
            "No hubo acceso al código del repo (sin repo configurado, sin permiso, o el "
            "lector no encontró nada). Clasificá según la descripción y aclaralo en "
            "`pageAnalysis`. En ese caso los `codeHints` son orientativos, no verificados."
        )

    user_message = f"""
Ticket ID: {ticket_id}
Título: {title}
Descripción: {description}
Página: {page or "no especificada"}
Ruta: {page_name or "no especificada"}
{f"Contenido de la página:{chr(10)}{page_content}" if page_content else ""}

{grounding}

{f"Prompt adicional del admin: {extra}" if extra else ""}

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{{
  "type": "FE" | "BE" | "DB",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "eta": "tiempo estimado en español",
  "aiSuggestion": "solución técnica detallada en español con pasos numerados",
  "pageAnalysis": "análisis en español o null",
  "codeHints": [
    {{
      "file": "ruta/Archivo.ext",
      "lines": "línea 40 o entre 20 y 40",
      "description": "qué cambiar en español",
      "fix": "snippet de código"
    }}
  ]
}}
""".strip()

    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=_CLASSIFIER_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    return _parse_json(text)


# ─────────────────────────────────────────────
# ORQUESTADOR
# ─────────────────────────────────────────────
def analyze(
    *,
    ticket_id: str,
    title: str,
    description: str,
    page: str | None,
    page_name: str | None,
    admin_prompt: str | None = None,
    page_content: str = "",
    repo: str | None = None,
) -> dict:
    """
    Pipeline completo: (lector si hay repo) → clasificador.
    Devuelve el dict de análisis con las claves que consume el endpoint.
    Lanza RuntimeError si no hay API key; el resto degrada solo.
    """
    findings: dict | None = None
    if repo and github_client._issue_token():
        findings = read_code(
            repo,
            ticket_id=ticket_id,
            title=title,
            description=description,
            page=page,
            page_name=page_name,
        )

    return classify(
        ticket_id=ticket_id,
        title=title,
        description=description,
        page=page,
        page_name=page_name,
        admin_prompt=admin_prompt,
        page_content=page_content,
        findings=findings,
    )
