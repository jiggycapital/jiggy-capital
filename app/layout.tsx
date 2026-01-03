import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
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
        <Sidebar />
        <main className="ml-0 md:ml-64 min-h-screen transition-all duration-300">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
