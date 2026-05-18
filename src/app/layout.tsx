import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turnos de masaje",
  description: "Reserva online de masajes terapeuticos y deportivos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
