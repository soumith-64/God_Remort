import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "GOD REMORT — Complete Laptop Remote Control Platform",
  description: "Transform your smartphone or tablet into a wireless control centre for your laptop: Remote Desktop, Application Management, Files, PowerShell Terminal, and Power.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  other: {
    copyright: "Copyright (c) 2026 GOD REMORT. All Rights Reserved. Proprietary & Confidential.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0A0C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-omni-dark text-foreground min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
