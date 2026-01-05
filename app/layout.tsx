import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/sidebar-provider";
import { MainLayout } from "@/components/main-layout";
import { Analytics } from "@vercel/analytics/next";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jiggy Capital - Financial Analysis",
  description: "Professional portfolio and financial analysis dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased terminal-bg`}>
        <SidebarProvider>
          <MainLayout>{children}</MainLayout>
        </SidebarProvider>
        <Analytics />
      </body>
    </html>
  );
}
