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
} from "lucide-react";
import Link from "next/link";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeViaServer } from "@/lib/stt/service";

export default function SettingsPage() {
  const settings = useSettingsStore();

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
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Banner - Warm Editorial Luxury */}
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta/10 text-terracotta border border-terracotta/20 text-xs font-semibold">
              <Settings2 className="size-3.5" />
              <span>System Architecture & Sound Lab</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Cấu hình Hệ thống & Phòng thu Âm thanh
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quản lý khoá API, tinh chỉnh bộ khuếch đại micro phòng thu (DSP), chọn chất giọng phát âm bản xứ và điều phối mô hình AI cho từng bài luyện phản xạ.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ==================== ACTIVE ENGINE STATUS BANNER ==================== */}
      <div className="rounded-3xl border border-border/80 bg-card/90 paper-shadow p-5 md:p-6 transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className={`size-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                isGeminiActive
                  ? "bg-terracotta text-white"
                  : "bg-ink text-parchment dark:bg-parchment dark:text-ink"
              }`}
            >
              {isGeminiActive ? <Sparkles className="size-6" /> : <Cpu className="size-6" />}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Động cơ AI chính:
                </span>
                <Badge
                  className={`text-xs font-mono font-semibold gap-1.5 px-2.5 py-0.5 ${
                    isGeminiActive
                      ? "bg-sage/15 text-sage border border-sage/30"
                      : "bg-terracotta/15 text-terracotta border border-terracotta/30"
                  }`}
                >
                  <CheckCircle2 className="size-3.5 text-sage" />
                  <span>ĐANG ÁP DỤNG: {isGeminiActive ? "GOOGLE GEMINI" : "GROQ AI"}</span>
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-bold font-mono text-foreground">
                  {activeModel}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  • Cung cấp trí tuệ ngôn ngữ cho toàn bộ ứng dụng
                </span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleActiveProvider}
            className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 border-border/80 hover:bg-muted/50 btn-spring"
          >
            <ArrowRightLeft className="size-3.5 text-terracotta" />
            <span>Chuyển sang {isGeminiActive ? "Groq (Llama 3.3)" : "Gemini (3.7 Flash)"}</span>
          </Button>
        </div>
      </div>

      {/* Direct API Key Management & Independent Model Selection */}
      <ApiKeyManager onKeyUpdated={fetchProviders} />

      {/* AI Mode & Orchestration Policy */}
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Sliders className="size-4" />
            </span>
            <span>Chế độ điều phối AI (Orchestrator Policy)</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
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
                <SelectTrigger className="rounded-xl h-10 text-xs border-border/80">
                  <SelectValue placeholder="Chọn chế độ" />
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
                <SelectTrigger className="rounded-xl h-10 text-xs border-border/80">
                  <SelectValue placeholder="Chọn chất lượng" />
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
                <SelectTrigger className="rounded-xl h-10 text-xs border-border/80">
                  <SelectValue placeholder="Chọn độ trễ" />
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
                <SelectTrigger className="rounded-xl h-10 text-xs border-border/80">
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

      {/* 🎙️ Dedicated Speech-to-Text Section */}
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                <Mic className="size-4.5" />
              </span>
              <span>🎙️ Nhận dạng giọng nói (Speech-to-Text)</span>
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-sage/15 text-sage border border-sage/30 text-xs font-semibold px-2.5 py-1 gap-1.5 font-mono">
                <CheckCircle2 className="size-3.5 text-sage" />
                <span>Đang áp dụng: {sttProviderDisplay}</span>
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Cấu hình công nghệ chuyển đổi âm thanh giọng nói của bạn thành văn bản tiếng Anh, áp dụng cho toàn bộ các bài học phát âm, shadowing và hội thoại.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {/* Summary Callout Banner */}
          <div className="rounded-2xl bg-parchment/80 dark:bg-card/80 border border-border/70 p-4 text-xs text-foreground flex items-center gap-3">
            <div className="size-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
              <Zap className="size-4" />
            </div>
            <div className="leading-relaxed">
              <span>Hệ thống đang sử dụng </span>
              <strong className="text-terracotta font-semibold">{sttProviderDisplay}</strong>
              <span> để nhận dạng giọng nói tiếng Anh của bạn trong tất cả bài luyện nói, shadowing và đối thoại AI.</span>
            </div>
          </div>

          <ModelSelector
            label="Bộ nhận diện giọng nói (STT Engine)"
            description="Whisper ONNX (Offline trong thư mục models/), Groq Whisper V3 (SOTA siêu tốc 200ms) hoặc Web Speech API."
            providerValue={settings.stt.provider}
            modelValue={settings.stt.model}
            capability="speechToText"
            onChange={(p, m) => settings.setStt({ provider: p, model: m })}
          />

          {/* Voice Amplification & DSP Normalization Controls */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta/15 text-terracotta">
                  <Volume2 className="size-3.5" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  Khuếch đại giọng nói & Chuẩn hóa âm lượng (DSP Voice Booster)
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                Auto Normalization + Soft Limiter
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Auto Normalization Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/70">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-xs font-semibold cursor-pointer" htmlFor="auto-normalize-switch">
                    Tự động chuẩn hóa âm lượng
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Tự động nâng giọng nói nhỏ/thì thầm về chuẩn -1.5 dBFS
                  </p>
                </div>
                <input
                  id="auto-normalize-switch"
                  type="checkbox"
                  checked={settings.audioEnhancement?.autoNormalize ?? true}
                  onChange={(e) =>
                    settings.setAudioEnhancement({ autoNormalize: e.target.checked })
                  }
                  className="size-4 rounded accent-terracotta cursor-pointer"
                />
              </div>

              {/* Mic Gain Slider */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/70">
                <div className="flex items-center justify-between text-xs">
                  <Label className="text-xs font-semibold">Độ nhạy Micro (Gain Boost)</Label>
                  <span className="font-mono font-bold text-terracotta">
                    {(settings.audioEnhancement?.micGain ?? 1.5).toFixed(1)}x (+{(20 * Math.log10(settings.audioEnhancement?.micGain ?? 1.5)).toFixed(1)} dB)
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
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>1.0x (Gốc)</span>
                  <span>1.5x (+3.5 dB)</span>
                  <span>2.0x (+6.0 dB)</span>
                  <span>3.0x (+9.5 dB)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Mic Test Panel */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Radio className="size-3.5 text-terracotta" />
                  <span>Thử nghiệm Microphone & Nhận diện ({isServerSTT ? "Audio Recording & AI Processing" : "Real-time Streaming"})</span>
                </Label>
                {isMicListening ? (
                  <Badge variant="destructive" className="animate-pulse text-[10px] h-5 px-2 font-mono gap-1">
                    <span className="size-1.5 rounded-full bg-white animate-ping" />
                    <span>Đang lắng nghe...</span>
                  </Badge>
                ) : isTranscribing ? (
                  <Badge className="bg-terracotta/15 text-terracotta border border-terracotta/30 text-[10px] h-5 px-2 font-mono gap-1">
                    <Loader2 className="size-2.5 animate-spin" />
                    <span>Đang xử lý Whisper...</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-5 px-2 font-mono text-muted-foreground">
                    Sẵn sàng thử nghiệm
                  </Badge>
                )}

                {sttDurationMs !== null && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-2 font-mono text-sage">
                    ⚡ {sttDurationMs}ms
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    <Trash2 className="size-3 mr-1" />
                    <span>Xoá kết quả</span>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={isMicListening ? "destructive" : "default"}
                  disabled={isTranscribing}
                  onClick={handleToggleMicTest}
                  className={`h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 shadow-xs btn-spring ${
                    isMicListening
                      ? ""
                      : "bg-terracotta hover:bg-terracotta/90 text-white"
                  }`}
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
            </div>

            {/* Transcript Result Box */}
            <div className="min-h-[60px] rounded-xl border border-border/70 bg-parchment/60 dark:bg-muted/30 p-3.5 text-xs font-mono">
              {isTranscribing ? (
                <div className="flex items-center gap-2 text-muted-foreground py-2 text-xs">
                  <Loader2 className="size-4 animate-spin text-terracotta" />
                  <span>Model AI đang giải mã âm thanh và chuyển đổi sang văn bản tiếng Anh...</span>
                </div>
              ) : isServerSTT ? (
                serverTranscript ? (
                  <p className="leading-relaxed">
                    <span className="text-foreground font-semibold font-sans">{serverTranscript}</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground italic font-sans">
                    {isMicListening
                      ? "Đang ghi âm giọng nói của bạn... Hãy nói một câu tiếng Anh rồi bấm 'Dừng nói & Nhận dạng'!"
                      : "Bấm 'Bắt đầu nói thử' để thu âm microphone và nhận diện chính xác bằng Whisper ONNX / Groq."}
                  </p>
                )
              ) : speechTest.transcript || speechTest.interimTranscript ? (
                <p className="leading-relaxed">
                  <span className="text-foreground font-semibold font-sans">{speechTest.transcript}</span>
                  {speechTest.interimTranscript && (
                    <span className="text-muted-foreground italic font-sans"> {speechTest.interimTranscript}</span>
                  )}
                </p>
              ) : (
                <p className="text-muted-foreground italic font-sans">
                  {isMicListening
                    ? "Hãy nói một câu tiếng Anh bất kỳ (ví dụ: 'Hello, I want to practice English speaking today')..."
                    : "Bấm 'Bắt đầu nói thử' để kiểm tra kết nối microphone và độ nhạy nhận diện giọng nói tiếng Anh."}
                </p>
              )}

              {/* Amplification Gain & Peak Metrics Readout */}
              {lastAmpInfo && (
                <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span className="text-sage font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-sage" />
                    <span>Đã khuếch đại: +{lastAmpInfo.appliedGainDb} dB ({lastAmpInfo.appliedGainFactor}x)</span>
                  </span>
                  <span>•</span>
                  <span>Biên độ gốc: {lastAmpInfo.originalPeak}</span>
                  <span>→</span>
                  <span className="font-semibold text-foreground">Sau chuẩn hóa: {lastAmpInfo.amplifiedPeak}</span>
                </div>
              )}
            </div>

            {speechTest.error && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{speechTest.error}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 🔊 Dedicated Text-to-Speech (TTS) Section */}
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Volume2 className="size-4.5" />
              </span>
              <span>🔊 Giọng đọc AI & Phát âm mẫu (Text-to-Speech)</span>
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold px-2.5 py-1 gap-1.5 font-mono">
                <CheckCircle2 className="size-3.5 text-amber-600" />
                <span>Đang áp dụng: {ttsProviderDisplay} ({ttsVoiceDisplay})</span>
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Cấu hình công nghệ tổng hợp giọng nói phát âm chuẩn bản xứ, áp dụng cho toàn bộ các mẫu câu, bài luyện nghe và gia sư ảo trong phòng tập nói.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {/* Summary Callout Banner */}
          <div className="rounded-2xl bg-parchment/80 dark:bg-card/80 border border-border/70 p-4 text-xs text-foreground flex items-center gap-3">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Headphones className="size-4" />
            </div>
            <div className="leading-relaxed">
              <span>Hệ thống đang phát âm bằng </span>
              <strong className="text-amber-700 dark:text-amber-400 font-semibold">{ttsProviderDisplay}</strong>
              {settings.tts.model !== "auto" && (
                <span> với giọng <code className="px-1.5 py-0.5 rounded-md bg-amber-500/15 font-mono text-[11px] text-amber-800 dark:text-amber-300 font-semibold">{settings.tts.model}</code></span>
              )}
              <span> ở tốc độ <strong>{previewSpeed}x</strong>. Đã sẵn sàng phục vụ các bài học phát âm và shadowing!</span>
            </div>
          </div>

          <ModelSelector
            label="Bộ máy phát âm & Giọng đọc (TTS Engine)"
            description="Microsoft Edge Neural (Online - chuẩn phòng thu 9.5/10), Kokoro-82M (Offline trong thư mục models/) hoặc Web Speech API."
            providerValue={settings.tts.provider}
            modelValue={settings.tts.model}
            capability="textToSpeech"
            onChange={(p, m) => settings.setTts({ provider: p, model: m })}
          />

          {/* Live Voice Preview Interactive Panel */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Radio className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Thử nghiệm Giọng đọc & Tốc độ phát âm (Voice Preview)</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tốc độ:</span>
                {[0.8, 1.0, 1.2].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={previewSpeed === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewSpeed(s)}
                    className={`h-7 px-2.5 text-[11px] rounded-lg font-mono font-semibold ${
                      previewSpeed === s
                        ? "bg-terracotta text-white"
                        : "border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Nhập câu tiếng Anh để nghe thử..."
                className="flex-1 h-10 rounded-xl border border-border/80 bg-background/90 px-3.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-terracotta/30"
              />
              <Button
                type="button"
                size="sm"
                variant={ttsPlayer.isSpeaking || isPreviewingVoice ? "destructive" : "default"}
                onClick={handlePreviewVoice}
                className={`h-10 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 btn-spring shadow-xs ${
                  ttsPlayer.isSpeaking || isPreviewingVoice
                    ? ""
                    : "bg-terracotta hover:bg-terracotta/90 text-white"
                }`}
              >
                {ttsPlayer.isSpeaking || isPreviewingVoice ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Dừng phát âm</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="size-3.5" />
                    <span>Nghe thử phát âm</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Granular Foundation Task Model Selectors ==================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground">Cấu hình chi tiết từng tác vụ (Dynamic Models)</h3>
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
              className="h-8 rounded-xl text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted/50 btn-spring"
            >
              <Sparkles className="size-3 text-terracotta" />
              <span>Gán hết Gemini 3.7 Flash</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                settings.applyProviderToAll("groq", "llama-3.3-70b-versatile");
                toast.success("Đã đồng bộ toàn bộ tác vụ", "Tất cả bài tập hiện sử dụng Groq Llama 3.3.");
              }}
              className="h-8 rounded-xl text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted/50 btn-spring"
            >
              <Cpu className="size-3 text-amber-600" />
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
        </div>
      </div>

      {/* Observability & Tools */}
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
              <BarChart3 className="size-3.5" />
            </span>
            <span>Công cụ kiểm thử & Quan sát (Observability)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 flex flex-wrap gap-2.5">
          <Link href="/usage">
            <Button variant="outline" size="sm" className="rounded-xl text-xs border-border/80 hover:bg-muted/50 h-8">
              Usage & Token Dashboard
            </Button>
          </Link>
          <Link href="/debug/ai">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs border-border/80 hover:bg-muted/50 h-8">
              <Bug className="size-3.5 text-terracotta" />
              <span>AI Debug View</span>
            </Button>
          </Link>
          <Link href="/lab/model-compare">
            <Button variant="outline" size="sm" className="rounded-xl text-xs border-border/80 hover:bg-muted/50 h-8">
              Model Compare Lab
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Privacy & Security Guarantee Banner */}
      <Card className="rounded-3xl border border-sage/30 bg-sage/5 paper-shadow">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="size-10 rounded-2xl bg-sage/15 text-sage flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-1 text-xs leading-relaxed">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <span>Cam kết Bảo mật & Xử lý Âm thanh Cục bộ</span>
              <Badge variant="outline" className="text-[10px] font-mono border-sage/40 text-sage">100% Client-Side Private</Badge>
            </h4>
            <p className="text-muted-foreground">
              Khoá API của bạn được mã hoá và lưu trực tiếp trong trình duyệt cá nhân (Local Storage), tuyệt đối không lưu trữ trái phép trên bất kỳ máy chủ bên thứ ba nào. Tệp âm thanh thu thử từ micro chỉ được đệm tạm thời trên bộ nhớ RAM để xử lý chuyển văn bản và tự động xoá ngay khi kết thúc phiên.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
