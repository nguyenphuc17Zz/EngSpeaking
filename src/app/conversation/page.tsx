"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  Shuffle,
  Wand2,
  Loader2,
  Globe,
  Briefcase,
  Plane,
  MessageCircle,
  Users,
  GraduationCap,
  Scale,
  BookOpen,
  Mic2,
  ArrowLeft,
  Sparkles,
  Zap,
  Target,
  Shield,
  Heart,
  Settings2,
  Compass,
  ChevronDown,
  Check,
  Coffee,
  HeartPulse,
  History,
} from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";
import type { ConversationMode, ConversationSettings } from "@/types/conversation-world";
import type { ConversationSessionMode } from "@/types/conversation";
import { cn } from "@/lib/utils";
import { PRESET_TOPICS, getTopicDisplay, resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Coffee,
  Briefcase,
  Plane,
  MessageCircle,
  Users,
  GraduationCap,
  HeartPulse,
};

const SESSION_MODES: Array<{ id: ConversationSessionMode; label: string; desc: string }> = [
  { id: "endless", label: "Endless", desc: "Tự do" },
  { id: "quick", label: "Quick 6", desc: "6 turns" },
  { id: "standard", label: "Standard 12", desc: "12 turns" },
  { id: "deep", label: "Deep 20", desc: "20 turns" },
];

interface ModeItem {
  id: ConversationMode;
  label: string;
  category: "all" | "workplace" | "interview" | "daily" | "travel" | "advanced" | "custom";
  desc: string;
  level: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  defaultRole: string;
  defaultGoal: string;
}

