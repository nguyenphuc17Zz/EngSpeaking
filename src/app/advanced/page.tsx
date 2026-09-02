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
  { id: "rapidResponse", label: "Rapid Response", desc: "Câu hỏi khó → Bắt buộc trả lời ngay trong 3 giây", category: "pressure", level: "C1", icon: Zap, color: "text-amber-500 bg-amber-500/10" },
  { id: "pressureConversation", label: "Pressure Conversation", desc: "AI liên tục dồn ép và hỏi xoáy vào điểm yếu", category: "pressure", level: "C1", icon: Flame, color: "text-red-500 bg-red-500/10" },
  { id: "topicSwitching", label: "Topic Switching", desc: "Chuyển đề tài đột ngột không để nhịp nói bị đơ", category: "pressure", level: "B2", icon: Shuffle, color: "text-orange-500 bg-orange-500/10" },
  { id: "spontaneous", label: "Spontaneous Speaking", desc: "Nói ngay không chuẩn bị về đề tài ngẫu nhiên", category: "pressure", level: "B2", icon: Sparkles, color: "text-yellow-500 bg-yellow-500/10" },
  { id: "highPressure", label: "High Pressure Synthesis", desc: "Tổng hợp tất cả yếu tố áp lực cao nhất của kỳ thi", category: "pressure", level: "C1+", icon: ShieldAlert, color: "text-rose-500 bg-rose-500/10" },

  // Argument
  { id: "opinion", label: "Opinion & Argument", desc: "Nêu quan điểm → Lý do → Dẫn chứng → Kết luận", category: "argument", level: "B2", icon: Scale, color: "text-blue-500 bg-blue-500/10" },
  { id: "debate", label: "Competitive Debate", desc: "Tranh biện, phản bác trực diện lập luận của AI", category: "argument", level: "C1", icon: Scale, color: "text-indigo-500 bg-indigo-500/10" },
  { id: "persuasion", label: "Persuasive Pitch", desc: "Thuyết phục người nghe đồng thuận ý kiến khó", category: "argument", level: "B2-C1", icon: Target, color: "text-violet-500 bg-violet-500/10" },
  { id: "negotiation", label: "Contract Negotiation", desc: "Đàm phán thương lượng, nhượng bộ có điều kiện", category: "argument", level: "C1", icon: GraduationCap, color: "text-purple-500 bg-purple-500/10" },
  { id: "devilsAdvocate", label: "Devil's Advocate", desc: "AI đóng vai người phản đối mọi ý tưởng của bạn", category: "argument", level: "C1", icon: AlertTriangle, color: "text-pink-500 bg-pink-500/10" },

  // Challenge
  { id: "unexpectedQuestion", label: "Unexpected Question", desc: "Tình huống giả định bất ngờ, hóc búa", category: "challenge", level: "B2", icon: Wand2, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "qaChallenge", label: "Q&A Press Challenge", desc: "Trả lời các câu hỏi chất vấn gay gắt từ thính giả", category: "challenge", level: "C1", icon: Mic2, color: "text-teal-500 bg-teal-500/10" },
  { id: "interview", label: "Executive Interview", desc: "Phỏng vấn cấp quản lý với các câu hỏi bẫy", category: "challenge", level: "C1", icon: GraduationCap, color: "text-cyan-500 bg-cyan-500/10" },
  { id: "escalation", label: "Conflict Escalation", desc: "Tình huống căng thẳng leo thang cần khéo léo hạ nhiệt", category: "challenge", level: "B2-C1", icon: ShieldAlert, color: "text-sky-500 bg-sky-500/10" },
  { id: "ambiguity", label: "Navigating Ambiguity", desc: "Thông tin mập mờ, cần hỏi lại để làm sáng tỏ", category: "challenge", level: "B2", icon: Sparkles, color: "text-blue-500 bg-blue-500/10" },

  // Longform
  { id: "storytelling", label: "Storytelling Arc", desc: "Kể chuyện có mở đầu, cao trào, nút thắt và bài học", category: "longform", level: "B2", icon: BookOpen, color: "text-amber-500 bg-amber-500/10" },
  { id: "longForm", label: "Long-form Monologue", desc: "Nói liên tục từ 2-4 phút không ngắt quãng", category: "longform", level: "C1", icon: Clock, color: "text-orange-500 bg-orange-500/10" },
  { id: "presentation", label: "Keynote Presentation", desc: "Thuyết trình chuyên đề và bảo vệ luận điểm", category: "longform", level: "B2-C1", icon: Mic2, color: "text-emerald-500 bg-emerald-500/10" },
  { id: "deepFollowup", label: "Deep Follow-up Drill", desc: "Đào sâu vấn đề: What → Why → Example → Nuance", category: "longform", level: "C1", icon: Target, color: "text-indigo-500 bg-indigo-500/10" },
  { id: "abstract", label: "Abstract Philosophies", desc: "Bàn về triết học, đạo đức AI và xu hướng tương lai", category: "longform", level: "C1+", icon: Sparkles, color: "text-purple-500 bg-purple-500/10" },

  // Resilience
  { id: "resilience", label: "Speech Resilience", desc: "Khắc phục hiểu lầm và lấy lại mạch nói trơn tru", category: "resilience", level: "B2", icon: ShieldAlert, color: "text-teal-500 bg-teal-500/10" },
  { id: "clarification", label: "Tactical Clarification", desc: "Hỏi lại tinh tế khi không nắm rõ thông tin", category: "resilience", level: "B2", icon: Wand2, color: "text-blue-500 bg-blue-500/10" },
  { id: "reformulation", label: "Idiomatic Reformulation", desc: "Diễn đạt lại câu nói đơn giản thành tiếng Anh B2/C1", category: "resilience", level: "B2-C1", icon: Sparkles, color: "text-violet-500 bg-violet-500/10" },
  { id: "roleReversal", label: "Role Reversal Drill", desc: "Bạn là người chủ động phỏng vấn và chất vấn AI", category: "resilience", level: "B2", icon: Shuffle, color: "text-rose-500 bg-rose-500/10" },
  { id: "professional", label: "Polite Disagreement", desc: "Bày tỏ bất đồng quan điểm lịch sự nhưng cương quyết", category: "resilience", level: "C1", icon: Scale, color: "text-pink-500 bg-pink-500/10" },
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
      const provider =
        settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider;
      const model = settings.conversation.model;

      const body = {
        context: {
          targetSkills: [mode],
          durationMinutes: parseInt(duration, 10),
          pressureLevel: pressure,
          topic: aiPrompt.trim() ? aiPrompt.trim() : "auto",
          scenario: aiPrompt.trim() || undefined,
          goal: mode,
        },
        provider,
        model,
      };

      const res = await fetch("/api/advanced/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.session) {
        localStorage.setItem("advanced_session", JSON.stringify(data.session));
        toast.success("Thử thách đã sẵn sàng!", selectedModule.label);
        router.push("/advanced/session");
      }
    } catch {
      toast.error("Lỗi khởi tạo", "Không thể tạo thử thách lúc này. Vui lòng thử lại.");
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
            <Button variant="ghost" size="sm" className="size-7 p-0 rounded-xl" title="Quay lại Foundation">
              <ArrowLeft className="size-3.5" />
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="size-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground">
              Thử Thách Nói Nâng Cao
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex">
              25 Modules B2-C1
            </Badge>
          </div>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
          {MODULE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right: Random + Global AI Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomLaunch}
            disabled={loading}
            className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 hidden sm:flex"
            title="Chọn ngẫu nhiên thử thách"
          >
            <Shuffle className="size-3 text-amber-500" />
            <span>Ngẫu Nhiên</span>
          </Button>

          <GlobalAiSelector />
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        {/* LEFT (7 cols): Module Card Grid strictly scrollable inside */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-3 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="font-bold text-xs text-foreground">Chọn chuyên đề luyện tập</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {filteredModules.length} chuyên đề khả dụng
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredModules.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative group",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", m.color)}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {m.label}
                          </h4>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Chuẩn {m.level}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse mt-1" />
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
        </div>

        {/* RIGHT (5 cols): Selected Module Preview & Launcher */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
          {/* Header Preview Banner */}
          <div className="p-4 border-b border-border/60 bg-gradient-to-b from-primary/10 via-card to-card shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs", selectedModule.color)}>
                <selectedModule.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {selectedModule.label}
                  </h3>
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                    {selectedModule.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{selectedModule.desc}</p>
              </div>
            </div>

            {/* Quick Context Strip */}
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="size-3 text-primary shrink-0" />
                <span className="font-medium">Mục tiêu kỹ năng:</span>
                <span className="font-bold text-foreground truncate">Phản xạ tức thì & Lập luận logic</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3 text-amber-500 shrink-0" />
                <span className="font-medium">Thời lượng đề xuất:</span>
                <span className="text-foreground">{duration} phút (4 thử thách)</span>
              </div>
            </div>
          </div>

          {/* Configuration Form strictly scrollable inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {/* Custom Topic Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
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
                  className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="size-2.5" />
                  <span>🎲 Gợi ý chủ đề AI</span>
                </button>
              </div>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ví dụ: Thuyết phục nhà đầu tư rót vốn vào ứng dụng AI y tế; Tranh biện về làm việc từ xa..."
                rows={3}
                className="text-xs bg-background rounded-xl resize-none p-2.5"
              />
            </div>

            {/* Pressure Level Selection */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground block">
                Mức độ áp lực & Tốc độ
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "normal" as const, label: "Vừa phải", desc: "Có thời gian nghĩ" },
                  { id: "challenging" as const, label: "Thử thách", desc: "Hỏi dồn 5s" },
                  { id: "pressure" as const, label: "Áp lực cao", desc: "Bắt buộc 3s" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPressure(p.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      pressure === p.id
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "border-border/70 bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="block font-bold text-[11px]">{p.label}</span>
                    <span className="block text-[9px] opacity-80 truncate">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration selector */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Thời lượng phiên luyện tập
              </span>
              <div className="flex gap-1">
                {[
                  { id: "5", label: "5 phút" },
                  { id: "10", label: "10 phút" },
                  { id: "15", label: "15 phút" },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                      duration === d.id
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                        : "border-border/70 text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Launch Button Footer */}
          <div className="p-3.5 border-t border-border/60 bg-muted/10 shrink-0">
            <Button
              onClick={() => handleLaunchSession()}
              disabled={loading}
              className="w-full h-11 rounded-2xl font-bold text-sm gap-2 shadow-md"
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
