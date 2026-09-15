"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutGrid,
  Mic,
  Layers,
  MessageSquareText,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Volume2,
  Video,
  Target,
  RotateCcw,
  Brain,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  description: string;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    title: "TRUNG TÂM HỌC TẬP",
    items: [
      {
        href: "/",
        label: "Tổng quan",
        icon: LayoutGrid,
        description: "Trung tâm học tập & mục tiêu ngày",
      },
    ],
  },
  {
    id: "foundation",
    title: "LUYỆN NÓI NỀN TẢNG (FOUNDATION)",
    items: [
      {
        href: "/foundation/sentence-builder",
        label: "Sentence Builder",
        icon: Sparkles,
        description: "Khôi phục phản xạ tạo câu Level A → B → C",
      },
      {
        href: "/foundation/vn-to-en",
        label: "VN → EN Speaking",
        icon: Target,
        description: "Truy xuất trực tiếp từ ý niệm tiếng Việt sang tiếng Anh",
      },
      {
        href: "/foundation/retry-lab",
        label: "Spoken Repair Lab",
        icon: RotateCcw,
        description: "Chu trình Correct → Say Again sửa lỗi từ Error Bank",
      },
      {
        href: "/foundation/latency",
        label: "Response Latency",
        icon: Zap,
        description: "Rèn luyện tốc độ phản xạ & truy xuất khẩu ngữ",
      },
      {
        href: "/foundation/error-bank",
        label: "Personal Error Bank",
        icon: Brain,
        description: "Bộ nhớ học tập dài hạn & phân tích mẫu lỗi",
      },
      {
        href: "/foundation/chunks",
        label: "Chunk Automaticity",
        icon: Layers,
        description: "Lắp ráp câu khẩu ngữ từ các khối có sẵn",
      },
      {
        href: "/foundation/survival",
        label: "Survival Speaking",
        icon: ShieldAlert,
        description: "Phản xạ sinh tồn & diễn giải khi quên từ",
      },
      {
        href: "/foundation/vocabulary",
        label: "Spoken Vocabulary",
        icon: BookOpen,
        description: "Quy trình 2 bước: Phát âm từ & Nói câu ngữ cảnh",
      },
      {
        href: "/foundation/shadowing",
        label: "Shadowing Studio",
        icon: Video,
        description: "Phân tích CEFR, nối âm & nhịp thở qua video",
      },
    ],
  },
  {
    id: "practice",
    title: "PHÒNG LUYỆN TẬP & HỘI THOẠI",
    items: [
      {
        href: "/session",
        label: "Phòng luyện nói Live",
        icon: Mic,
        description: "Vòng lặp nói giọng nói trực tiếp với AI",
      },
      {
        href: "/conversation",
        label: "Hội thoại AI",
        icon: MessageSquareText,
        description: "14 kịch bản & nhân vật tương tác thực tế",
      },
      {
        href: "/advanced",
        label: "Thử thách nâng cao",
        icon: Zap,
        description: "Áp lực, phản biện & ứng biến",
      },
    ],
  },

  {
    id: "system",
    title: "HỆ THỐNG",
    items: [
      {
        href: "/settings",
        label: "Cài đặt & API Keys",
        icon: Settings,
        description: "Mô hình AI Gemini/Groq, micro & giọng đọc",
      },
    ],
  },
];

// Flat list for header title resolution
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateMobile?: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse, onNavigateMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 select-none z-30",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border/60">
        <Link
          href="/"
          onClick={onNavigateMobile}
          className="flex items-center gap-3 overflow-hidden group focus:outline-none"
        >
          <div className="flex items-center justify-center size-9 rounded-xl bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Volume2 className="size-4.5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-serif font-bold text-base tracking-tight text-sidebar-foreground">EngSpeak</span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5 tracking-wider uppercase">
                The Art of Fluency
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            aria-label="Thu gọn menu"
            className="text-muted-foreground hover:text-foreground hidden md:flex"
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      {/* Collapsed Expand Toggle Button */}
      {collapsed && (
        <div className="hidden md:flex justify-center py-2 border-b border-sidebar-border/40">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            aria-label="Mở rộng menu"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Grouped Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {/* Section Header (when expanded) */}
            {!collapsed ? (
              <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground/70 px-3 pt-1 pb-0.5 uppercase">
                {group.title}
              </h4>
            ) : groupIdx > 0 ? (
              <div className="my-2 border-t border-sidebar-border/50 mx-2" />
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
                  title={collapsed ? `${item.label} — ${item.description}` : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all group relative",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-110",
                      active
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1 text-xs font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Learner Daily Streak Card */}
      {!collapsed && (
        <div className="p-3.5 mx-2 mb-3 rounded-2xl bg-card border border-border/80 paper-shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Flame className="size-4 fill-primary/20 text-primary" />
              <span>3 ngày liên tiếp</span>
            </div>
            <Badge variant="outline" className="text-[10px] border-border/80 text-muted-foreground font-mono">
              10' / ngày
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            10 phút khẩu ngữ mỗi ngày để đánh thức phản xạ nói tự nhiên, không cần nhẩm dịch.
          </p>
          <Link href="/session" onClick={onNavigateMobile} className="block">
            <Button size="sm" variant="default" className="w-full text-xs font-semibold gap-1.5 h-8 rounded-xl btn-spring shadow-xs">
              Luyện nói ngay
            </Button>
          </Link>
        </div>
      )}
    </aside>
  );
}