const MODES: ModeItem[] = [
  {
    id: "free",
    label: "Tự Do (Free Speech)",
    category: "daily",
    desc: "Trò chuyện cởi mở, không giới hạn chủ đề với AI Coach",
    level: "Mọi cấp độ",
    icon: MessageCircle,
    color: "text-primary bg-primary/10",
    defaultRole: "Người bạn quốc tế thân thiện",
    defaultGoal: "Giao lưu, chia sẻ suy nghĩ và luyện phản xạ tự nhiên.",
  },
  {
    id: "workplace",
    label: "Công Sở & Dự Án (Workplace)",
    category: "workplace",
    desc: "Họp nhóm, thảo luận tiến độ sprint, báo cáo tiến độ",
    level: "B1 - B2",
    icon: Briefcase,
    color: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
    defaultRole: "Quản lý dự án kỹ thuật (Tech PM)",
    defaultGoal: "Báo cáo tiến độ và đề xuất giải pháp xử lý blocker.",
  },
  {
    id: "interview",
    label: "Phỏng Vấn Xin Việc (Interview)",
    category: "interview",
    desc: "Câu hỏi tình huống STAR, giới thiệu bản thân và kinh nghiệm",
    level: "B2 - C1",
    icon: GraduationCap,
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
    defaultRole: "Giám đốc tuyển dụng (Hiring Manager)",
    defaultGoal: "Trình bày năng lực chuyên môn và trả lời tự tin.",
  },
  {
    id: "professional",
    label: "Đàm Phán & Thuyết Phục (Pro)",
    category: "workplace",
    desc: "Đàm phán lương thưởng, hợp đồng và quyền lợi",
    level: "B2 - C1",
    icon: Target,
    color: "text-rose-700 dark:text-rose-400 bg-rose-500/10",
    defaultRole: "Giám đốc Nhân sự (HR Director)",
    defaultGoal: "Thuyết phục tăng ngân sách hoặc phúc lợi hợp lý.",
  },
  {
    id: "daily_life",
    label: "Đời Sống & Mua Sắm (Daily)",
    category: "daily",
    desc: "Gọi món nhà hàng, mua sắm siêu thị, hỏi đường phố",
    level: "A2 - B1",
    icon: Globe,
    color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
    defaultRole: "Nhân viên phục vụ bản địa",
    defaultGoal: "Đặt món ăn đúng sở thích và hỏi hóa đơn.",
  },
  {
    id: "travel",
    label: "Du Lịch & Khách Sạn (Travel)",
    category: "travel",
    desc: "Check-in sân bay, đổi phòng khách sạn, xử lý sự cố hành lý",
    level: "B1 - B2",
    icon: Plane,
    color: "text-sky-700 dark:text-sky-400 bg-sky-500/10",
    defaultRole: "Lễ tân khách sạn 5 sao",
    defaultGoal: "Báo cáo sự cố phòng và yêu cầu đổi phòng hướng biển.",
  },
  {
    id: "social",
    label: "Giao Tiếp Xã Hội (Social)",
    category: "daily",
    desc: "Kết bạn tại tiệc tùng, sự kiện networking và tán gẫu",
    level: "B1 - B2",
    icon: Users,
    color: "text-primary bg-primary/10",
    defaultRole: "Người quen mới tại sự kiện Networking",
    defaultGoal: "Bắt chuyện tự nhiên, trao đổi thông tin liên lạc.",
  },
  {
    id: "debate",
    label: "Tranh Luận & Phản Biện (Debate)",
    category: "advanced",
    desc: "Bảo vệ luận điểm, phản biện quan điểm đối lập sắc bén",
    level: "B2 - C1",
    icon: Scale,
    color: "text-amber-800 dark:text-amber-300 bg-amber-500/10",
    defaultRole: "Đối thủ tranh biện giàu kinh nghiệm",
    defaultGoal: "Đưa ra lập luận logic và dẫn chứng thuyết phục.",
  },
  {
    id: "presentation",
    label: "Thuyết Trình & Pitching (Pitch)",
    category: "advanced",
    desc: "Trình bày ý tưởng kinh doanh và trả lời chất vấn Q&A",
    level: "B2 - C1",
    icon: Mic2,
    color: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
    defaultRole: "Nhà đầu tư khó tính (Angel Investor)",
    defaultGoal: "Pitch sản phẩm trong 3 phút và trả lời phản biện.",
  },
  {
    id: "storytelling",
    label: "Kể Chuyện Cảm Xúc (Story)",
    category: "advanced",
    desc: "Kể lại kỷ niệm đáng nhớ, chuyến đi hoặc bài học cuộc sống",
    level: "B1 - B2",
    icon: BookOpen,
    color: "text-emerald-800 dark:text-emerald-300 bg-emerald-500/10",
    defaultRole: "Người lắng nghe tò mò, thích khám phá",
    defaultGoal: "Truyền tải mạch chuyện lôi cuốn và cảm xúc chân thật.",
  },
  {
    id: "ai_generated",
    label: "AI Tự Tạo (Custom Prompt)",
    category: "custom",
    desc: "Tự tạo kịch bản theo bất kỳ ý tưởng hoặc tình huống nào bạn muốn",
    level: "Tùy biến",
    icon: Wand2,
    color: "text-primary bg-primary/10",
    defaultRole: "Nhân vật AI theo mô tả của bạn",
    defaultGoal: "Tự do khám phá theo prompt bạn nhập.",
  },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "workplace", label: "Công sở" },
  { id: "interview", label: "Phỏng vấn" },
  { id: "daily", label: "Đời sống" },
  { id: "travel", label: "Du lịch" },
  { id: "advanced", label: "Tranh luận & Pitch" },
  { id: "custom", label: "Tự tạo" },
];

