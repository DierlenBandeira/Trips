import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Planner",
  description: "Planeje roteiros e compartilhe viagens com segurança.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">
          Ir para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
