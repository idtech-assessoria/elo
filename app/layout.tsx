import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elo — Peças & Empréstimos",
  description: "Estoque, empréstimos e relações de confiança. Explore o escopo interativo da sua assistência técnica.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
