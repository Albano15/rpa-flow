import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Flowbot Studio · Automações",
  description: "Editor visual de automações Web e Desktop",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
