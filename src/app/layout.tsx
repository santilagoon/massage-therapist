import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Massage Booking MVP",
  description: "Online appointment requests for therapeutic and sports massage.",
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
