import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Toaster } from "sonner";

import { QueryProvider } from "@/components/common/query-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0B0F14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: { default: "ON WAY FINANCIAL", template: "%s · ON WAY FINANCIAL" },
  description: "Copiloto financeiro para sua família, com WhatsApp e IA.",
  applicationName: "ON WAY FINANCIAL",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ON WAY" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-text antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
