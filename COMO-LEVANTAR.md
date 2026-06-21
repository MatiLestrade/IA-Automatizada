# Cómo levantar DevFlow

Guía rápida para correr el proyecto. Son 3 procesos (4 con túnel), cada uno en su
**propia terminal de PowerShell**. Dejá cada terminal abierta mientras lo usás.

---

## Requisitos (ya instalados en esta PC)
- **Docker Desktop** (para la base de datos PostgreSQL)
- **Node.js** + npm (frontend)
- **Python** con el venv ya armado en `Modulo4\venv` (backend)
- **ngrok** (solo si querés exponerlo a internet — el token ya está configurado)

---

## Orden de arranque (IMPORTANTE: este orden)
```
1. Postgres (Docker)   →   2. Backend   →   3. Frontend   →   (4. ngrok, opcional)
```

---

## ▶️ Modo LOCAL (solo en tu PC)

### 0) Postgres
Abrí **Docker Desktop** (la app) y esperá a que arranque el motor. Después, en una terminal:
```powershell
docker start devflow-db
```

### 1) Backend — Terminal 1
```powershell
cd "C:\Users\matil\OneDrive\Escritorio\Practicas\IA Automatizada\Modulo4"
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```
Tiene que decir: `Application startup complete.`

### 2) Frontend — Terminal 2
```powershell
cd "C:\Users\matil\OneDrive\Escritorio\Practicas\IA Automatizada\Modulo5\devflow-frontend"
npm run dev
```
Tiene que decir: `Ready in ...`

### 3) Entrar
Abrí el navegador en **http://localhost:3000**

---

## 🌐 Modo con NGROK (compartir por internet)

Hacé **primero los pasos 0, 1 y 2** de arriba (Postgres + backend + frontend).
Después:

### 4) Túnel — Terminal 3
```powershell
ngrok http 3000
```
Mostrá la línea `Forwarding  https://XXXX.ngrok-free.dev -> http://localhost:3000`.
Esa **`https://XXXX.ngrok-free.dev`** es la URL que compartís.

> - La URL **cambia cada vez** que levantás ngrok (plan gratis). No hace falta tocar nada: el proyecto ya está configurado para aceptar cualquier URL de ngrok.
> - Quien entre verá una **pantalla gris de aviso de ngrok** la primera vez: hace clic en **"Visit Site"** y pasa.

---

## 🔑 Credenciales de acceso

| Rol | Email | Contraseña | Ve |
|---|---|---|---|
| **Admin** | `dev@devflow.app` | `demo-ee38d6d4` | TODO (todos los clientes, análisis IA con código, aprobar/rechazar) |
| **Cliente 1** (TechPyme SA) | `admin@techpyme.com` | `client123` | Solo SUS tickets, sin el código del análisis (solo clasificaciones) |
| **Cliente 2** (Comercial Norte) | `admin@cnorte.com` | `client456` | Solo SUS tickets, sin el código del análisis |

> Las contraseñas de los **clientes** son las del seed (débiles). Si vas a exponer la app
> a internet con clientes reales, cambialas. La del **admin** ya fue cambiada a una segura.
> Ojo: si **recreás la base** (borrás el contenedor), el seed vuelve a poner la del admin
> en `admin123` — habría que cambiarla de nuevo.

---

## ⏹️ Cómo frenar todo
- En cada terminal: **Ctrl + C**.
- Postgres (opcional, no hace falta): `docker stop devflow-db` — **no borra datos**.
- Frenar todo **no borra nada**; la próxima vez se vuelve a levantar igual.

---

## 🤖 Análisis IA (opcional)
Para que la IA clasifique los tickets, hace falta una API key de Anthropic en
`Modulo4\.env`:
```
ANTHROPIC_API_KEY=sk-ant-tu_key
```
Se saca en https://console.anthropic.com/settings/keys (requiere crédito cargado).
Después de pegarla, **reiniciá el backend** (Ctrl+C y volver a correr el paso 1).
Sin key, la app funciona igual pero los tickets quedan sin clasificar.

---

## 🆘 Si algo falla
- **Backend tira "Connection refused" puerto 5433** → Docker/Postgres no está arriba.
  Abrí Docker Desktop y corré `docker start devflow-db`.
- **La web queda en "Cargando..." por ngrok** → reiniciá el frontend (ya está
  configurado para permitir ngrok; si cambiaste algo, revisá `allowedDevOrigins`
  en `Modulo5\devflow-frontend\next.config.ts`).
- **"Port already in use"** → ya hay un proceso viejo en ese puerto. Cerralo o
  reiniciá la PC.