export default function ConversationModesPage() {
  const router = useRouter();
  const { setWorld, setTurns, setSummary, setGeneratingWorld } = useConversationStore();
  const settings = useSettingsStore();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedModeId, setSelectedModeId] = useState<ConversationMode>("workplace");
  const [difficulty, setDifficulty] = useState("auto");
  const [surprise, setSurprise] = useState("medium");
  const [conflict, setConflict] = useState("low");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState("");
  const {
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
    sessionMode,
    setSessionMode,
    initSession,
  } = useConversationStore();

  const selectedMode = MODES.find((m) => m.id === selectedModeId) || MODES[0];

  const filteredModes =
    activeCategory === "all"
      ? MODES
      : MODES.filter((m) => m.category === activeCategory);

  const targetCounts: Record<ConversationSessionMode, number> = { endless: 0, quick: 6, standard: 12, deep: 20 };
  const buildSettings = (modeOverride?: ConversationMode): ConversationSettings => ({
    mode: modeOverride || selectedModeId,
    difficulty: difficulty as ConversationSettings["difficulty"],
    duration: "10 min",
    durationMinutes: 10,
    characterStyle: "auto",
    surpriseLevel: surprise as ConversationSettings["surpriseLevel"],
    conflictIntensity: conflict as ConversationSettings["conflictIntensity"],
    pressure: "normal",
    topic: resolveTopicForPrompt(selectedTopicId, customTopicText),
    setting: "auto",
    aiPrompt: aiPrompt || undefined,
    sessionMode,
    targetCount: targetCounts[sessionMode],
    prepTimeSec: 2.5,
  });

  const handleLaunchWorld = async (modeOverride?: ConversationMode) => {
    setLoading(true);
    setGeneratingWorld(true);
    toast.info("Đang tạo kịch bản thế giới AI...", "Thiết kế nhân vật và mục tiêu phản xạ.");
    try {
      const s = buildSettings(modeOverride);
      // Inject Spoken Memory (aligned SB/VN-EN/Survival/Drill)
      let recentErrors: string[] = [];
      let pedagogicalConstraint: string | undefined;
      try {
        const { getCompactErrorContextPack, buildErrorBankPedagogicalPrompt } = await import(
          "@/lib/foundation/error-bank/error-bank.service"
        );
        const pack = getCompactErrorContextPack();
        recentErrors = pack.topWeaknesses.map((w) => w.patternKey || w.labelVi).filter(Boolean);
        pedagogicalConstraint = buildErrorBankPedagogicalPrompt() || undefined;
      } catch {}
      const provider =
        settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider;
      const model = settings.conversation.model;

      const res = await fetch("/api/conversation/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ...s, recentErrors, pedagogicalConstraint },
          provider,
          model,
        }),
      });
      const data = await res.json();
      if (data.scenario) {
        const worldState = {
          scenario: data.scenario,
          currentObjective: data.scenario.userGoal,
          currentTopic: data.scenario.topic,
          activeCharacter: {
            mood: "friendly",
            trust: 60,
            patience: 70,
            engagement: 65,
            name: data.scenario.character.name,
            role: data.scenario.character.role,
          },
          conversationFacts: [],
          unresolvedThreads: [],
          activeEvents: [],
          turnCount: 0,
          surpriseLevel: s.surpriseLevel,
          pressure: s.pressure,
        };
        setWorld(
          worldState as unknown as import("@/types/conversation-world").ConversationWorldState
        );
        setTurns([]);
        setSummary(null);
        initSession(sessionMode);
        if (typeof window !== "undefined")
          localStorage.setItem("conversation_world_id", data.worldId);
        toast.success("Kịch bản sẵn sàng!", `Vào vai đối thoại: ${data.scenario.character.role}`);
        router.push("/conversation/session");
      }
    } catch {
      toast.error("Lỗi khởi tạo", "Không thể tạo kịch bản lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setGeneratingWorld(false);
    }
  };

  const handleRandomLaunch = () => {
    const randomItem = MODES[Math.floor(Math.random() * MODES.length)];
    setSelectedModeId(randomItem.id);
    handleLaunchWorld(randomItem.id);
  };

  return (
    <div className="flex flex-col w-full select-none gap-3 sm:gap-3.5 animate-in fade-in-0 duration-200">
      {/* ── TOP TOOLBAR FULL WIDTH (Compact Single Row) ── */}
      <div className="flex items-center justify-between gap-2.5 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-3.5 py-2.5 shadow-xs w-full">
        {/* Left: Back + Title + Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
              title="Quay lại Trang chủ"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7.5 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Globe className="size-4" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Thế Giới Giao Tiếp AI
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex rounded-full px-2">
              11+ Kịch Bản
            </Badge>
          </div>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/60">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right: History + Random Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/conversation/history">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80 hover:bg-muted/50"
            >
              <History className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Lịch sử</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomLaunch}
            disabled={loading}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80 hover:bg-muted/50"
            title="Chọn ngẫu nhiên tình huống"
          >
            <Shuffle className="size-3.5 text-primary" />
            <span>Ngẫu Nhiên</span>
          </Button>
        </div>
      </div>

      {/* ── 2-COLUMN FULL-WIDTH GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full items-start">
        {/* CỘT TRÁI (7 COLS): CHỌN TÌNH HUỐNG (Lưới 3 Cột trên màn hình rộng) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
            <span className="font-serif font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <span className="size-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-mono font-bold">
                1
              </span>
              <span>Chọn Tình Huống Nhập Vai</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono bg-secondary/80 px-2.5 py-0.5 rounded-full border border-border/50">
              {filteredModes.length} kịch bản
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredModes.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedModeId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModeId(m.id)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative group select-none shadow-xs",
                    isSelected
                      ? "border-primary bg-primary/[0.04] ring-2 ring-primary/40 shadow-sm"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("size-8.5 rounded-xl flex items-center justify-center shrink-0 border border-border/40", m.color)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {m.label}
                        </h4>
                        <span className="text-[10px] font-mono text-muted-foreground block truncate">
                          {m.level}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge className="text-[9px] font-mono px-1.5 py-0 bg-primary text-primary-foreground font-semibold shrink-0">
                        Đang chọn
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {m.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): BLUEPRINT & CẤU HÌNH PHIÊN */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5">
            {/* Header Preview Banner (Compact) */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 border border-border/50", selectedMode.color)}>
                  <selectedMode.icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif font-bold text-xs sm:text-sm text-foreground truncate">
                      {selectedMode.label}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 rounded-md">
                      {selectedMode.level}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{selectedMode.desc}</p>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-card border border-border/50 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Users className="size-3 text-primary shrink-0" />
                  <span className="font-medium">Nhân vật:</span>
                  <span className="font-semibold text-foreground truncate">{selectedMode.defaultRole}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Target className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-medium">Mục tiêu:</span>
                  <span className="text-foreground truncate">{selectedMode.defaultGoal}</span>
                </div>
              </div>
            </div>

            {/* Custom Prompt Textarea if ai_generated */}
            {selectedModeId === "ai_generated" && (
              <div className="space-y-1">
                <label className="text-xs font-serif font-bold text-foreground">
                  Mô tả tình huống bạn muốn (Prompt)
                </label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ví dụ: Tôi là kỹ sư phần mềm muốn xin sếp cho làm việc từ xa 2 ngày/tuần..."
                  rows={2}
                  className="text-xs bg-background rounded-xl resize-none p-2.5 border-border/80 focus:border-primary"
                />
              </div>
            )}

            {/* Topic selector (Grounding Context) */}
            <div className="space-y-1">
              <span className="text-xs font-serif font-bold text-foreground block">
                Chủ đề neo bối cảnh (Grounding)
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomInputVal(customTopicText || "");
                  setIsTopicModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/30 text-foreground text-xs font-mono transition-all cursor-pointer"
              >
                <Compass className="size-3.5 text-primary shrink-0" />
                <span className="truncate font-medium flex-1 text-left">
                  {getTopicDisplay(resolveTopicForPrompt(selectedTopicId, customTopicText)).label}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            </div>

            {/* Session mode (endless/quick/standard/deep) */}
            <div className="space-y-1.5">
              <span className="text-xs font-serif font-bold text-foreground block">
                Chế độ phiên
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {SESSION_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSessionMode(m.id)}
                    title={m.desc}
                    className={cn(
                      "text-[11px] font-semibold py-1.5 px-1 rounded-xl border transition-all cursor-pointer text-center",
                      sessionMode === m.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "border-border/70 text-muted-foreground hover:text-foreground bg-background"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Parameters Grid: Độ khó, Bất ngờ, Xung đột */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Độ khó phản xạ
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "auto", label: "Tự động" },
                    { id: "b1", label: "B1 (Vừa)" },
                    { id: "b2", label: "B2 (Cao)" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "text-xs font-semibold py-1 px-2 rounded-xl border transition-all cursor-pointer text-center",
                        difficulty === d.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                          : "border-border/70 text-muted-foreground hover:text-foreground bg-background"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Yếu tố bất ngờ
                  </span>
                  <div className="flex gap-1">
                    {[
                      { id: "low", label: "Ít" },
                      { id: "medium", label: "Vừa" },
                      { id: "high", label: "Cao" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSurprise(s.id)}
                        className={cn(
                          "flex-1 text-[11px] font-medium py-1 rounded-lg border transition-all cursor-pointer text-center",
                          surprise === s.id
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
                            : "border-border/70 text-muted-foreground bg-background"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Mức độ xung đột
                  </span>
                  <div className="flex gap-1">
                    {[
                      { id: "low", label: "Êm" },
                      { id: "medium", label: "Thử thách" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setConflict(c.id)}
                        className={cn(
                          "flex-1 text-[11px] font-medium py-1 rounded-lg border transition-all cursor-pointer text-center",
                          conflict === c.id
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold"
                            : "border-border/70 text-muted-foreground bg-background"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-1">
              <Button
                onClick={() => handleLaunchWorld()}
                disabled={loading}
                className="w-full h-11 rounded-xl font-serif font-bold text-sm sm:text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin" />
                    <span>Đang khởi tạo thế giới...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4.5 fill-current" />
                    <span>Khởi Tạo & Vào Nhập Vai</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Selector Dialog (chuẩn SB/VN-EN/Survival/Drill) */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <span>Chọn chủ đề grounding hội thoại</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chủ đề dùng để neo setting/goal của scenario — không thay mode nhập vai.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {PRESET_TOPICS.map((topic) => {
              const IconComp = TOPIC_ICONS[topic.icon] || Sparkles;
              const isSelected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(topic.id, "");
                    setCustomInputVal("");
                    setIsTopicModalOpen(false);
                    toast.success("Đã chọn chủ đề", topic.labelVi);
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer text-left btn-spring ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`size-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconComp className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-foreground block truncate">{topic.labelVi}</span>
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">{topic.labelEn}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wand2 className="size-3.5 text-primary" />
              <span className="font-semibold text-foreground">Hoặc nhập bối cảnh tùy chỉnh:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInputVal}
                onChange={(e) => setCustomInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customInputVal.trim()) {
                    setSelectedTopic("custom", customInputVal.trim());
                    setIsTopicModalOpen(false);
                    toast.success("Đã chọn chủ đề tùy chỉnh", customInputVal.trim());
                  }
                }}
                placeholder="Ví dụ: Đàm phán lương IT, Check-in khách sạn Tokyo..."
                className="flex-1 h-9 px-3 text-xs rounded-xl bg-background border border-border/80 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (customInputVal.trim()) {
                    setSelectedTopic("custom", customInputVal.trim());
                    setIsTopicModalOpen(false);
                    toast.success("Đã chọn chủ đề tùy chỉnh", customInputVal.trim());
                  } else {
                    toast.info("Vui lòng nhập chủ đề trước khi áp dụng");
                  }
                }}
                className="h-9 px-3 rounded-xl text-xs gap-1 font-semibold"
              >
                <Check className="size-3" />
                <span>Áp dụng</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
