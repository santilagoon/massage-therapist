import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maria Mikhailova | Masajista Terapeutica",
  description: "Reserva online de masajes terapeuticos y deportivos con Maria Mikhailova.",
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
