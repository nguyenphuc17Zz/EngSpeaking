import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AgentationWrapper } from "@/components/AgentationWrapper";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EngSpeak — AI English Speaking Coach",
  description: "Luyện phản xạ và kỹ năng nói tiếng Anh thông minh cùng AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground overflow-hidden">
        <AppShell>{children}</AppShell>
        <AgentationWrapper />
      </body>
    </html>
  );
}

