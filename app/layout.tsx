import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaInstallPrompt } from "@/components/shared/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "Prospects",
  description: "Sales Prospect Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Prospects",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-512.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#E60012",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prospects" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
