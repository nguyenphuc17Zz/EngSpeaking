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
} from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";
import type { ConversationMode, ConversationSettings } from "@/types/conversation-world";
import { cn } from "@/lib/utils";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";

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

  const selectedMode = MODES.find((m) => m.id === selectedModeId) || MODES[0];

  const filteredModes =
    activeCategory === "all"
      ? MODES
      : MODES.filter((m) => m.category === activeCategory);

  const buildSettings = (modeOverride?: ConversationMode): ConversationSettings => ({
    mode: modeOverride || selectedModeId,
    difficulty: difficulty as ConversationSettings["difficulty"],
    duration: "10 min",
    durationMinutes: 10,
    characterStyle: "auto",
    surpriseLevel: surprise as ConversationSettings["surpriseLevel"],
    conflictIntensity: conflict as ConversationSettings["conflictIntensity"],
    pressure: "normal",
    topic: "auto",
    setting: "auto",
    aiPrompt: aiPrompt || undefined,
  });

  const handleLaunchWorld = async (modeOverride?: ConversationMode) => {
    setLoading(true);
    setGeneratingWorld(true);
    toast.info("Đang tạo kịch bản thế giới AI...", "Thiết kế nhân vật và mục tiêu phản xạ.");
    try {
      const s = buildSettings(modeOverride);
      const provider =
        settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider;
      const model = settings.conversation.model;

      const res = await fetch("/api/conversation/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s, provider, model }),
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR (Compact 52px) ── */}
      <header className="h-13 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Left: Back + Title + Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/foundation">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-xl hover:bg-secondary border border-transparent hover:border-border/60"
              title="Quay lại"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Globe className="size-3.5" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Thế Giới Giao Tiếp AI
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex bg-secondary/80 text-foreground/80 border border-border/60 rounded-full px-2">
              11+ Kịch Bản Nhập Vai
            </Badge>
          </div>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/60">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right: Random + Global AI Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomLaunch}
            disabled={loading}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 bg-background hover:bg-secondary/60 text-foreground paper-shadow-sm hidden sm:flex"
            title="Chọn ngẫu nhiên tình huống"
          >
            <Shuffle className="size-3.5 text-primary" />
            <span>Ngẫu Nhiên</span>
          </Button>

          <GlobalAiSelector />
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        {/* LEFT (7 cols): Scenario Card Grid strictly scrollable inside */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden paper-shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="font-serif font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <span>Chọn tình huống nhập vai</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">
              {filteredModes.length} kịch bản khả dụng
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredModes.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedModeId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModeId(m.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group paper-shadow-sm",
                      isSelected
                        ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40 shadow-xs"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/20 hover:paper-shadow-hover"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 border border-border/40", m.color)}>
                          <Icon className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {m.label}
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {m.level}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse mt-1" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT (5 cols): Selected Scenario Blueprint & Quick Launcher */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden paper-shadow-sm">
          {/* Header Preview Banner */}
          <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-b from-primary/[0.06] via-card to-card shrink-0">
            <div className="flex items-center gap-3 mb-2.5">
              <div className={cn("size-12 rounded-2xl flex items-center justify-center shrink-0 border border-border/50 paper-shadow-sm", selectedMode.color)}>
                <selectedMode.icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-foreground truncate">
                    {selectedMode.label}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground/80 border border-border/60">
                    {selectedMode.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedMode.desc}</p>
              </div>
            </div>

            {/* Quick Context Strip */}
            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-3.5 text-primary shrink-0" />
                <span className="font-medium">Nhân vật AI:</span>
                <span className="font-semibold text-foreground truncate">{selectedMode.defaultRole}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-medium">Nhiệm vụ:</span>
                <span className="text-foreground truncate">{selectedMode.defaultGoal}</span>
              </div>
            </div>
          </div>

          {/* Configuration Form strictly scrollable inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Custom Prompt Textarea if ai_generated */}
            {selectedModeId === "ai_generated" && (
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-foreground">
                  Mô tả tình huống bạn muốn (Prompt)
                </label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ví dụ: Tôi là kỹ sư phần mềm muốn xin sếp cho làm việc từ xa 2 ngày/tuần..."
                  rows={3}
                  className="text-xs bg-background rounded-2xl resize-none p-3 border-border/80 focus:border-primary paper-shadow-sm"
                />
              </div>
            )}

            {/* Quick Parameters */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-foreground block">
                Độ khó & Thử thách phản xạ
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "auto", label: "Tự động" },
                  { id: "b1", label: "B1 (Vừa)" },
                  { id: "b2", label: "B2 (Cao)" },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`text-xs font-semibold py-2 px-2.5 rounded-xl border transition-all ${
                      difficulty === d.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "border-border/70 text-muted-foreground hover:text-foreground bg-background"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Surprise & Conflict level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Yếu tố bất ngờ
                </span>
                <div className="flex gap-1.5">
                  {[
                    { id: "low", label: "Ít" },
                    { id: "medium", label: "Vừa" },
                    { id: "high", label: "Cao" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSurprise(s.id)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-xl border transition-all ${
                        surprise === s.id
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
                          : "border-border/70 text-muted-foreground bg-background"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Mức độ xung đột
                </span>
                <div className="flex gap-1.5">
                  {[
                    { id: "low", label: "Êm" },
                    { id: "medium", label: "Thử thách" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setConflict(c.id)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-xl border transition-all ${
                        conflict === c.id
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-semibold"
                          : "border-border/70 text-muted-foreground bg-background"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Launch Button Footer */}
          <div className="p-4 border-t border-border/60 bg-secondary/20 shrink-0">
            <Button
              onClick={() => handleLaunchWorld()}
              disabled={loading}
              className="w-full h-12 rounded-2xl font-serif font-bold text-sm sm:text-base gap-2 bg-primary text-primary-foreground btn-spring shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
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
      </main>
    </div>
  );
}
