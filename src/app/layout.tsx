import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AgentationWrapper } from "@/components/AgentationWrapper";

const fontSerif = Lora({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EngSpeak — Nghệ Thuật Phản Xạ Khẩu Ngữ Tiếng Anh",
  description: "Luyện phản xạ và bản năng nói tiếng Anh tự nhiên cùng AI trong không gian học tập chuẩn Warm Editorial",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-hidden">
        <AppShell>{children}</AppShell>
        <AgentationWrapper />
      </body>
    </html>
  );
}

