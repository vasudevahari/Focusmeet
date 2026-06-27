import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://focusmeet.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FocusMeet — Video Conferencing with AI Focus",
    template: "%s | FocusMeet",
  },
  description:
    "Modern video conferencing with real-time AI focus monitoring. Track engagement, get focus analytics, and run better meetings.",
  keywords: ["video conferencing", "AI focus", "meeting analytics", "WebRTC", "remote work"],
  authors: [{ name: "FocusMeet" }],
  creator: "FocusMeet",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "FocusMeet",
    title: "FocusMeet — Video Conferencing with AI Focus",
    description: "Modern video conferencing with real-time AI focus monitoring.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FocusMeet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusMeet — Video Conferencing with AI Focus",
    description: "Modern video conferencing with real-time AI focus monitoring.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FocusMeet",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('fm-theme')||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.add(t);}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
