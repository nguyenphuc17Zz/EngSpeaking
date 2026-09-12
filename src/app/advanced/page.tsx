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
  Zap,
  Flame,
  Scale,
  Sparkles,
  ShieldAlert,
  Clock,
  ArrowLeft,
  GraduationCap,
  Target,
  BookOpen,
  Mic2,
  AlertTriangle,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ModuleDef {
  id: string;
  label: string;
  desc: string;
  category: "pressure" | "argument" | "challenge" | "longform" | "resilience";
  level: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MODULE_CATEGORIES = [
  { id: "all", label: "Tất cả (25)" },
  { id: "pressure", label: "⚡ Áp lực" },
  { id: "argument", label: "⚖️ Tranh luận" },
  { id: "challenge", label: "🎯 Thử thách" },
  { id: "longform", label: "📖 Trình bày" },
  { id: "resilience", label: "🛡️ Ứng biến" },
];

const MODULES: ModuleDef[] = [
  // Pressure
  { id: "rapidResponse", label: "Rapid Response", desc: "Câu hỏi khó → Bắt buộc trả lời ngay trong 3 giây", category: "pressure", level: "C1", icon: Zap, color: "text-primary bg-primary/10" },
  { id: "pressureConversation", label: "Pressure Conversation", desc: "AI liên tục dồn ép và hỏi xoáy vào điểm yếu", category: "pressure", level: "C1", icon: Flame, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  { id: "topicSwitching", label: "Topic Switching", desc: "Chuyển đề tài đột ngột không để nhịp nói bị đơ", category: "pressure", level: "B2", icon: Shuffle, color: "text-primary bg-primary/10" },
  { id: "spontaneous", label: "Spontaneous Speaking", desc: "Nói ngay không chuẩn bị về đề tài ngẫu nhiên", category: "pressure", level: "B2", icon: Sparkles, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  { id: "highPressure", label: "High Pressure Synthesis", desc: "Tổng hợp tất cả yếu tố áp lực cao nhất của kỳ thi", category: "pressure", level: "C1+", icon: ShieldAlert, color: "text-rose-700 dark:text-rose-400 bg-rose-500/10" },

  // Argument
  { id: "opinion", label: "Opinion & Argument", desc: "Nêu quan điểm → Lý do → Dẫn chứng → Kết luận", category: "argument", level: "B2", icon: Scale, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  { id: "debate", label: "Competitive Debate", desc: "Tranh biện, phản bác trực diện lập luận của AI", category: "argument", level: "C1", icon: Scale, color: "text-primary bg-primary/10" },
  { id: "persuasion", label: "Persuasive Pitch", desc: "Thuyết phục người nghe đồng thuận ý kiến khó", category: "argument", level: "B2-C1", icon: Target, color: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10" },
  { id: "negotiation", label: "Contract Negotiation", desc: "Đàm phán thương lượng, nhượng bộ có điều kiện", category: "argument", level: "C1", icon: GraduationCap, color: "text-amber-800 dark:text-amber-300 bg-amber-500/10" },
  { id: "devilsAdvocate", label: "Devil's Advocate", desc: "AI đóng vai người phản đối mọi ý tưởng của bạn", category: "argument", level: "C1", icon: AlertTriangle, color: "text-rose-700 dark:text-rose-400 bg-rose-500/10" },

  // Challenge
  { id: "unexpectedQuestion", label: "Unexpected Question", desc: "Tình huống giả định bất ngờ, hóc búa", category: "challenge", level: "B2", icon: Wand2, color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10" },
  { id: "qaChallenge", label: "Q&A Press Challenge", desc: "Trả lời các câu hỏi chất vấn gay gắt từ thính giả", category: "challenge", level: "C1", icon: Mic2, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  { id: "interview", label: "Executive Interview", desc: "Phỏng vấn cấp quản lý với các câu hỏi bẫy", category: "challenge", level: "C1", icon: GraduationCap, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  { id: "escalation", label: "Conflict Escalation", desc: "Tình huống căng thẳng leo thang cần khéo léo hạ nhiệt", category: "challenge", level: "B2-C1", icon: ShieldAlert, color: "text-rose-700 dark:text-rose-400 bg-rose-500/10" },
  { id: "ambiguity", label: "Navigating Ambiguity", desc: "Thông tin mập mờ, cần hỏi lại để làm sáng tỏ", category: "challenge", level: "B2", icon: Sparkles, color: "text-emerald-800 dark:text-emerald-300 bg-emerald-500/10" },

  // Longform
  { id: "storytelling", label: "Storytelling Arc", desc: "Kể chuyện có mở đầu, cao trào, nút thắt và bài học", category: "longform", level: "B2", icon: BookOpen, color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10" },
  { id: "longForm", label: "Long-form Monologue", desc: "Nói liên tục từ 2-4 phút không ngắt quãng", category: "longform", level: "C1", icon: Clock, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  { id: "presentation", label: "Keynote Presentation", desc: "Thuyết trình chuyên đề và bảo vệ luận điểm", category: "longform", level: "B2-C1", icon: Mic2, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  { id: "deepFollowup", label: "Deep Follow-up Drill", desc: "Đào sâu vấn đề: What → Why → Example → Nuance", category: "longform", level: "C1", icon: Target, color: "text-primary bg-primary/10" },
  { id: "abstract", label: "Abstract Philosophies", desc: "Bàn về triết học, đạo đức AI và xu hướng tương lai", category: "longform", level: "C1+", icon: Sparkles, color: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10" },

  // Resilience
  { id: "resilience", label: "Speech Resilience", desc: "Khắc phục hiểu lầm và lấy lại mạch nói trơn tru", category: "resilience", level: "B2", icon: ShieldAlert, color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10" },
  { id: "clarification", label: "Tactical Clarification", desc: "Hỏi lại tinh tế khi không nắm rõ thông tin", category: "resilience", level: "B2", icon: Wand2, color: "text-sky-700 dark:text-sky-400 bg-sky-500/10" },
  { id: "reformulation", label: "Idiomatic Reformulation", desc: "Diễn đạt lại câu nói đơn giản thành tiếng Anh B2/C1", category: "resilience", level: "B2-C1", icon: Sparkles, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  { id: "roleReversal", label: "Role Reversal Drill", desc: "Bạn là người chủ động phỏng vấn và chất vấn AI", category: "resilience", level: "B2", icon: Shuffle, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  { id: "professional", label: "Polite Disagreement", desc: "Bày tỏ bất đồng quan điểm lịch sự nhưng cương quyết", category: "resilience", level: "C1", icon: Scale, color: "text-primary bg-primary/10" },
];

export default function AdvancedModesPage() {
  const router = useRouter();
  const settings = useSettingsStore();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>("rapidResponse");
  const [pressure, setPressure] = useState<"relaxed" | "normal" | "challenging" | "pressure">("challenging");
  const [duration, setDuration] = useState("10");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedModule = MODULES.find((m) => m.id === selectedId) || MODULES[0];

  const filteredModules =
    selectedCategory === "all"
      ? MODULES
      : MODULES.filter((m) => m.category === selectedCategory);

  const handleLaunchSession = async (overrideId?: string) => {
    setLoading(true);
    toast.info("Đang tạo thử thách nâng cao...", "Thiết lập bối cảnh thử thách và câu hỏi phản xạ.");
    try {
      const mode = overrideId || selectedId;
      const res = await fetch("/api/advanced/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          durationMinutes: parseInt(duration, 10),
          pressureLevel: pressure,
          customPrompt: aiPrompt || undefined,
          provider: settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider,
          model: settings.conversation.model,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        toast.success("Thử thách đã sẵn sàng!", `Bắt đầu module: ${selectedModule.label}`);
        router.push(`/advanced/session?id=${data.sessionId}`);
      } else {
        toast.error("Lỗi khởi tạo", data.error || "Không thể tạo phiên nâng cao.");
      }
    } catch {
      toast.error("Lỗi mạng", "Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleRandomLaunch = () => {
    const randomItem = MODULES[Math.floor(Math.random() * MODULES.length)];
    setSelectedId(randomItem.id);
    handleLaunchSession(randomItem.id);
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
              title="Quay lại Foundation"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Flame className="size-3.5" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Thử Thách Nói Nâng Cao
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex bg-secondary/80 text-foreground/80 border border-border/60 rounded-full px-2">
              25 Modules B2-C1
            </Badge>
          </div>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/60">
          {MODULE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                selectedCategory === cat.id
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
            title="Chọn ngẫu nhiên thử thách"
          >
            <Shuffle className="size-3.5 text-primary" />
            <span>Ngẫu Nhiên</span>
          </Button>

          <GlobalAiSelector />
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        {/* LEFT (7 cols): Module Card Grid strictly scrollable inside */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden paper-shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="font-serif font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <span>Chọn chuyên đề luyện tập</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">
              {filteredModules.length} chuyên đề khả dụng
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredModules.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
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
                            Chuẩn {m.level}
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

        {/* RIGHT (5 cols): Selected Module Preview & Launcher */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden paper-shadow-sm">
          {/* Header Preview Banner */}
          <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-b from-primary/[0.06] via-card to-card shrink-0">
            <div className="flex items-center gap-3 mb-2.5">
              <div className={cn("size-12 rounded-2xl flex items-center justify-center shrink-0 border border-border/50 paper-shadow-sm", selectedModule.color)}>
                <selectedModule.icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-foreground truncate">
                    {selectedModule.label}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground/80 border border-border/60">
                    {selectedModule.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedModule.desc}</p>
              </div>
            </div>

            {/* Quick Context Strip */}
            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-3.5 text-primary shrink-0" />
                <span className="font-medium">Mục tiêu kỹ năng:</span>
                <span className="font-semibold text-foreground truncate">Phản xạ tức thì & Lập luận logic</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-medium">Thời lượng đề xuất:</span>
                <span className="text-foreground">{duration} phút (4 thử thách)</span>
              </div>
            </div>
          </div>

          {/* Configuration Form strictly scrollable inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Custom Topic Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-foreground">
                  Chủ đề thử thách
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const inspirations = [
                      "Thuyết phục ban giám đốc tăng ngân sách đầu tư cho bảo mật và hạ tầng AI",
                      "Tranh luận phản bác quan điểm: 'Làm việc từ xa làm suy giảm tính sáng tạo của kỹ sư'",
                      "Giải trình với khách hàng VIP quốc tế về sự cố downtime hệ thống trong đợt Black Friday",
                      "Thuyết trình gọi vốn 2 triệu USD cho nền tảng tự động hóa chuỗi cung ứng",
                      "Phản biện lại người phỏng vấn khi bị hỏi ép: 'Tại sao công ty nên tuyển bạn thay vì ứng viên Ivy League?'",
                      "Đàm phán hợp đồng cung ứng phần mềm: Giữ nguyên mức giá nhưng cam kết SLA 99.99%",
                      "Bàn luận về triết học và đạo đức khi AI vượt qua bài kiểm tra Turing trong y khoa",
                    ];
                    const rnd = inspirations[Math.floor(Math.random() * inspirations.length)];
                    setAiPrompt(rnd);
                    toast.info("Đã chọn chủ đề", rnd);
                  }}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="size-3" />
                  <span>Gợi ý chủ đề AI</span>
                </button>
              </div>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ví dụ: Thuyết phục nhà đầu tư rót vốn vào ứng dụng AI y tế; Tranh biện về làm việc từ xa..."
                rows={3}
                className="text-xs bg-background rounded-2xl resize-none p-3 border-border/80 focus:border-primary paper-shadow-sm"
              />
            </div>

            {/* Pressure Level Selection */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-foreground block">
                Mức độ áp lực & Tốc độ phản xạ
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "normal" as const, label: "Vừa phải", desc: "Có thời gian nghĩ" },
                  { id: "challenging" as const, label: "Thử thách", desc: "Hỏi dồn 5s" },
                  { id: "pressure" as const, label: "Áp lực cao", desc: "Bắt buộc 3s" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPressure(p.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      pressure === p.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="block font-semibold text-xs">{p.label}</span>
                    <span className="block text-[10px] opacity-80 truncate">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Thời lượng phiên luyện tập
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: "5", label: "5 phút" },
                  { id: "10", label: "10 phút" },
                  { id: "15", label: "15 phút" },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-xl border transition-all ${
                      duration === d.id
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
                        : "border-border/70 text-muted-foreground bg-background"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Launch Button Footer */}
          <div className="p-4 border-t border-border/60 bg-secondary/20 shrink-0">
            <Button
              onClick={() => handleLaunchSession()}
              disabled={loading}
              className="w-full h-12 rounded-2xl font-serif font-bold text-sm sm:text-base gap-2 bg-primary text-primary-foreground btn-spring shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang thiết lập thử thách...</span>
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  <span>Bắt Đầu Thử Thách</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
