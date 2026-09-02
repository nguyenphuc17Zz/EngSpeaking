"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2,
  BarChart3,
  Bug,
  ShieldCheck,
  Cpu,
  Sliders,
  Sparkles,
  Zap,
  Radio,
  ArrowRightLeft,
  Layers,
  Repeat,
  Flame,
  Mic,
  Volume2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const settings = useSettingsStore();

  const [providerStatus, setProviderStatus] = useState<
    Array<{ id: string; configured: boolean; displayName: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = () => {
    fetch("/api/ai/providers")
      .then((r) => r.json())
      .then((data) => setProviderStatus(data.providers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const isGeminiActive = settings.activeProvider === "gemini";
  const activeModel = isGeminiActive ? settings.preferredGeminiModel : settings.preferredGroqModel;

  const handleToggleActiveProvider = () => {
    const next = isGeminiActive ? "groq" : "gemini";
    settings.setActiveProvider(next);
    toast.success(
      `Đã chuyển sang ${next === "gemini" ? "Google Gemini" : "Groq AI"}!`,
      `Mô hình "${next === "gemini" ? settings.preferredGeminiModel : settings.preferredGroqModel}" hiện là động cơ chính.`
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Settings2 className="size-3.5" />
              <span>AI Provider & Engine Configuration</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Cài đặt & Cấu hình Mô hình
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quản lý API Key, kiểm tra độ trễ (ping test), chọn động cơ chính và tùy chỉnh model riêng biệt cho từng bài tập Foundation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ==================== ACTIVE ENGINE STATUS BANNER ==================== */}
      <Card
        className={`rounded-3xl border-2 p-5 shadow-xs transition-all ${
          isGeminiActive
            ? "border-primary/50 bg-gradient-to-r from-primary/15 via-card to-primary/5"
            : "border-orange-500/50 bg-gradient-to-r from-orange-500/15 via-card to-orange-500/5"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`size-12 rounded-2xl flex items-center justify-center shadow-xs ${
                isGeminiActive ? "bg-primary text-primary-foreground" : "bg-orange-500 text-white"
              }`}
            >
              {isGeminiActive ? <Sparkles className="size-6" /> : <Cpu className="size-6" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Động cơ AI đang hoạt động:
                </span>
                <Badge
                  className={`text-[10px] font-mono font-bold ${
                    isGeminiActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                  }`}
                >
                  {isGeminiActive ? "GOOGLE GEMINI" : "GROQ AI"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-bold text-foreground font-mono">
                  {activeModel}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  • Đang cấp quyền cho toàn bộ phòng tập nói
                </span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleActiveProvider}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold gap-2 shrink-0 btn-spring ${
              isGeminiActive
                ? "border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                : "border-primary/40 text-primary hover:bg-primary/10"
            }`}
          >
            <ArrowRightLeft className="size-3.5" />
            <span>Chuyển sang {isGeminiActive ? "Groq (Llama 3.3)" : "Gemini (3.7 Flash)"}</span>
          </Button>
        </div>
      </Card>

      {/* Direct API Key Management & Independent Model Selection */}
      <ApiKeyManager onKeyUpdated={fetchProviders} />

      {/* AI Mode & Orchestration Policy */}
      <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>Chế độ điều phối AI (Orchestrator Policy)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Auto: Hệ thống tự tối ưu latency & chi phí. Manual: Tôn trọng cấu hình thủ công của bạn
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chế độ điều phối</Label>
              <Select
                value={settings.aiProfile.mode}
                onValueChange={(v: string | null) => v && settings.setAIProfile({ mode: v as "auto" | "manual" })}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <span>{settings.aiProfile.mode === "auto" ? "Tự động (Auto)" : "Thủ công (Manual)"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Tự động (Auto)</SelectItem>
                  <SelectItem value="manual">Thủ công (Manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chất lượng (Quality)</Label>
              <Select
                value={settings.aiProfile.qualityPreference}
                onValueChange={(v: string | null) => v && settings.setAIProfile({ qualityPreference: v as never })}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <span>{settings.aiProfile.qualityPreference}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy (Tiết kiệm)</SelectItem>
                  <SelectItem value="balanced">Balanced (Cân bằng)</SelectItem>
                  <SelectItem value="quality">Quality (Cao cấp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Độ trễ (Latency)</Label>
              <Select
                value={settings.aiProfile.latencyPreference}
                onValueChange={(v: string | null) => v && settings.setAIProfile({ latencyPreference: v as never })}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <span>{settings.aiProfile.latencyPreference}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (Nhanh nhất)</SelectItem>
                  <SelectItem value="balanced">Balanced (Cân bằng)</SelectItem>
                  <SelectItem value="quality">Quality (Ưu tiên chất lượng)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fallback dự phòng</Label>
              <Select
                value={settings.aiProfile.fallbackEnabled ? "on" : "off"}
                onValueChange={(v: string | null) => v && settings.setAIProfile({ fallbackEnabled: v === "on" })}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <span>{settings.aiProfile.fallbackEnabled ? "BẬT (ON)" : "TẮT (OFF)"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">TẮT — Báo lỗi rõ</SelectItem>
                  <SelectItem value="on">BẬT — Tự đổi provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Granular Foundation Task Model Selectors ==================== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Cấu hình chi tiết từng tác vụ (Dynamic Models)</h3>
            <p className="text-xs text-muted-foreground">
              Tùy chỉnh model riêng biệt cho từng bài tập Foundation hoặc dùng các nút gán nhanh bên phải
            </p>
          </div>

          {/* Quick Apply Batch Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                settings.applyProviderToAll("gemini", "gemini-3.7-flash");
                toast.success("Đã đồng bộ toàn bộ tác vụ", "Tất cả bài tập hiện sử dụng Gemini 3.7 Flash.");
              }}
              className="h-8 rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 btn-spring"
            >
              <Sparkles className="size-3" />
              <span>Gán hết Gemini 3.7 Flash</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                settings.applyProviderToAll("groq", "llama-3.3-70b-versatile");
                toast.success("Đã đồng bộ toàn bộ tác vụ", "Tất cả bài tập hiện sử dụng Groq Llama 3.3.");
              }}
              className="h-8 rounded-xl text-xs gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 btn-spring"
            >
              <Cpu className="size-3" />
              <span>Gán hết Groq Llama 3.3</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-3.5">
          {/* 1. Sentence Builder Generator */}
          <ModelSelector
            label="🏗️ Sentence Builder — Tạo câu phản xạ (Generator)"
            description="Thiết kế khung câu đục lỗ, từ khoá bắt buộc và 5 tầng gợi ý theo cấp độ Level A, B, C."
            providerValue={settings.sentenceBuilderGen.provider}
            modelValue={settings.sentenceBuilderGen.model}
            capability="textGeneration"
            onChange={(p, m) => {
              settings.setSentenceBuilderGen({ provider: p, model: m });
              settings.setGeneration({ provider: p, model: m });
            }}
          />

          {/* 2. Sentence Builder Evaluator */}
          <ModelSelector
            label="⚖️ Sentence Builder — Chấm điểm & Sửa lỗi (Evaluator)"
            description="Chấm điểm đa chiều (ngữ nghĩa 35%, ngữ pháp 25%), so sánh với câu mẫu bản xứ và giải thích cặn kẽ."
            providerValue={settings.sentenceBuilderEval.provider}
            modelValue={settings.sentenceBuilderEval.model}
            capability="textGeneration"
            onChange={(p, m) => {
              settings.setSentenceBuilderEval({ provider: p, model: m });
              settings.setEvaluation({ provider: p, model: m });
            }}
          />

          {/* 3. Shadowing Practice */}
          <ModelSelector
            label="🎧 Luyện Shadowing & Ngữ điệu (Shadowing Practice)"
            description="Phân tích ngữ điệu, nhịp điệu (stress & intonation) và độ chính xác âm vần khi bắt chước người bản xứ."
            providerValue={settings.shadowing.provider}
            modelValue={settings.shadowing.model}
            capability="textGeneration"
            onChange={(p, m) => settings.setShadowing({ provider: p, model: m })}
          />

          {/* 4. Survival Speaking */}
          <ModelSelector
            label="⚡ Phản xạ nói sinh tồn & Khung câu nhanh (Survival Speaking)"
            description="Đo độ trễ phản xạ dưới 2.5s, rèn luyện các cụm từ cốt lõi (Chunks & Collocations)."
            providerValue={settings.survivalSpeaking.provider}
            modelValue={settings.survivalSpeaking.model}
            capability="textGeneration"
            onChange={(p, m) => settings.setSurvivalSpeaking({ provider: p, model: m })}
          />

          {/* 5. Live Conversation */}
          <ModelSelector
            label="💬 Hội thoại nhập vai trực tiếp (Live Conversation AI)"
            description="Đối tác trò chuyện AI theo tình huống thực tế (du lịch, phỏng vấn việc làm, họp nhóm)."
            providerValue={settings.conversation.provider}
            modelValue={settings.conversation.model}
            capability="textGeneration"
            onChange={(p, m) => settings.setConversation({ provider: p, model: m })}
          />

          {/* 6. General Diagnostics */}
          <ModelSelector
            label="📊 Chẩn đoán phát âm & Phân tích 8 chiều (Diagnostics)"
            description="Đánh giá tổng quát 8 chiều, phân tích xu hướng tiến bộ và phát hiện điểm nghẽn phản xạ."
            providerValue={settings.evaluation.provider}
            modelValue={settings.evaluation.model}
            capability="textGeneration"
            onChange={(p, m) => settings.setEvaluation({ provider: p, model: m })}
          />

          {/* 7. Speech-to-Text */}
          <ModelSelector
            label="🎙️ Nhận dạng giọng nói (Speech-to-Text)"
            description="Web Speech API trình duyệt (miễn phí, nhanh) hoặc Groq Whisper Large V3 tốc độ cao và nhận diện tiếng Anh cực chuẩn."
            providerValue={settings.stt.provider}
            modelValue={settings.stt.model}
            capability="speechToText"
            onChange={(p, m) => settings.setStt({ provider: p, model: m })}
          />

          {/* 8. Text-to-Speech */}
          <ModelSelector
            label="🔊 Giọng đọc AI (Text-to-Speech)"
            description="Mặc định: SpeechSynthesis trên trình duyệt (hoạt động offline mượt mà, phát âm chuẩn bản xứ)."
            providerValue={settings.tts.provider}
            modelValue={settings.tts.model}
            capability="textToSpeech"
            onChange={(p, m) => settings.setTts({ provider: p, model: m })}
          />
        </div>
      </div>

      {/* Observability & Tools */}
      <Card className="rounded-3xl border border-border/80 bg-muted/20 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>Công cụ quản trị & Debug</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex flex-wrap gap-2">
          <Link href="/usage">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">
              Usage & Token Dashboard
            </Button>
          </Link>
          <Link href="/debug/ai">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
              <Bug className="size-3.5" />
              <span>AI Debug View</span>
            </Button>
          </Link>
          <Link href="/lab/model-compare">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">
              Model Compare Lab
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
