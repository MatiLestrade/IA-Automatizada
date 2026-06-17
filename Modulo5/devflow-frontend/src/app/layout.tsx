// ============================================================
// DevFlow — Módulo 5
// app/layout.tsx — Layout raíz con fuentes y tema oscuro
// ============================================================

import type { Metadata } from "next";
import { DM_Mono, Syne } from "next/font/google";
import "./globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "DevFlow",
  description: "Sistema de soporte técnico con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${dmMono.variable} ${syne.variable}`}>
      <body
        className="antialiased"
        style={{
          backgroundColor: "#0A0A0F",
          color: "#E2E8F0",
          fontFamily: "var(--font-dm-mono), monospace",
        }}
      >
        {children}
      </body>
    </html>
  );
}
