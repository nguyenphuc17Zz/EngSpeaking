"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  Settings,
  MessageCircle,
  Layers,
  Sparkles,
  Globe,
  BarChart3,
  GraduationCap,
  Zap,
  TrendingUp,
  Menu,
  Target,
  RotateCcw,
  Brain,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { href: "/", label: "Trang chủ", icon: MessageCircle },
  { href: "/foundation/sentence-builder", label: "Sentence Builder", icon: Sparkles },
  { href: "/foundation/vn-to-en", label: "VN → EN", icon: Target },
  { href: "/foundation/retry-lab", label: "Repair Lab", icon: RotateCcw },
  { href: "/foundation/latency", label: "Speed Gym", icon: Zap },
  { href: "/foundation/error-bank", label: "Error Bank", icon: Brain },
  { href: "/foundation/chunks", label: "Chunks", icon: Layers },
  { href: "/foundation/survival", label: "Survival", icon: ShieldAlert },
  { href: "/foundation/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/session", label: "Luyện nói", icon: Mic },
  { href: "/foundation", label: "Foundation", icon: Layers },
  { href: "/conversation", label: "Conversation", icon: Globe },
  { href: "/curriculum", label: "Curriculum", icon: GraduationCap },
  { href: "/diagnostics", label: "Diagnostics", icon: BarChart3 },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">EN</span>
          English Speaking Coach
        </Link>
        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className={cn(active && "font-medium")}>
                  <Icon className="size-4" aria-hidden />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
        {/* Mobile nav */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Mở menu">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="flex flex-col gap-1 mt-6">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                      <Button variant={active ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                        <Icon className="size-4" aria-hidden />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
