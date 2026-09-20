"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar, NAV_ITEMS } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ToastContainer } from "@/components/ui/toast";
import { ConfettiCanvas } from "@/components/ui/confetti";
import { Menu, Mic, Moon, Sun, Volume2, Sparkles, Keyboard } from "lucide-react";
import Link from "next/link";
import { KeybindingsModal } from "@/components/common/KeybindingsModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { GlobalSpeedSelector } from "@/components/common/GlobalSpeedSelector";
import { GlobalSelectionAudio } from "@/components/common/GlobalSelectionAudio";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);
  const pathname = usePathname();
  const hideAppHeader = useUiStore((s) => s.hideAppHeader);

  // Global shortcut listener: Pressing ? toggles keybindings modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsKeybindingsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load saved sidebar & theme preferences
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("engspeak_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setCollapsed(savedCollapsed === "true");
      }
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("engspeak_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // Find active item title
  const currentItem =
    NAV_ITEMS.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) || { label: "EngSpeak", description: "AI Speaking Coach" };

  const isStudioPage =
    pathname === "/session" ||
    pathname.startsWith("/conversation") ||
    pathname.startsWith("/advanced") ||
    pathname.startsWith("/foundation/");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        {!hideAppHeader && (
          <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border/60 bg-background/80 backdrop-blur-md shrink-0 z-20">
            {/* Mobile Menu & Page Title */}
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger
                    render={
                      <Button variant="ghost" size="icon" aria-label="Mở menu điều hướng">
                        <Menu className="size-5" />
                      </Button>
                    }
                  />
                  <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
                    <SheetTitle className="sr-only">Menu điều hướng EngSpeak</SheetTitle>
                    <AppSidebar
                      collapsed={false}
                      onToggleCollapse={() => {}}
                      onNavigateMobile={() => setMobileOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex flex-col">
                <h1 className="text-base md:text-lg font-serif font-bold tracking-tight text-foreground truncate flex items-center gap-2">
                  {currentItem.label}
                </h1>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  {currentItem.description}
                </span>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2">
              {/* Quick Practice Pill */}
              {pathname !== "/session" && (
                <Link href="/session">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2 font-medium shadow-xs rounded-full px-3.5 h-9 btn-spring"
                  >
                    <Mic className="size-4 animate-pulse" />
                    <span className="hidden sm:inline">Phòng luyện nói</span>
                  </Button>
                </Link>
              )}

              {/* Universal Global AI Engine Selector (Header) */}
              <GlobalAiSelector />

              {/* Universal Global Speed Controller (Header) */}
              <GlobalSpeedSelector />

              {/* Universal Keybinding Button (Header) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsKeybindingsOpen(true)}
                className="rounded-full h-9 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground border-border/70 hover:bg-secondary/60 btn-spring"
                title="Phím tắt toàn hệ thống (Bấm ?)"
                aria-label="Phím tắt toàn hệ thống (Bấm ?)"
              >
                <Keyboard className="size-4" />
                <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/60 text-foreground">
                  ?
                </kbd>
              </Button>

              {/* Dark / Light Mode Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full size-9 text-muted-foreground hover:text-foreground border-border/70 hover:bg-secondary/60 btn-spring"
                aria-label="Chuyển đổi giao diện Sáng / Tối"
              >
                {isDark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </header>
        )}

        {/* Scrollable / Fullscreen Viewport */}
        <main
          className={cn(
            "flex-1 min-h-0",
            hideAppHeader
              ? "p-0 h-full overflow-hidden"
              : isStudioPage || pathname === "/"
              ? "p-3 sm:p-4 md:p-5 overflow-y-auto overflow-x-hidden"
              : "overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
          )}
        >
          <div
            className={cn(
              "mx-auto w-full animate-in fade-in-0 duration-200",
              hideAppHeader
                ? "h-full max-w-none"
                : isStudioPage || pathname === "/settings" || pathname === "/"
                ? "w-full max-w-none"
                : "max-w-6xl"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Global Selection Pronounce Audio Floating Button */}
      <GlobalSelectionAudio />

      {/* Global Keybindings Cheat Sheet Modal */}
      <KeybindingsModal open={isKeybindingsOpen} onOpenChange={setIsKeybindingsOpen} />

      {/* Global Glassmorphism Toast Container */}
      <ToastContainer />

      {/* Global Canvas Confetti Particle Emitter */}
      <ConfettiCanvas />
    </div>
  );
}
