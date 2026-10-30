import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
  title: "GridPulse",
  description: "Texas Grid Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}