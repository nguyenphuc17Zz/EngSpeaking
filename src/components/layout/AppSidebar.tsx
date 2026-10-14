"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Mic,
  Layers,
  MessageSquareText,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Video,
  Target,
  RotateCcw,
  ShieldAlert,
  BookOpen,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export interface NavItem {
  code: string;
  href: string;
  label: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  description: string;
}

export interface NavGroup {
  id: string;
  title: string;
  range: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    title: "00 // CONTROL PLANE",
    range: "HUB",
    items: [
      {
        code: "00",
        href: "/",
        label: "Trung tâm Điều hành",
        tag: "HUB",
        icon: LayoutGrid,
        description: "RUNTIME FLUENCY CONTROL PLANE // TELEMETRY HUB",
      },
    ],
  },
  {
    id: "foundation",
    title: "01 // PHÒNG TẬP NỀN TẢNG",
    range: "01–08",
    items: [
      {
        code: "01",
        href: "/sentence-builder",
        label: "Xây dựng câu",
        tag: "3-TIER",
        icon: Sparkles,
        description: "3-TIER SYNTACTIC REFLEX ENGINE (LEVEL A → B → C)",
      },
      {
        code: "02",
        href: "/vn-to-en",
        label: "Phản xạ Việt → Anh",
        tag: "0MS",
        icon: Target,
        description: "CONCEPT-TO-SPEECH DIRECT RETRIEVAL ENGINE",
      },
      {
        code: "03",
        href: "/retry-lab",
        label: "Sửa lỗi Phản xạ",
        tag: "REPAIR",
        icon: RotateCcw,
        description: "DETERMINISTIC SELF-REPAIR & UTTERANCE LOOP",
      },
      {
        code: "04",
        href: "/latency",
        label: "Tốc độ Phản hồi",
        tag: "TTFW",
        icon: Zap,
        description: "SUB-1.5S TIME-TO-FIRST-WORD REFLEX BLITZ",
      },
      {
        code: "05",
        href: "/chunks",
        label: "Cụm từ Tự động",
        tag: "DAG-4",
        icon: Layers,
        description: "PRAGMATIC DAG FORMULAIC CHUNK ASSEMBLER",
      },
      {
        code: "06",
        href: "/survival",
        label: "Giao tiếp Sinh tồn",
        tag: "SURVIVE",
        icon: ShieldAlert,
        description: "CIRCUMLOCUTION & HIGH-PRESSURE RECOVERY",
      },
      {
        code: "07",
        href: "/vocabulary",
        label: "Từ vựng Phản xạ",
        tag: "OXFORD",
        icon: BookOpen,
        description: "OXFORD-5000 IPA PHONETIC STRESS & CONTEXT GYM",
      },
      {
        code: "08",
        href: "/shadowing",
        label: "Nhại giọng Shadowing",
        tag: "SYNC",
        icon: Video,
        description: "ACOUSTIC SYNCHRONIZATION & PROSODY ENGINE",
      },
    ],
  },
  {
    id: "practice",
    title: "02 // THỰC CHIẾN CHuyên SÂU",
    range: "09–11",
    items: [
      {
        code: "09",
        href: "/session",
        label: "Thực chiến Giọng nói",
        tag: "VAD",
        icon: Mic,
        description: "REAL-TIME FULL-DUPLEX AI VOICE TUTOR + SMART VAD",
      },
      {
        code: "10",
        href: "/conversation",
        label: "Hội thoại Nhập vai",
        tag: "ROLEPLAY",
        icon: MessageSquareText,
        description: "STATEFUL SCENARIO SIMULATION & DYNAMIC TWISTS",
      },
      {
        code: "11",
        href: "/advanced",
        label: "Tranh biện Toulmin",
        tag: "TOULMIN",
        icon: Zap,
        description: "ACADEMIC DEBATE, FALLACY SHIELD & PRESSURE LAB",
      },
    ],
  },
  {
    id: "system",
    title: "03 // HỆ THỐNG & ENGINE",
    range: "SYS",
    items: [
      {
        code: "12",
        href: "/settings",
        label: "Cấu hình AI & Giọng",
        tag: "CONFIG",
        icon: Settings,
        description: "LLM ROUTING, WHISPER-ONNX, KOKORO-TTS & AUDIO IO",
      },
    ],
  },
];

