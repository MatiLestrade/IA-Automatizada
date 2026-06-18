"""
DevFlow — ai_agent.py
Análisis IA de tickets con la API de Claude, corriendo en el BACKEND.

Reemplaza el llamado que antes corría en el navegador (con la API key expuesta
vía NEXT_PUBLIC_*). Acá la key vive solo server-side (ANTHROPIC_API_KEY) y el
fetch de la página se hace directo desde el backend, sin proxy CORS.
"""

import json
import os
import re

import anthropic
import httpx

# claude-sonnet-4-6: modelo de costo intermedio (entre Opus y Haiku).
MODEL = "claude-sonnet-4-6"

_SYSTEM = (
    "You are DevFlow AI, a technical support agent specialized in web development. "
    "Always respond ONLY with the requested JSON. No markdown, no explanation, just "
    "the raw JSON object. All text fields must be in Spanish."
)


def is_configured() -> bool:
    """True si hay API key de Anthropic cargada en el backend."""
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _strip_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:2000]


def fetch_page_text(url: str) -> tuple[str, bool]:
    """
    Trae el contenido de la página directamente (server-side).
    Devuelve (texto_limpio, fetched_ok). Nunca lanza: si falla, ('', False).
    """
    if not url:
        return "", False
    try:
        resp = httpx.get(
            url,
            timeout=10,
            follow_redirects=True,
            headers={"User-Agent": "DevFlow-AI/1.0"},
        )
        resp.raise_for_status()
        return _strip_html(resp.text), True
    except Exception:
        return "", False


def analyze(
    *,
    ticket_id: str,
    title: str,
    description: str,
    page: str | None,
    page_name: str | None,
    admin_prompt: str | None = None,
    page_content: str = "",
) -> dict:
    """
    Llama a Claude y devuelve el dict de análisis con las claves:
    type, priority, eta, aiSuggestion, pageAnalysis, codeHints.
    Lanza RuntimeError si no hay API key, o la excepción del SDK / json si falla.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY no está configurada en el backend")

    extra = (admin_prompt or "").strip()
    user_message = f"""
Ticket ID: {ticket_id}
Título: {title}
Descripción: {description}
Página: {page or "no especificada"}
Ruta: {page_name or "no especificada"}
{f"Contenido de la página:{chr(10)}{page_content}" if page_content else ""}

{f"Prompt adicional del admin: {extra}" if extra else ""}

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{{
  "type": "FE" | "BE" | "DB",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "eta": "tiempo estimado en español",
  "aiSuggestion": "solución técnica detallada en español con pasos numerados",
  "pageAnalysis": "análisis del contenido de la página en español o null",
  "codeHints": [
    {{
      "file": "NombreArchivo.jsx",
      "lines": "línea 40 o entre 20 y 40",
      "description": "qué cambiar en español",
      "fix": "snippet de código"
    }}
  ]
}}
""".strip()

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = "".join(block.text for block in response.content if block.type == "text")
    clean = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)
