"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Keyboard,
  Mic,
  MessageSquare,
  Sparkles,
  Layers,
  Flame,
  Clock,
  Compass,
  Zap,
} from "lucide-react";

interface KeybindingItem {
  keys: string[];
  title: string;
  description: string;
  contextBadge: string;
  category: "sentence_builder" | "conversation" | "shadowing" | "global";
}

const KEYBINDINGS: KeybindingItem[] = [
  // Sentence Builder
  {
    keys: ["Space"],
    title: "Bật / Dừng thu âm / Nói lại",
    description: "Bấm 1 lần để mở Mic. Bấm lại để dừng thu và gửi AI chấm điểm. Khi xem điểm, bấm Space để làm lại câu.",
    contextBadge: "Sentence Builder",
    category: "sentence_builder",
  },
  {
    keys: ["Backspace"],
    title: "Xoá câu nói dở (Nói lại từ đầu)",
    description: "Xoá sạch phụ đề đang nói dở ngay lập tức mà Micro vẫn giữ mở để bạn nói lại từ đầu trôi chảy.",
    contextBadge: "Khi đang thu âm",
    category: "sentence_builder",
  },
  {
    keys: ["H"],
    title: "Mở khay gợi ý 5 tầng",
    description: "Mở danh sách gợi ý cấp độ từ Từ khoá $\\rightarrow$ Khung câu $\\rightarrow$ Mẫu câu bản xứ.",
    contextBadge: "Sentence Builder",
    category: "sentence_builder",
  },
  {
    keys: ["Enter"],
    title: "Chuyển câu tiếp theo",
    description: "Sau khi xem xong điểm và giải thích ngữ pháp, bấm Enter để chuyển ngay sang câu tiếp theo.",
    contextBadge: "Khi có kết quả",
    category: "sentence_builder",
  },

  // Conversation AI
  {
    keys: ["Space"],
    title: "Bật / Tắt Mic đàm thoại",
    description: "Bật micro để trò chuyện với đối tác AI và ngắt micro để AI phản hồi tức thì.",
    contextBadge: "Hội thoại trực tiếp",
    category: "conversation",
  },
  {
    keys: ["T"],
    title: "Phát lại giọng đọc AI",
    description: "Nghe lại lời thoại gần nhất của AI theo giọng chuẩn người bản xứ.",
    contextBadge: "Hội thoại trực tiếp",
    category: "conversation",
  },
  {
    keys: ["H"],
    title: "Gợi ý phản xạ đối đáp",
    description: "Hiển thị 3 phương án gợi ý trả lời tự nhiên theo ngữ cảnh hội thoại hiện tại.",
    contextBadge: "Hội thoại trực tiếp",
    category: "conversation",
  },

  // Shadowing & Survival Speaking
  {
    keys: ["Space"],
    title: "Thu âm nhại giọng (Shadowing)",
    description: "Bắt đầu thu âm và nhại theo ngữ điệu (intonation & rhythm) của câu mẫu bản xứ.",
    contextBadge: "Shadowing",
    category: "shadowing",
  },
  {
    keys: ["P"],
    title: "Nghe câu mẫu bản xứ",
    description: "Nghe đi nghe lại câu gốc tiếng Anh để bắt nhịp ngữ điệu trước khi nói.",
    contextBadge: "Shadowing",
    category: "shadowing",
  },
  {
    keys: ["R"],
    title: "Thử lại lượt mới",
    description: "Làm lại lượt luyện tập để nâng cao độ khớp âm và ngữ điệu.",
    contextBadge: "Shadowing & Survival",
    category: "shadowing",
  },

  // Global Navigation
  {
    keys: ["?"],
    title: "Mở bảng tra cứu phím tắt",
    description: "Mở hoặc đóng cửa sổ tra cứu phím tắt này ở bất kỳ đâu trong toàn bộ ứng dụng.",
    contextBadge: "Toàn cục",
    category: "global",
  },
  {
    keys: ["Esc"],
    title: "Đóng cửa sổ / Thoát Studio",
    description: "Đóng các khay gợi ý, cửa sổ pop-up hoặc thoát phòng tập ra màn hình chọn chế độ.",
    contextBadge: "Toàn cục",
    category: "global",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeybindingsModal({ open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<
    "all" | "sentence_builder" | "conversation" | "shadowing" | "global"
  >("all");

  const filtered =
    activeTab === "all"
      ? KEYBINDINGS
      : KEYBINDINGS.filter((item) => item.category === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Keyboard className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>Phím Tắt Hệ Thống (Keybindings)</span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  Hands-Free Studio
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Luyện nói siêu tốc, không cần dùng chuột để duy trì phản xạ tự nhiên nhất
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b border-border/40 bg-muted/10 overflow-x-auto text-xs">
          <Button
            size="sm"
            variant={activeTab === "all" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("all")}
            className="rounded-xl h-8 text-xs font-semibold px-3"
          >
            Tất cả phím tắt ({KEYBINDINGS.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "sentence_builder" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("sentence_builder")}
            className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <Sparkles className="size-3 text-primary" />
            <span>Sentence Builder</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === "conversation" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("conversation")}
            className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <MessageSquare className="size-3 text-indigo-500" />
            <span>Hội thoại Live</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === "shadowing" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("shadowing")}
            className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <Flame className="size-3 text-amber-500" />
            <span>Shadowing</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === "global" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("global")}
            className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <Compass className="size-3 text-emerald-500" />
            <span>Toàn cục</span>
          </Button>
        </div>

        {/* Shortcut List View */}
        <div className="p-5 max-h-[52vh] overflow-y-auto space-y-2.5 divide-y divide-border/30">
          {filtered.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="pt-2.5 first:pt-0 flex items-start justify-between gap-4 group"
            >
              <div className="space-y-1 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground px-1.5 py-0">
                    {item.contextBadge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Visual Keyboard Badges */}
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-8 h-7 px-2.5 rounded-lg bg-muted border border-border/80 text-foreground font-mono text-xs font-bold shadow-2xs group-hover:border-primary/40 group-hover:bg-primary/5 transition-all"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Pro Tip */}
        <div className="p-3.5 px-5 bg-muted/40 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <Zap className="size-3.5 text-amber-500" />
            <span>Mẹo: Nhấn <kbd className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-card border border-border/80">?</kbd> ở bất kỳ đâu để bật tắt bảng này</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs rounded-xl"
          >
            Đóng [Esc]
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
