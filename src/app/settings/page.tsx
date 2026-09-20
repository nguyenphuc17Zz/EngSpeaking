"use client";

import { useEffect, useState, useMemo } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
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
  Mic,
  MicOff,
  Trash2,
  Volume2,
  Headphones,
  SlidersHorizontal,
  Key,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeViaServer } from "@/lib/stt/service";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<"ai" | "audio" | "advanced">("ai");

  const [providerStatus, setProviderStatus] = useState<
    Array<{ id: string; configured: boolean; displayName: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const ttsPlayer = useBrowserTTS();
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewText, setPreviewText] = useState(
    "Hello! I am your AI speaking tutor. Nice to practice English with you today!"
  );
  const [previewSpeed, setPreviewSpeed] = useState(1.0);
  const speechTest = useSpeechRecognition("en-US");
  const audioRecorder = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [serverTranscript, setServerTranscript] = useState("");
  const [sttDurationMs, setSttDurationMs] = useState<number | null>(null);
  const [lastAmpInfo, setLastAmpInfo] = useState<{
    originalPeak: number;
    amplifiedPeak: number;
    appliedGainDb: number;
    appliedGainFactor: number;
  } | null>(null);

  const ttsProviderDisplay = useMemo(() => {
    if (settings.tts.provider === "edge-tts") return "Microsoft Edge Neural";
    if (settings.tts.provider === "kokoro-tts" || settings.tts.provider === "kokoro") return "Kokoro-82M (Offline)";
    if (settings.tts.provider === "browser") return "Trình duyệt (Web Speech)";
    return "Tự động (Edge Neural / Kokoro)";
  }, [settings.tts.provider]);

  const ttsVoiceDisplay = useMemo(() => {
    if (!settings.tts.model || settings.tts.model === "auto") return "Mặc định";
    return settings.tts.model;
  }, [settings.tts.model]);

  const sttProviderDisplay = useMemo(() => {
    if (settings.stt.provider === "whisper-local" || settings.stt.provider === "whisper-onnx") return "Whisper ONNX (Offline)";
    if (settings.stt.provider === "browser") return "Trình duyệt (Web Speech API)";
    if (settings.stt.provider === "groq") return "Groq Whisper Large V3";
    if (settings.stt.provider === "auto") return "Tự động (Whisper ONNX / Groq)";
    return settings.stt.provider.toUpperCase();
  }, [settings.stt.provider]);

  const isServerSTT = settings.stt.provider !== "browser";
  const isMicListening = isServerSTT ? audioRecorder.status === "recording" : speechTest.isListening;

  const handleToggleMicTest = async () => {
    if (isServerSTT) {
      if (audioRecorder.status === "recording") {
        setIsTranscribing(true);
        const startTime = Date.now();
        try {
          const recording = await audioRecorder.stop();
          const res = await transcribeViaServer(recording.blob, {
            provider: settings.stt.provider === "auto" ? "whisper-local" : settings.stt.provider,
            model: settings.stt.model,
            language: "en-US",
          });
          setServerTranscript(res.text);
          setSttDurationMs(Date.now() - startTime);
          if (res.amplification) {
            setLastAmpInfo(res.amplification);
          }
          const ampNote = res.amplification ? ` | Gain: +${res.amplification.appliedGainDb}dB` : "";
          toast.success("Nhận dạng thành công!", `Thời gian: ${Date.now() - startTime}ms${ampNote}`);
        } catch (err) {
          toast.error("Lỗi nhận dạng giọng nói", err instanceof Error ? err.message : String(err));
        } finally {
          setIsTranscribing(false);
        }
      } else {
        setServerTranscript("");
        setSttDurationMs(null);
        try {
          await audioRecorder.start();
        } catch {
          toast.error("Không thể mở Microphone", "Vui lòng cấp quyền truy cập mic cho trình duyệt.");
        }
      }
    } else {
      if (speechTest.isListening) {
        speechTest.stopListening();
      } else {
        speechTest.startListening();
      }
    }
  };

  const handlePreviewVoice = async () => {
    if (ttsPlayer.isSpeaking) {
      ttsPlayer.stop();
      return;
    }
    setIsPreviewingVoice(true);
    try {
      await ttsPlayer.speak(previewText, {
        rate: previewSpeed,
        voice: settings.tts.model !== "auto" ? settings.tts.model : undefined,
      });
    } catch {
      toast.error("Không thể phát âm thanh thử nghiệm");
    } finally {
      setIsPreviewingVoice(false);
    }
  };

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
    <div className="w-full max-w-none space-y-5 pb-16 px-3 sm:px-6 md:px-8 animate-in fade-in-0 duration-200">
      {/* ── SLEEK MINIMALIST HEADER & SEGMENTED TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings2 className="size-5 text-terracotta" />
            <span>Cài đặt & API Keys</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý khóa API, mô hình AI và thiết bị âm thanh luyện phản xạ tiếng Anh.
          </p>
        </div>

        {/* 3 Main Segmented Navigation Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/50 self-start sm:self-auto shrink-0">
          {[
            { id: "ai" as const, label: "AI & Khóa API", icon: Key },
            { id: "audio" as const, label: "Âm thanh & Mic", icon: Headphones },
            { id: "advanced" as const, label: "Nâng cao & Debug", icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  isActive
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <Icon className={cn("size-3.5", isActive ? "text-terracotta" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: AI & KHÓA API
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ai" && (
        <div className="space-y-4 animate-in fade-in-0 duration-150">
          {/* Active Engine Card */}
          <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center shadow-xs shrink-0",
                    isGeminiActive
                      ? "bg-terracotta text-white"
                      : "bg-ink text-parchment dark:bg-parchment dark:text-ink"
                  )}
                >
                  {isGeminiActive ? <Sparkles className="size-5" /> : <Cpu className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Động cơ AI chính:</span>
                    <Badge
                      className={cn(
                        "text-[11px] font-mono font-semibold px-2 py-0.5",
                        isGeminiActive
                          ? "bg-sage/15 text-sage border border-sage/30"
                          : "bg-terracotta/15 text-terracotta border border-terracotta/30"
                      )}
                    >
                      <CheckCircle2 className="size-3 mr-1" />
                      <span>{isGeminiActive ? "GOOGLE GEMINI" : "GROQ AI"}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-bold font-mono text-foreground">{activeModel}</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">• Mô hình mặc định cho toàn bộ ứng dụng</span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleActiveProvider}
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0 border-border/80 hover:bg-muted/50"
              >
                <ArrowRightLeft className="size-3 text-terracotta" />
                <span>Đổi sang {isGeminiActive ? "Groq (Llama 3.3)" : "Gemini (3.7 Flash)"}</span>
              </Button>
            </div>
          </div>

          {/* ApiKeyManager */}
          <ApiKeyManager onKeyUpdated={fetchProviders} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: ÂM THANH & MIC (2 CỘT SONG SONG TRÊN DESKTOP)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "audio" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start animate-in fade-in-0 duration-150">
          {/* CỘT TRÁI: NHẬN DẠNG GIỌNG NÓI (SPEECH-TO-TEXT) */}
          <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                    <Mic className="size-4" />
                  </span>
                  <span>Nhận dạng giọng nói (STT)</span>
                </CardTitle>
                <Badge className="bg-sage/15 text-sage border border-sage/30 text-[11px] font-mono font-semibold px-2 py-0.5">
                  {sttProviderDisplay}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <ModelSelector
                label="Bộ nhận diện giọng nói (STT Engine)"
                description="Whisper ONNX (Offline), Groq Whisper V3 (Siêu tốc 200ms) hoặc Web Speech API."
                providerValue={settings.stt.provider}
                modelValue={settings.stt.model}
                capability="speechToText"
                onChange={(p, m) => settings.setStt({ provider: p, model: m })}
              />

              {/* DSP Voice Normalizer */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <Label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Volume2 className="size-3.5 text-terracotta" />
                    <span>Độ nhạy Micro (Gain Boost)</span>
                  </Label>
                  <span className="font-mono font-bold text-terracotta text-xs">
                    {(settings.audioEnhancement?.micGain ?? 1.5).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={settings.audioEnhancement?.micGain ?? 1.5}
                  onChange={(e) =>
                    settings.setAudioEnhancement({ micGain: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-terracotta"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={settings.audioEnhancement?.autoNormalize ?? true}
                      onChange={(e) =>
                        settings.setAudioEnhancement({ autoNormalize: e.target.checked })
                      }
                      className="size-3.5 rounded accent-terracotta"
                    />
                    <span>Tự động chuẩn hóa âm lượng (Auto Normalization)</span>
                  </label>
                </div>
              </div>

              {/* Live Mic Test Panel */}
              <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="size-3.5 text-terracotta" />
                    <span>Thử nghiệm Micro</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {sttDurationMs !== null && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-sage">
                        ⚡ {sttDurationMs}ms
                      </Badge>
                    )}
                    {(serverTranscript || speechTest.transcript) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          speechTest.resetTranscript();
                          setServerTranscript("");
                          setSttDurationMs(null);
                          setLastAmpInfo(null);
                        }}
                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                        title="Xóa kết quả"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Transcript Result Box */}
                <div className="min-h-[52px] rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs font-mono">
                  {isTranscribing ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                      <Loader2 className="size-3.5 animate-spin text-terracotta" />
                      <span>Đang giải mã âm thanh...</span>
                    </div>
                  ) : isServerSTT ? (
                    serverTranscript ? (
                      <p className="leading-snug font-sans font-semibold text-foreground">{serverTranscript}</p>
                    ) : (
                      <p className="text-muted-foreground italic font-sans text-[11px]">
                        {isMicListening ? "Đang ghi âm... hãy nói rồi bấm Dừng!" : "Bấm nút bên dưới để bắt đầu nói thử..."}
                      </p>
                    )
                  ) : speechTest.transcript ? (
                    <p className="leading-snug font-sans font-semibold text-foreground">{speechTest.transcript}</p>
                  ) : (
                    <p className="text-muted-foreground italic font-sans text-[11px]">
                      {isMicListening ? "Đang lắng nghe..." : "Bấm nút bên dưới để kiểm tra micro..."}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isMicListening ? "destructive" : "default"}
                  disabled={isTranscribing}
                  onClick={handleToggleMicTest}
                  className={cn(
                    "w-full h-8 rounded-xl text-xs font-semibold gap-1.5",
                    isMicListening ? "" : "bg-terracotta hover:bg-terracotta/90 text-white"
                  )}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang nhận diện...</span>
                    </>
                  ) : isMicListening ? (
                    <>
                      <MicOff className="size-3.5" />
                      <span>Dừng nói & Nhận dạng</span>
                    </>
                  ) : (
                    <>
                      <Mic className="size-3.5" />
                      <span>Bắt đầu nói thử (Test Mic)</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CỘT PHẢI: TEXT-TO-SPEECH (GIỌNG ĐỌC MẪU) */}
          <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Volume2 className="size-4" />
                  </span>
                  <span>Giọng đọc mẫu (TTS)</span>
                </CardTitle>
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono font-semibold px-2 py-0.5">
                  {ttsProviderDisplay} ({ttsVoiceDisplay})
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <ModelSelector
                label="Bộ máy phát âm & Giọng đọc (TTS Engine)"
                description="Microsoft Edge Neural (Online 9.5/10), Kokoro-82M (Offline) hoặc Web Speech."
                providerValue={settings.tts.provider}
                modelValue={settings.tts.model}
                capability="textToSpeech"
                onChange={(p, m) => settings.setTts({ provider: p, model: m })}
              />

              {/* Speed Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
                <span className="text-xs font-semibold text-foreground">Tốc độ phát âm:</span>
                <div className="flex items-center gap-1">
                  {[0.8, 1.0, 1.2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPreviewSpeed(s)}
                      className={cn(
                        "h-6 px-2 text-[11px] rounded-lg font-mono font-semibold transition-all cursor-pointer",
                        previewSpeed === s
                          ? "bg-terracotta text-white shadow-xs font-bold"
                          : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Voice Preview Interactive Panel */}
              <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Headphones className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Nghe thử phát âm</span>
                </span>

                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Nhập câu tiếng Anh để nghe thử..."
                  className="w-full h-8 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-terracotta"
                />

                <Button
                  type="button"
                  size="sm"
                  variant={ttsPlayer.isSpeaking || isPreviewingVoice ? "destructive" : "default"}
                  onClick={handlePreviewVoice}
                  className={cn(
                    "w-full h-8 rounded-xl text-xs font-semibold gap-1.5",
                    ttsPlayer.isSpeaking || isPreviewingVoice
                      ? ""
                      : "bg-terracotta hover:bg-terracotta/90 text-white"
                  )}
                >
                  {ttsPlayer.isSpeaking || isPreviewingVoice ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Dừng phát âm</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5" />
                      <span>Nghe thử câu trên</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: NÂNG CAO & DEBUG TOOLS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "advanced" && (
        <div className="space-y-4 animate-in fade-in-0 duration-150">
          {/* AI Orchestration Policy */}
          <Card className="rounded-2xl border border-border/80 bg-card/90 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                  <Sliders className="size-4" />
                </span>
                <span>Chế độ điều phối AI (Orchestrator Policy)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Chế độ điều phối</Label>
                  <Select
                    value={settings.aiProfile.mode}
                    onValueChange={(v: string | null) => v && settings.setAIProfile({ mode: v as "auto" | "manual" })}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs border-border/80">
                      <SelectValue placeholder="Chọn chế độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Tự động (Auto)</SelectItem>
                      <SelectItem value="manual">Thủ công (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Chất lượng (Quality)</Label>
                  <Select
                    value={settings.aiProfile.qualityPreference}
                    onValueChange={(v: string | null) => v && settings.setAIProfile({ qualityPreference: v as never })}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs border-border/80">
                      <SelectValue placeholder="Chọn chất lượng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy (Tiết kiệm)</SelectItem>
                      <SelectItem value="balanced">Balanced (Cân bằng)</SelectItem>
                      <SelectItem value="quality">Quality (Cao cấp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Độ trễ (Latency)</Label>
                  <Select
                    value={settings.aiProfile.latencyPreference}
                    onValueChange={(v: string | null) => v && settings.setAIProfile({ latencyPreference: v as never })}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs border-border/80">
                      <SelectValue placeholder="Chọn độ trễ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast (Nhanh nhất)</SelectItem>
                      <SelectItem value="balanced">Balanced (Cân bằng)</SelectItem>
                      <SelectItem value="quality">Quality (Ưu tiên chất lượng)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fallback dự phòng</Label>
                  <Select
                    value={settings.aiProfile.fallbackEnabled ? "on" : "off"}
                    onValueChange={(v: string | null) => v && settings.setAIProfile({ fallbackEnabled: v === "on" })}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs border-border/80">
                      <SelectValue placeholder="Dự phòng" />
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

          {/* Granular Task Model Selectors */}
          <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Cấu hình chi tiết từng tác vụ bài tập</h3>
                <p className="text-[11px] text-muted-foreground">Tùy chỉnh model riêng biệt cho từng bài tập Foundation</p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    settings.applyProviderToAll("gemini", "gemini-3.7-flash");
                    toast.success("Đã đồng bộ toàn bộ tác vụ", "Tất cả bài tập hiện sử dụng Gemini 3.7 Flash.");
                  }}
                  className="h-7 px-2.5 rounded-lg text-xs gap-1 border-border/80"
                >
                  <Sparkles className="size-3 text-terracotta" />
                  <span>Gán hết Gemini 3.7</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    settings.applyProviderToAll("groq", "llama-3.3-70b-versatile");
                    toast.success("Đã đồng bộ toàn bộ tác vụ", "Tất cả bài tập hiện sử dụng Groq Llama 3.3.");
                  }}
                  className="h-7 px-2.5 rounded-lg text-xs gap-1 border-border/80"
                >
                  <Cpu className="size-3 text-amber-600" />
                  <span>Gán hết Groq Llama</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-2.5 pt-1">
              <ModelSelector
                label="🏗️ Sentence Builder — Tạo câu phản xạ (Generator)"
                description="Khung câu đục lỗ, từ khoá bắt buộc và gợi ý."
                providerValue={settings.sentenceBuilderGen.provider}
                modelValue={settings.sentenceBuilderGen.model}
                capability="textGeneration"
                onChange={(p, m) => {
                  settings.setSentenceBuilderGen({ provider: p, model: m });
                  settings.setGeneration({ provider: p, model: m });
                }}
              />

              <ModelSelector
                label="⚖️ Sentence Builder — Chấm điểm & Sửa lỗi (Evaluator)"
                description="Chấm điểm đa chiều, so sánh câu mẫu bản xứ."
                providerValue={settings.sentenceBuilderEval.provider}
                modelValue={settings.sentenceBuilderEval.model}
                capability="textGeneration"
                onChange={(p, m) => {
                  settings.setSentenceBuilderEval({ provider: p, model: m });
                  settings.setEvaluation({ provider: p, model: m });
                }}
              />

              <ModelSelector
                label="🎧 Luyện Shadowing & Ngữ điệu (Shadowing Practice)"
                description="Phân tích ngữ điệu, nhịp thở và độ chính xác âm vần."
                providerValue={settings.shadowing.provider}
                modelValue={settings.shadowing.model}
                capability="textGeneration"
                onChange={(p, m) => settings.setShadowing({ provider: p, model: m })}
              />

              <ModelSelector
                label="⚡ Phản xạ nói sinh tồn (Survival Speaking)"
                description="Đo độ trễ phản xạ, rèn luyện cụm từ Chunks & Collocations."
                providerValue={settings.survivalSpeaking.provider}
                modelValue={settings.survivalSpeaking.model}
                capability="textGeneration"
                onChange={(p, m) => settings.setSurvivalSpeaking({ provider: p, model: m })}
              />

              <ModelSelector
                label="💬 Hội thoại trực tiếp (Live Conversation AI)"
                description="Đối tác trò chuyện AI theo tình huống thực tế."
                providerValue={settings.conversation.provider}
                modelValue={settings.conversation.model}
                capability="textGeneration"
                onChange={(p, m) => settings.setConversation({ provider: p, model: m })}
              />
            </div>
          </div>

          {/* Observability & Tools */}
          <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-terracotta" />
              <span className="text-xs font-bold text-foreground">Công cụ kiểm thử & Quan sát:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/usage">
                <Button variant="outline" size="sm" className="rounded-xl text-xs border-border/80 hover:bg-muted/50 h-7.5 px-2.5">
                  Usage & Token Dashboard
                </Button>
              </Link>
              <Link href="/debug/ai">
                <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs border-border/80 hover:bg-muted/50 h-7.5 px-2.5">
                  <Bug className="size-3 text-terracotta" />
                  <span>AI Debug View</span>
                </Button>
              </Link>
              <Link href="/lab/model-compare">
                <Button variant="outline" size="sm" className="rounded-xl text-xs border-border/80 hover:bg-muted/50 h-7.5 px-2.5">
                  Model Compare Lab
                </Button>
              </Link>
            </div>
          </div>

          {/* Discreet Privacy Pill */}
          <div className="p-3 rounded-xl bg-sage/5 border border-sage/20 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-sage shrink-0" />
            <span>
              <strong className="text-foreground">100% Client-Side Private:</strong> Khóa API của bạn được lưu an toàn trong trình duyệt cục bộ (Local Storage). Tệp âm thanh thu thử chỉ được đệm tạm thời trong RAM và không bao giờ bị chia sẻ trái phép.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