// Flat list for header title resolution & Command Palette
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateMobile?: () => void;
  onOpenLearningGuide?: () => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  onNavigateMobile,
  onOpenLearningGuide,
}: AppSidebarProps) {
  const pathname = usePathname();
  const openLearningGuideStore = useUiStore((s) => s.openLearningGuide);

  const handleOpenGuide = () => {
    onOpenLearningGuide?.();
    openLearningGuideStore();
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-sidebar border-r-2 border-sidebar-border transition-all duration-150 select-none z-30",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand Header — JapSpeak Industrial Telemetry Console Style */}
      <div className="flex items-center justify-between h-14 px-3 border-b-2 border-sidebar-border bg-card shrink-0">
        <Link
          href="/"
          onClick={onNavigateMobile}
          className="flex items-center gap-2.5 overflow-hidden group focus:outline-none"
        >
          <div className="size-9 shrink-0 bg-primary text-primary-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] flex items-center justify-center font-mono text-xs font-extrabold tracking-tighter group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
            &gt;_
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-extrabold text-base tracking-tight text-foreground">
                  SPEAK.SH
                </span>
                <span className="text-[9px] font-mono font-extrabold px-1 py-0.5 bg-accent text-accent-foreground border border-border">
                  v4.8
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-muted-foreground tracking-widest uppercase mt-0.5 truncate">
                ENGLISH FLUENCY OS
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Thu gọn menu"
            title="Thu gọn thanh bên"
            className="hidden md:flex size-7 items-center justify-center border-2 border-border bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Collapsed Expand Toggle Button */}
      {collapsed && (
        <div className="hidden md:flex justify-center py-1.5 border-b-2 border-sidebar-border bg-secondary">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Mở rộng menu"
            title="Mở rộng thanh bên"
            className="size-7 flex items-center justify-center border-2 border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Grouped Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {/* Black Section Header Bar (JapSpeak Style) */}
            {!collapsed ? (
              <div className="flex items-center justify-between px-2.5 py-1 bg-foreground text-background border border-border mb-1.5">
                <span className="text-[10px] font-mono font-extrabold tracking-widest uppercase truncate">
                  {group.title}
                </span>
                <span className="text-[9px] font-mono font-extrabold text-accent shrink-0">
                  {group.range}
                </span>
              </div>
            ) : groupIdx > 0 ? (
              <div className="my-2 border-t-2 border-sidebar-border mx-1" />
            ) : null}

            {/* Items inside Group */}
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigateMobile}
                  title={
                    collapsed
                      ? `[${item.code}] ${item.label} (${item.tag}) — ${item.description}`
                      : item.description
                  }
                  className={cn(
                    "flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-bold transition-all group relative border-2",
                    active
                      ? "bg-primary text-primary-foreground border-border shadow-[3px_3px_0px_var(--industrial-shadow-color)] -translate-x-[1px] -translate-y-[1px]"
                      : "border-transparent text-sidebar-foreground hover:border-border hover:bg-secondary hover:shadow-[2px_2px_0px_var(--industrial-shadow-color)]",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0 stroke-[2.25]",
                        active
                          ? "text-primary-foreground"
                          : "text-foreground group-hover:text-primary"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate font-sans text-xs font-extrabold tracking-tight">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!collapsed && (
                    <span
                      className={cn(
                        "text-[9px] font-mono font-extrabold px-1.5 py-0.5 border shrink-0 uppercase tracking-tighter",
                        active
                          ? "bg-foreground text-accent border-border"
                          : "bg-secondary text-muted-foreground border-border group-hover:bg-card group-hover:text-foreground"
                      )}
                    >
                      {item.tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom High-Visibility Volt Lime Protocol Guide Trigger (JapSpeak Style) */}
      <div className="p-2.5 border-t-2 border-sidebar-border bg-secondary shrink-0">
        {!collapsed ? (
          <button
            type="button"
            onClick={handleOpenGuide}
            className="flex items-center justify-between gap-2 w-full px-3 py-2 border-2 border-border bg-accent text-accent-foreground shadow-[3px_3px_0px_var(--industrial-shadow-color)] hover:bg-primary hover:text-primary-foreground font-mono text-[11px] font-extrabold uppercase tracking-tight transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            title="Cẩm nang vận hành & lộ trình 20p/ngày (Field Manual)"
          >
            <div className="flex items-center gap-2 truncate">
              <Compass className="size-4 shrink-0 stroke-[2.5]" />
              <span className="truncate">LỘ TRÌNH 20P/NGÀY</span>
            </div>
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-foreground text-background border border-border">
              F1
            </span>
          </button>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleOpenGuide}
              className="size-9 border-2 border-border bg-accent text-accent-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground shadow-[2px_2px_0px_var(--industrial-shadow-color)] transition-all cursor-pointer"
              title="LỘ TRÌNH 20P/NGÀY [F1]"
              aria-label="Hướng dẫn học"
            >
              <Compass className="size-4 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
