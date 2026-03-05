import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/sidebar-provider";
import { MainLayout } from "@/components/main-layout";
import { Analytics } from "@vercel/analytics/next";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0F19",
};

export const metadata: Metadata = {
  title: "Jiggy Capital - Financial Analysis",
  description: "Professional portfolio and financial analysis dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jiggy Capital",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  manifest: "/manifest.json",
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.variable} ${jetbrainsMono.variable} font-sans antialiased text-slate-100`}>
        <SidebarProvider>
          <MainLayout>{children}</MainLayout>
        </SidebarProvider>
        <Analytics />
      </body>
    </html>
  );
}
