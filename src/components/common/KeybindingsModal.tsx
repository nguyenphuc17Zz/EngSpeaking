"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useSettingsStore, type VocabularyKeybindings } from "@/stores/settings-store";
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
  BookOpen,
  RotateCcw,
  Target,
  ShieldAlert,
  Pencil,
  Check,
} from "lucide-react";

type KeybindingCategory =
  | "all"
  | "vocabulary"
  | "sentence_builder"
  | "foundation_practice"
  | "shadowing"
  | "conversation"
  | "global";

interface KeybindingItem {
  keys: string[];
  title: string;
  description: string;
  contextBadge: string;
  category: KeybindingCategory;
  actionKey?: keyof VocabularyKeybindings;
}

function formatKeyCode(code?: string): string {
  if (!code) return "";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "Enter") return "Enter";
  if (code === "Backspace") return "Backspace";
  if (code === "Escape") return "Esc";
  if (code === "Delete") return "Del";
  return code;
}

function resolveCategoryFromPath(pathname: string): KeybindingCategory {
  if (pathname.includes("/vocabulary")) return "vocabulary";
  if (pathname.includes("/sentence-builder")) return "sentence_builder";
  if (
    pathname.includes("/vn-to-en") ||
    pathname.includes("/chunks") ||
    pathname.includes("/survival") ||
    pathname.includes("/latency") ||
    pathname.includes("/retry-lab")
  ) {
    return "foundation_practice";
  }
  if (pathname.includes("/shadowing")) return "shadowing";
  if (
    pathname.includes("/conversation") ||
    pathname.includes("/advanced") ||
    pathname === "/session"
  ) {
    return "conversation";
  }
  return "all";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeybindingsModal({ open, onOpenChange }: Props) {
  const pathname = usePathname() || "";
  const currentRoomCategory = resolveCategoryFromPath(pathname);

  const [activeTab, setActiveTab] = useState<KeybindingCategory>("all");
  const [rebindingAction, setRebindingAction] = useState<keyof VocabularyKeybindings | null>(null);

  const tabBarRef = useRef<HTMLDivElement | null>(null);

  const vocabKeys = useSettingsStore((s) => s.vocabularyKeybindings);
  const setVocabKey = useSettingsStore((s) => s.setVocabularyKeybinding);
  const resetVocabKeys = useSettingsStore((s) => s.resetVocabularyKeybindings);

  // Khi modal mở lên, tự động chọn tab của phòng mà người dùng đang đứng
  useEffect(() => {
    if (open) {
      setActiveTab(currentRoomCategory);
      setRebindingAction(null);
    }
  }, [open, currentRoomCategory]);

  // Lắng nghe sự kiện bàn phím khi người dùng đang bấm "Đổi phím"
  useEffect(() => {
    if (!rebindingAction) return;

    const handleRebindKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        setRebindingAction(null);
        toast.info("Đã hủy đổi phím tắt");
        return;
      }

      // Gán phím mới vào store
      setVocabKey(rebindingAction, e.code);
      const displayKey = formatKeyCode(e.code);
      toast.success(`Đã đổi phím tắt thành công: [${displayKey}]`);
      setRebindingAction(null);
    };

    window.addEventListener("keydown", handleRebindKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleRebindKeyDown, { capture: true });
  }, [rebindingAction, setVocabKey]);

  // Cuộn con lăn chuột ngang trên thanh Tabs
  const handleTabWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const wordKey = formatKeyCode(vocabKeys?.playWord) || "A";
  const sentenceKey = formatKeyCode(vocabKeys?.playSentence) || "S";
  const clearKey = formatKeyCode(vocabKeys?.clearSpeech) || "Z";
  const prevKey = formatKeyCode(vocabKeys?.previousWord) || "Q";
  const micKey = formatKeyCode(vocabKeys?.toggleMic) || "Space";
  const submitKey = formatKeyCode(vocabKeys?.submitOrNext) || "Enter";
  const hintsKey = formatKeyCode(vocabKeys?.toggleHints) || "H";
  const randomKey = formatKeyCode(vocabKeys?.randomWord) || "R";
  const step1Key = formatKeyCode(vocabKeys?.step1) || "1";
  const step2Key = formatKeyCode(vocabKeys?.step2) || "2";

  const keybindings: KeybindingItem[] = [
    // ── 1. Spoken Vocabulary Studio (Tùy biến được phím) ──
    {
      keys: [wordKey],
      title: "Nghe phát âm từ vựng (TTS)",
      description: "Nghe lại âm thanh chuẩn người bản xứ của từ vựng tiếng Anh hiện tại bất cứ lúc nào.",
      contextBadge: "Từ vựng Studio",
      category: "vocabulary",
      actionKey: "playWord",
    },
    {
      keys: [sentenceKey],
      title: "Nghe câu ngữ cảnh mẫu",
      description: "Phát âm câu ngữ cảnh thực tế (ở Bước 2) hoặc phát âm từ vựng để luyện nghe nhại ngữ điệu.",
      contextBadge: "Bước 2 (Ngữ cảnh)",
      category: "vocabulary",
      actionKey: "playSentence",
    },
    {
      keys: [clearKey, "Del"],
      title: "Xoá câu nói dở / Xoá câu vừa nói",
      description: "Xóa ngay phụ đề câu đang nói dở khi thu âm, hoặc xóa nội dung nhận diện ở màn hình xem trước để nói lại từ đầu trôi chảy.",
      contextBadge: "Khi đang nói / Xem lại",
      category: "vocabulary",
      actionKey: "clearSpeech",
    },
    {
      keys: [prevKey],
      title: "Quay lại từ trước đó (Khi bấm lộn từ)",
      description: "Lập tức quay lại từ vựng vừa học liền trước nếu bạn vô tình bấm nhầm sang từ tiếp theo.",
      contextBadge: "Khi học từ",
      category: "vocabulary",
      actionKey: "previousWord",
    },
    {
      keys: [micKey],
      title: "Bật / Dừng thu âm mic / Thu lại",
      description: "Bấm 1 lần để bật micro luyện nói từ hoặc câu ngữ cảnh. Bấm lại để dừng thu âm. Khi xem kết quả, bấm Space để làm lại.",
      contextBadge: "Từ vựng Studio",
      category: "vocabulary",
      actionKey: "toggleMic",
    },
    {
      keys: [submitKey],
      title: "Nộp bài chấm điểm / Tiếp tục",
      description: "Nộp câu nói cho AI đánh giá âm vị & trọng âm, hoặc chuyển nhanh sang bước tiếp theo sau khi xem điểm.",
      contextBadge: "Khi có câu nói / Kết quả",
      category: "vocabulary",
      actionKey: "submitOrNext",
    },
    {
      keys: [hintsKey],
      title: "Mở khay gợi ý phản xạ 4 tầng",
      description: "Bật/tắt khay gợi ý từ vựng, collocations liên kết và khung câu bản xứ.",
      contextBadge: "Từ vựng Studio",
      category: "vocabulary",
      actionKey: "toggleHints",
    },
    {
      keys: [randomKey],
      title: "Đổi từ vựng ngẫu nhiên mới",
      description: "Chuyển sang từ vựng tiếp theo trong kho từ vựng Oxford/CEFR 10.000+ từ.",
      contextBadge: "Từ vựng Studio",
      category: "vocabulary",
      actionKey: "randomWord",
    },
    {
      keys: [step1Key, step2Key],
      title: "Chuyển nhanh Bước 1 ↔ Bước 2",
      description: "Nhấn 1 để luyện phát âm từ & IPA; nhấn 2 để luyện nói câu ngữ cảnh & collocations.",
      contextBadge: "Từ vựng Studio",
      category: "vocabulary",
      actionKey: "step1",
    },
    {
      keys: ["Ctrl", "K"],
      title: "Tra cứu bất kỳ từ vựng nào bằng AI",
      description: "Mở thanh tìm kiếm tra cứu bất kỳ từ tiếng Anh nào — AI tự động phân tích IPA, trọng âm, nghĩa tiếng Việt và tạo 3 câu ngữ cảnh.",
      contextBadge: "Toàn Studio",
      category: "vocabulary",
    },

    // ── 2. Sentence Builder ──
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
      description: "Mở danh sách gợi ý cấp độ từ Từ khoá → Khung câu → Mẫu câu bản xứ.",
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
    {
      keys: ["R"],
      title: "Bỏ qua / Đổi câu ngẫu nhiên",
      description: "Bỏ qua câu hiện tại hoặc đổi câu mới trong danh mục đang luyện.",
      contextBadge: "Sentence Builder",
      category: "sentence_builder",
    },

    // ── 3. Luyện phản xạ & Khẩu ngữ (VN→EN, Chunks, Survival, Latency, Repair) ──
    {
      keys: ["Space"],
      title: "Bật / Dừng thu âm phản xạ / Thử lại",
      description: "Bật micro để phản xạ nhanh bằng tiếng Anh. Bấm lại để dừng thu và nhận điểm số AI ngay lập tức.",
      contextBadge: "VN→EN / Chunks / Latency / Survival",
      category: "foundation_practice",
    },
    {
      keys: ["Backspace", "Del"],
      title: "Xoá phụ đề nói dở (Nói lại từ đầu)",
      description: "Xóa sạch văn bản nói dở mà không cần tắt micro để bạn bình tĩnh nói lại trôi chảy.",
      contextBadge: "Khi đang thu âm",
      category: "foundation_practice",
    },
    {
      keys: ["H"],
      title: "Mở tầng gợi ý tiếp theo (5 tầng)",
      description: "Kích hoạt nấc gợi ý tiếp theo: từ khóa chính → cấu trúc khung → mẫu câu gợi mở trọn vẹn.",
      contextBadge: "Phản xạ đa tầng",
      category: "foundation_practice",
    },
    {
      keys: ["Enter"],
      title: "Nộp bài chấm điểm / Chuyển câu",
      description: "Xác nhận nộp câu nói cho AI phân tích hoặc chuyển sang bài tập tiếp theo sau khi xem nhận xét.",
      contextBadge: "Khi có câu nói / Kết quả",
      category: "foundation_practice",
    },
    {
      keys: ["R"],
      title: "Bỏ qua / Đổi bài tập mới",
      description: "Chuyển bài tập tiếp theo trong kho phản xạ tình huống thực tế.",
      contextBadge: "Luyện phản xạ",
      category: "foundation_practice",
    },
    {
      keys: ["Esc"],
      title: "Thu gọn gợi ý / Thoát phòng",
      description: "Thu gọn khay gợi ý đang mở hoặc thoát phòng luyện về màn hình tổng quan.",
      contextBadge: "Điều hướng",
      category: "foundation_practice",
    },

    // ── 4. Shadowing Studio ──
    {
      keys: ["Space"],
      title: "Phát / Tạm dừng video câu mẫu",
      description: "Phát hoặc tạm dừng câu mẫu người bản xứ trong video để bắt nhịp hơi thở và ngữ điệu.",
      contextBadge: "Shadowing Studio",
      category: "shadowing",
    },
    {
      keys: ["Enter"],
      title: "Thu âm nhại giọng (Shadowing)",
      description: "Bắt đầu thu âm và nhại theo ngữ điệu (intonation & rhythm) của câu mẫu bản xứ.",
      contextBadge: "Shadowing Studio",
      category: "shadowing",
    },
    {
      keys: ["P"],
      title: "Nghe câu mẫu bản xứ",
      description: "Nghe đi nghe lại câu gốc tiếng Anh để bắt nhịp ngữ điệu trước khi nói.",
      contextBadge: "Shadowing Studio",
      category: "shadowing",
    },
    {
      keys: ["R"],
      title: "Thử lại lượt mới",
      description: "Làm lại lượt luyện tập để nâng cao độ khớp âm và ngữ điệu.",
      contextBadge: "Shadowing Studio",
      category: "shadowing",
    },
    {
      keys: ["←", "→"],
      title: "Đoạn câu trước / Đoạn câu tiếp theo",
      description: "Nhảy lùi về đoạn câu trước hoặc tiến sang câu tiếp theo trong video bài học.",
      contextBadge: "Duyệt câu nhại",
      category: "shadowing",
    },

    // ── 5. Hội thoại AI & Luyện nói Live ──
    {
      keys: ["Space"],
      title: "Bật / Tắt Mic & Ngắt lời AI (Barge-in)",
      description: "Bật mic để nói chuyện với AI. Khi AI đang nói, bấm Space để ngắt lời lập tức (<50ms) và giành quyền nói tự nhiên như giao tiếp thực tế.",
      contextBadge: "Hội thoại Live & Barge-in",
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
      title: "Gợi ý phản xạ đối đáp (3 phương án)",
      description: "Hiển thị 3 phương án gợi ý trả lời tự nhiên theo ngữ cảnh hội thoại hiện tại.",
      contextBadge: "Hội thoại trực tiếp",
      category: "conversation",
    },
    {
      keys: ["Esc"],
      title: "Đóng gợi ý / Kết thúc lượt nói",
      description: "Đóng khay gợi ý đối đáp an toàn mà không làm gián đoạn buổi đàm thoại.",
      contextBadge: "Hội thoại trực tiếp",
      category: "conversation",
    },

    // ── 6. Toàn cục (Global) ──
    {
      keys: ["+", "-"],
      title: "Tăng / Giảm tốc độ nói",
      description: "Nhấn '+' để tăng nhanh tốc độ nói và '-' để giảm tốc độ (5 nấc: 0.6x ↔ 0.75x ↔ 0.9x ↔ 1.0x ↔ 1.25x).",
      contextBadge: "Toàn cục",
      category: "global",
    },
    {
      keys: ["?"],
      title: "Mở bảng tra cứu phím tắt",
      description: "Mở hoặc đóng cửa sổ tra cứu phím tắt này ở bất kỳ đâu trong toàn bộ ứng dụng.",
      contextBadge: "Toàn cục",
      category: "global",
    },
    {
      keys: ["Ctrl", "K"],
      title: "Thanh tìm kiếm & Điều hướng",
      description: "Mở thanh tra cứu nhanh từ vựng, bài học hoặc phòng chức năng bất kỳ.",
      contextBadge: "Toàn cục",
      category: "global",
    },
    {
      keys: ["Esc"],
      title: "Đóng cửa sổ / Thu gọn gợi ý",
      description: "Đóng các khay gợi ý hoặc cửa sổ pop-up đang mở một cách an toàn mà không làm thoát bài học.",
      contextBadge: "Toàn cục",
      category: "global",
    },
  ];

  const filtered =
    activeTab === "all"
      ? keybindings
      : keybindings.filter((item) => item.category === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl h-[88vh] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="shrink-0 p-5 pb-3 border-b border-border/40 bg-muted/20">
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

        {/* Tab Navigation with Smart Active Detection & Horizontal Wheel Scroll */}
        <div
          ref={tabBarRef}
          onWheel={handleTabWheel}
          className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 border-b border-border/40 bg-muted/10 overflow-x-auto overscroll-contain scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30 text-xs select-none"
        >
          <Button
            size="sm"
            variant={activeTab === "all" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("all")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 shrink-0"
          >
            Tất cả ({keybindings.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "vocabulary" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("vocabulary")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <BookOpen className="size-3 text-emerald-500" />
            <span>Từ vựng</span>
            {currentRoomCategory === "vocabulary" && (
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" title="Phòng hiện tại" />
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "sentence_builder" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("sentence_builder")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <Sparkles className="size-3 text-primary" />
            <span>Sentence Builder</span>
            {currentRoomCategory === "sentence_builder" && (
              <span className="size-1.5 rounded-full bg-primary animate-pulse" title="Phòng hiện tại" />
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "foundation_practice" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("foundation_practice")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <Target className="size-3 text-amber-500" />
            <span>Phản xạ & Khẩu ngữ</span>
            {currentRoomCategory === "foundation_practice" && (
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" title="Phòng hiện tại" />
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "shadowing" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("shadowing")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <Flame className="size-3 text-rose-500" />
            <span>Shadowing</span>
            {currentRoomCategory === "shadowing" && (
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" title="Phòng hiện tại" />
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "conversation" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("conversation")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <MessageSquare className="size-3 text-indigo-500" />
            <span>Hội thoại Live</span>
            {currentRoomCategory === "conversation" && (
              <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse" title="Phòng hiện tại" />
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "global" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("global")}
            className="rounded-xl h-8 text-xs font-semibold px-2.5 gap-1.5 shrink-0"
          >
            <Compass className="size-3 text-blue-500" />
            <span>Toàn cục</span>
          </Button>
        </div>

        {/* Shortcut List View with Smooth Native Vertical Scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-2.5 divide-y divide-border/30 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30">
          {filtered.map((item, index) => {
            const isRebinding = item.actionKey && rebindingAction === item.actionKey;

            return (
              <div
                key={`${item.title}-${index}`}
                className="pt-2.5 first:pt-0 flex items-start justify-between gap-4 group"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2 flex-wrap">
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

                {/* Visual Keyboard Badges + Inline Rebinding Action */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {isRebinding ? (
                    <div className="flex items-center gap-1.5 animate-pulse bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 rounded-xl text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold shadow-xs">
                      <Sparkles className="size-3 animate-spin" />
                      <span>Nhấn phím mới... (Esc để hủy)</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="inline-flex items-center justify-center min-w-8 h-7 px-2.5 rounded-lg bg-muted border border-border/80 text-foreground font-mono text-xs font-bold shadow-2xs group-hover:border-primary/40 group-hover:bg-primary/5 transition-all"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>

                      {/* Nút Đổi Phím Cho Phép Tùy Biến Nhanh */}
                      {item.actionKey && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRebindingAction(item.actionKey!)}
                          className="h-7 px-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors gap-1"
                          title="Bấm để đổi phím tắt này theo ý bạn"
                        >
                          <Pencil className="size-3 text-muted-foreground group-hover:text-primary" />
                          <span className="hidden sm:inline">Đổi phím</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Pro Tip + Reset Button */}
        <div className="shrink-0 p-3.5 px-5 bg-muted/40 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <Zap className="size-3.5 text-amber-500" />
            <span>Mẹo: Nhấn nút <span className="font-semibold text-foreground">Đổi phím</span> để gán bất kỳ phím nào bạn muốn</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetVocabKeys();
                toast.success("Đã khôi phục phím tắt mặc định (A, S, Z, Q)");
              }}
              className="h-7 text-xs rounded-xl gap-1"
              title="Khôi phục phím tắt phòng từ vựng về mặc định (A, S, Z, Q)"
            >
              <RotateCcw className="size-3" />
              <span>Khôi phục mặc định</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-7 text-xs rounded-xl"
            >
              Đóng [Esc]
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
