import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que el túnel (ngrok) cargue los recursos del dev server de Next.
  // Sin esto, Next 16 bloquea /_next/* desde un origen externo y la página
  // queda en "Cargando..." (el JS no llega a ejecutarse). Comodín = sobrevive
  // a que la URL de ngrok cambie.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io"],

  // No redirigir por la barra final: dejamos que /api/tickets/ pase tal cual al
  // backend (que la usa). Sin esto, Next redirige 308 → choca con el 307 del
  // backend, se pierde el header Authorization y el login rebota a /login.
  skipTrailingSlashRedirect: true,

  // Proxy: /api/* → backend FastAPI (localhost:8000).
  // Permite exponer SOLO el frontend por un único túnel (ngrok) y evita CORS,
  // porque el navegador habla siempre con el mismo origen.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
