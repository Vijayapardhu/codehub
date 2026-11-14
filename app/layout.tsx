import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/use-toast";
import { AuthProvider } from "@/lib/firebase/auth";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { MobileBottomNav, MobileTopHeader } from "@/components/mobile/mobile-nav";
import { Footer } from "@/components/shared/footer";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `prep — Code Tracker`,
    template: `%s — prep`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "leetcode",
    "coding interview prep",
    "leetcode tracker",
    "DSA practice",
    "code tracker",
    "interview prep",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "prep",
    statusBarStyle: "black",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-style": "black-translucent",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-status-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex">
        <AuthProvider>
          <ToastProvider>
            <TooltipProvider>
              <SidebarNav />
              <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
                <MobileTopHeader />
                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 pb-20 md:pb-6">{children}</main>
                <MobileBottomNav />
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                  <Footer />
                </div>
              </div>
            </TooltipProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}