"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar, NAV_ITEMS } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ToastContainer } from "@/components/ui/toast";
import { ConfettiCanvas } from "@/components/ui/confetti";
import {
  Menu,
  Mic,
  Keyboard,
  Compass,
  ScanLine,
  Search,
  ArrowRight,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { KeybindingsModal } from "@/components/common/KeybindingsModal";
import { LearningGuideModal } from "@/components/common/LearningGuideModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { GlobalSpeedSelector } from "@/components/common/GlobalSpeedSelector";
import { GlobalSelectionAudio } from "@/components/common/GlobalSelectionAudio";
import {
  useUiStore,
  INDUSTRIAL_THEMES,
  applyIndustrialThemeToDom,
  type IndustrialThemeId,
} from "@/stores/ui-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  const hideAppHeader = useUiStore((s) => s.hideAppHeader);
  const industrialTheme = useUiStore((s) => s.industrialTheme);
  const setIndustrialTheme = useUiStore((s) => s.setIndustrialTheme);
  const xrayMode = useUiStore((s) => s.xrayMode);
  const toggleXrayMode = useUiStore((s) => s.toggleXrayMode);

  const sttProvider = useSettingsStore((s) => s.stt?.provider || "whisper-local");
  const ttsProvider = useSettingsStore((s) => s.tts?.provider || "edge-tts");

  const filteredCommands = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q)
    );
  }, [commandQuery]);

  // Global shortcut listener:
  // - Cmd+K / Ctrl+K toggles Command Palette
  // - ? toggles keybindings modal
  // - Alt+X toggles [X-RAY] wireframe mode
  // - Alt+1..5 switches between the 5 industrial themes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandQuery("");
        setSelectedIndex(0);
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsKeybindingsOpen((prev) => !prev);
      } else if (e.altKey && e.code === "KeyX") {
        e.preventDefault();
        useUiStore.getState().toggleXrayMode();
      } else if (e.altKey && ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].includes(e.code)) {
        e.preventDefault();
        const idx = Number(e.code.replace("Digit", "")) - 1;
        const target = INDUSTRIAL_THEMES[idx];
        if (target) {
          useUiStore.getState().setIndustrialTheme(target.id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load saved sidebar & industrial theme preferences on mount
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("engspeak_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setCollapsed(savedCollapsed === "true");
      }

      const savedIndustrialTheme = localStorage.getItem(
        "engspeak-industrial-theme"
      ) as IndustrialThemeId | null;
      const validTheme = INDUSTRIAL_THEMES.some((t) => t.id === savedIndustrialTheme)
        ? (savedIndustrialTheme as IndustrialThemeId)
        : "anvil";

      const savedXray = localStorage.getItem("engspeak-xray-mode") === "true";

      useUiStore.setState({
        industrialTheme: validTheme,
        xrayMode: savedXray,
      });
      applyIndustrialThemeToDom(validTheme, savedXray);
    } catch {
      applyIndustrialThemeToDom("anvil", false);
    }
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

  // Find active item title
  const currentItem =
    NAV_ITEMS.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) || {
      code: "SYS",
      label: "SPEAK.SH",
      tag: "OS",
      description: "DETERMINISTIC FLUENCY KERNEL",
    };

  const isStudioPage =
    pathname === "/session" ||
    pathname.startsWith("/conversation") ||
    pathname.startsWith("/advanced") ||
    pathname.startsWith("/sentence-builder") ||
    pathname.startsWith("/vn-to-en") ||
    pathname.startsWith("/retry-lab") ||
    pathname.startsWith("/latency") ||
    pathname.startsWith("/chunks") ||
    pathname.startsWith("/survival") ||
    pathname.startsWith("/vocabulary") ||
    pathname.startsWith("/shadowing") ||
    pathname.startsWith("/baseline") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/skills") ||
    pathname.startsWith("/foundation/");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* ── UNIFIED JAPSPEAK-STYLE H-14 INDUSTRIAL TOPBAR ── */}
        {!hideAppHeader && (
          <header className="flex items-center justify-between h-14 px-3 md:px-5 border-b-2 border-border bg-card shrink-0 z-20 gap-3">
            {/* Left: Mobile Menu + Active Route Badge + Live Telemetry Ticker */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="md:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger
                    render={
                      <Button variant="outline" size="icon-sm" aria-label="Mở menu điều hướng">
                        <Menu className="size-4" />
                      </Button>
                    }
                  />
                  <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-2 border-sidebar-border">
                    <SheetTitle className="sr-only">Menu điều hướng SPEAK.SH</SheetTitle>
                    <AppSidebar
                      collapsed={false}
                      onToggleCollapse={() => {}}
                      onNavigateMobile={() => setMobileOpen(false)}
                      onOpenLearningGuide={() => {
                        setMobileOpen(false);
                      }}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Route Code + Label */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-foreground text-accent border border-border shrink-0">
                  [{currentItem.code}]
                </span>
                <h1 className="text-xs md:text-sm font-serif font-extrabold uppercase tracking-tight text-foreground truncate">
                  {currentItem.label}
                </h1>
              </div>

              {/* Compact Telemetry Strip (JapSpeak TopNav Style) */}
              <div className="hidden 2xl:flex items-center gap-2 pl-2 ml-1 border-l-2 border-border font-mono text-[10px] font-extrabold text-muted-foreground">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary border border-border text-foreground">
                  <span className="size-2 bg-[#00E676] border border-border inline-block animate-pulse" />
                  <span>REC 60 FPS</span>
                </span>
                <span className="px-1.5 py-0.5 bg-secondary border border-border text-foreground uppercase">
                  STT:{sttProvider === "whisper-local" ? "WHISPER" : sttProvider}
                </span>
                <span className="px-1.5 py-0.5 bg-secondary border border-border text-foreground uppercase">
                  TTS:{ttsProvider === "edge-tts" ? "EDGE" : ttsProvider}
                </span>
              </div>
            </div>

            {/* Center: Command Palette Search Trigger (⌘K / Ctrl+K) */}
            <button
              type="button"
              onClick={() => {
                setCommandQuery("");
                setSelectedIndex(0);
                setIsCommandPaletteOpen(true);
              }}
              title="Tìm nhanh phòng tập hoặc lệnh hệ thống (Ctrl+K / ⌘K)"
              className="hidden lg:flex items-center justify-between gap-4 px-3 h-9 min-w-[210px] xl:min-w-[250px] bg-secondary hover:bg-accent hover:text-accent-foreground text-muted-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2 font-mono text-[11px] font-extrabold uppercase tracking-tight">
                <Search className="size-3.5 text-foreground group-hover:text-accent-foreground stroke-[2.5]" />
                <span>TÌM PHÒNG TẬP...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-card text-foreground border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Right: Compact Theme Switcher + X-Ray + AI + Speed + Live Voice + ? */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Compact 5-Preset Theme Switcher */}
              <div
                className="hidden xl:flex items-center border-2 border-border bg-secondary p-0.5 shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                role="group"
                aria-label="Chọn giao diện Neo-Brutalist"
              >
                {INDUSTRIAL_THEMES.map((theme) => {
                  const active = theme.id === industrialTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setIndustrialTheme(theme.id)}
                      title={`${theme.name} — ${theme.subtitle} (Alt+${Number(theme.code)})`}
                      className={cn(
                        "px-1.5 py-1 text-[10px] font-mono font-extrabold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1",
                        active
                          ? "bg-primary text-primary-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      )}
                    >
                      <span
                        className="size-2 border border-border shrink-0"
                        style={{ backgroundColor: theme.swatchPrimary }}
                      />
                      <span className="hidden 2xl:inline">{theme.shortName}</span>
                      <span className="2xl:hidden">{theme.code}</span>
                    </button>
                  );
                })}
              </div>

              {/* [X-RAY] Wireframe Toggle Button */}
              <Button
                type="button"
                variant={xrayMode ? "default" : "outline"}
                size="sm"
                onClick={toggleXrayMode}
                className={cn(
                  "hidden md:inline-flex h-8 px-2 font-mono text-[10px] font-extrabold gap-1",
                  xrayMode && "bg-accent text-accent-foreground"
                )}
                title="Chế độ khung dây kỹ thuật [X-RAY] (Alt+X)"
              >
                <ScanLine className="size-3.5" />
                <span className="hidden lg:inline">[X-RAY]</span>
              </Button>

              {/* Universal Global AI Engine Selector */}
              <GlobalAiSelector />

              {/* Universal Global Speed Controller */}
              <GlobalSpeedSelector />

              {/* Quick Practice CTA */}
              {pathname !== "/session" && (
                <Link href="/session" className="hidden sm:inline-flex">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 font-mono font-extrabold uppercase text-[11px] px-2.5 h-8 bg-primary text-primary-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                  >
                    <Mic className="size-3.5 animate-pulse" />
                    <span className="hidden md:inline">LIVE VOICE →</span>
                  </Button>
                </Link>
              )}

              {/* Universal Keybinding Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsKeybindingsOpen(true)}
                className="h-8 px-2 gap-1 text-foreground bg-secondary hover:bg-accent hover:text-accent-foreground"
                title="Phím tắt toàn hệ thống (Bấm ?)"
                aria-label="Phím tắt toàn hệ thống (Bấm ?)"
              >
                <Keyboard className="size-3.5" />
                <kbd className="text-[10px] font-mono font-extrabold px-1 bg-card border border-border text-foreground">
                  ?
                </kbd>
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
              "mx-auto w-full animate-in fade-in-0 duration-150",
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

      {/* ── JAPSPEAK COMMAND PALETTE MODAL (⌘K / Ctrl+K) ── */}
      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent className="p-0 sm:max-w-xl bg-card border-2 border-border shadow-[6px_6px_0px_var(--industrial-shadow-color)] overflow-hidden">
          <DialogTitle className="sr-only">Tìm kiếm nhanh phòng tập (Command Palette)</DialogTitle>
          <div className="flex items-center justify-between px-3.5 py-2 bg-foreground text-background border-b-2 border-border font-mono text-[10px] font-extrabold uppercase tracking-wider">
            <span>SPEAK.SH // COMMAND PALETTE [⌘K]</span>
            <span className="text-accent">↑↓ CHỌN • ENTER MỞ • ESC ĐÓNG</span>
          </div>
          <div className="p-3 border-b-2 border-border bg-secondary flex items-center gap-2.5">
            <Search className="size-4 text-primary shrink-0 stroke-[2.5]" />
            <input
              type="text"
              value={commandQuery}
              onChange={(e) => {
                setCommandQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    filteredCommands.length > 0
                      ? (prev - 1 + filteredCommands.length) % filteredCommands.length
                      : 0
                  );
                } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
                  e.preventDefault();
                  const target = filteredCommands[selectedIndex];
                  setIsCommandPaletteOpen(false);
                  router.push(target.href);
                }
              }}
              placeholder="Nhập tên phòng tập, mã LAB (01..12) hoặc kỹ năng..."
              className="w-full bg-transparent text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/30 p-2 space-y-1">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-muted-foreground">
                Không tìm thấy phòng tập khớp với từ khóa &ldquo;{commandQuery}&rdquo;
              </div>
            ) : (
              filteredCommands.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      router.push(item.href);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left border-2 transition-all cursor-pointer",
                      isSelected
                        ? "bg-accent text-accent-foreground border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                        : "bg-card text-foreground border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-foreground text-background border border-border shrink-0">
                        [{item.code}]
                      </span>
                      <Icon className="size-4 shrink-0 stroke-[2.25]" />
                      <div className="min-w-0">
                        <div className="font-serif font-extrabold text-xs uppercase tracking-tight truncate">
                          {item.label}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold bg-secondary text-foreground border border-border">
                        {item.tag}
                      </span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Theme Switcher Footer inside Command Palette */}
          <div className="px-3.5 py-2.5 bg-secondary border-t-2 border-border flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase text-muted-foreground">
              <Palette className="size-3.5 text-primary" />
              <span>ĐỔI GIAO DIỆN NHANH (ALT+1..5):</span>
            </span>
            <div className="flex items-center gap-1">
              {INDUSTRIAL_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setIndustrialTheme(t.id)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-mono font-extrabold border border-border cursor-pointer",
                    t.id === industrialTheme
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-accent"
                  )}
                >
                  {t.shortName}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom-Left Floating Trigger */}
      <div className="md:hidden fixed bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => useUiStore.getState().openLearningGuide()}
          className="size-9 bg-accent border-2 border-border shadow-[3px_3px_0px_var(--industrial-shadow-color)] text-accent-foreground flex items-center justify-center cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
          title="LỘ TRÌNH 20P/NGÀY [F1]"
          aria-label="Hướng dẫn học"
        >
          <Compass className="size-4.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Global Selection Pronounce Audio Floating Button */}
      <GlobalSelectionAudio />

      {/* Global Keybindings Cheat Sheet Modal */}
      <KeybindingsModal open={isKeybindingsOpen} onOpenChange={setIsKeybindingsOpen} />

      {/* Global Speaking Learning Guide Modal */}
      <LearningGuideModal />

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Global Canvas Confetti Particle Emitter */}
      <ConfettiCanvas />
    </div>
  );
}
