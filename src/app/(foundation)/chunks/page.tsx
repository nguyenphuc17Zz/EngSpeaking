"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Mic,
  Square,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Volume2,
  Settings2,
  GitFork,
  Compass,
  ChevronDown,
  Trophy,
  CheckCircle2,
  X,
} from "lucide-react";

import { useChunkStore } from "@/stores/chunk-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { transcribeViaServer } from "@/lib/stt/service";
import { Waveform } from "@/components/voice/Waveform";

import { ChunkPromptCard } from "@/components/foundation/chunks/ChunkPromptCard";
import { ChunkContextCard } from "@/components/foundation/chunks/ChunkContextCard";
import { ChunkFeedbackCard } from "@/components/foundation/chunks/ChunkFeedbackCard";
import { MyChunksDrawer } from "@/components/foundation/chunks/MyChunksDrawer";
import { ChunkSummaryModal } from "@/components/foundation/chunks/ChunkSummaryModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import {
  PRESET_TOPICS,
} from "@/lib/foundation/sentence-builder/topics";
import type { PragmaticStrategyType } from "@/types/chunk-automaticity";

// ── Pragmatic Strategy Definitions ──────────────────────────────────────────
const PRAGMATIC_STRATEGIES: Array<{
  id: PragmaticStrategyType | "all";
  labelVi: string;
  descVi: string;
  badge: string;
  color: string;
}> = [
  {
    id: "all",
    labelVi: "Tất cả chiến lược",
    descVi: "AI tự chọn chiến lược phù hợp nhất theo từng ngữ cảnh.",
    badge: "Mặc định",
    color: "bg-primary/10 text-primary border-primary/30",
  },
  {
    id: "opinion_defense",
    labelVi: "Lập trường & Biện minh",
    descVi: "Buffer → Stance → Reason → Example. Dành cho tranh luận quan điểm rõ ràng.",
    badge: "Phổ biến",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  {
    id: "concession_counter",
    labelVi: "Nhượng bộ & Phản biện",
    descVi: "Buffer → Concession → Rebuttal → Resolution. Tranh luận 2 chiều tinh tế.",
    badge: "7.5+",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  },
  {
    id: "problem_solution",
    labelVi: "Chẩn đoán & Giải pháp",
    descVi: "Buffer → Problem → Solution → Impact. Dùng trong môi trường chuyên nghiệp.",
    badge: "Chiến lược",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  {
    id: "hypothetical_projection",
    labelVi: "Giả định & Hệ quả",
    descVi: "Buffer → Premise → Mechanism → Outcome. Tư duy phân tích & dự báo.",
    badge: "Phân tích",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  {
    id: "cause_effect_chain",
    labelVi: "Chuỗi nhân quả động",
    descVi: "Buffer → Trigger → Consequence → Elaboration. Giải thích cơ chế tác động.",
    badge: "Động",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  },
];

// ── Topic Icons (Lucide component mapping) ───────────────────────────────────
const TOPIC_ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="size-4" />,
  Coffee: <span className="text-base">☕</span>,
  Briefcase: <span className="text-base">💼</span>,
  Plane: <span className="text-base">✈️</span>,
  Utensils: <span className="text-base">🍽️</span>,
  ShoppingBag: <span className="text-base">🛍️</span>,
  Laptop: <span className="text-base">💻</span>,
  MessageCircle: <span className="text-base">💬</span>,
  HeartPulse: <span className="text-base">❤️</span>,
  GraduationCap: <span className="text-base">🎓</span>,
};

export default function ChunkAutomaticityPage() {
  const router = useRouter();
  const {
    mode,
    library,
    currentChainTask,
    currentSingleTask,
    selectedStrategy,
    setSelectedStrategy,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
    isGenerating,
    isRegeneratingAI,
    isEvaluating,
    setIsEvaluating,
    generationError,
    lastChainEvaluation,
    lastSingleEvaluation,
    completedTasksCount,
    currentTaskIndex,
    isSessionCompleted,
    sessionSummary,
    setMode,
    loadLibrary,
    fetchNextChainTask,
    fetchNextSingleTask,
    generateNewTaskWithAI,
    clearGenerationError,
    saveCustomChunk,
    processChainEvaluation,
    processSingleEvaluation,
    finishSessionManually,
    dismissSummary,
    resetSession,
  } = useChunkStore();

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [currentHintTier, setCurrentHintTier] = useState<number>(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingLatencyMs, setPendingLatencyMs] = useState<number>(2000);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // ── Topic Dialog State ────────────────────────────────────────────────────
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [localCustomTopic, setLocalCustomTopic] = useState(customTopicText || "");
  const [pendingTopicId, setPendingTopicId] = useState(selectedTopicId || "random");

  // ── Strategy Dialog State ─────────────────────────────────────────────────
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);

  const currentTopicLabel =
    PRESET_TOPICS.find((t) => t.id === selectedTopicId)?.labelVi ||
    (customTopicText ? customTopicText.slice(0, 24) : "Ngẫu nhiên đa dạng");

  const currentStrategyLabel =
    PRAGMATIC_STRATEGIES.find((s) => s.id === selectedStrategy)?.labelVi ||
    "Tất cả chiến lược";

  // ── Initialize ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLibrary();
    if (!currentChainTask && mode === "chain_builder") {
      fetchNextChainTask();
    } else if (!currentSingleTask && mode === "single_chunk") {
      fetchNextSingleTask();
    }
  }, [loadLibrary, currentChainTask, currentSingleTask, mode, fetchNextChainTask, fetchNextSingleTask]);

  // ── Track Prompt Display Time & Reset State on Task Change ────────────────
  useEffect(() => {
    setPromptDisplayTime(Date.now());
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    speechRec.stopListening();
    if (recorder.status === "recording") {
      recorder.cancel?.();
    }
  }, [currentChainTask?.id, currentSingleTask?.id]);

  // ── Recording Duration Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (recorder.status === "recording") {
      const recStart = Date.now();
      durationRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - recStart);
      }, 100);
    } else {
      if (durationRef.current) clearInterval(durationRef.current);
      setRecordingDurationMs(0);
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [recorder.status]);

  // ── Start Mic ─────────────────────────────────────────────────────────────
  const handleStartRecord = useCallback(async () => {
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setPendingSpokenText(null);
    const settings = useSettingsStore.getState();
    const isBrowserSTT = (settings.stt?.provider || "browser") === "browser";
    try {
      await recorder.start();
      if (isBrowserSTT) {
        speechRec.startListening();
      }
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [recorder, speechRec]);

  // ── Execute AI Evaluation ─────────────────────────────────────────────────
  const executeEvaluation = useCallback(
    async (spokenText: string, measuredLatency: number) => {
      if (!spokenText.trim()) return;

      setIsEvaluating(true);
      try {
        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.generation?.provider || settings.activeProvider || "gemini";
          model =
            settings.generation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        const res = await fetch("/api/foundation/chunks/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            task: mode === "chain_builder" ? currentChainTask : currentSingleTask,
            userTranscript: spokenText,
            responseLatencyMs: measuredLatency,
            provider,
            model,
          }),
        });

        const data = await res.json();
        if (data.evaluation) {
          soundEffects.playAIReady();
          if (mode === "chain_builder") {
            processChainEvaluation(data.evaluation);
          } else {
            processSingleEvaluation(data.evaluation);
          }
        } else {
          toast.error("Lỗi đánh giá", data.error || "Không thể hoàn tất đánh giá lúc này.");
        }
      } catch {
        toast.error("Lỗi đánh giá", "Không thể hoàn tất đánh giá lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [
      mode,
      currentChainTask,
      currentSingleTask,
      processChainEvaluation,
      processSingleEvaluation,
      setIsEvaluating,
    ]
  );

  // ── Stop Mic ──────────────────────────────────────────────────────────────
  const handleStopRecord = useCallback(async () => {
    soundEffects.playMicStop();
    speechRec.stopListening();

    const settings = useSettingsStore.getState();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

    if (recorder.status === "recording") {
      try {
        const recording = await recorder.stop();
        let spokenText = "";

        if (sttProvider !== "browser" && recording?.blob) {
          try {
            const res = await transcribeViaServer(recording.blob, {
              provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
              model: sttModel,
              language: "en-US",
            });
            spokenText = res.text.trim();
          } catch {
            spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
          }
        } else {
          await new Promise((r) => setTimeout(r, 400));
          spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }

        if (!spokenText) {
          toast.error("Chưa nhận diện được giọng nói", "Vui lòng bấm mic và nói lại.");
          return;
        }

        setPendingSpokenText(spokenText);
        setPendingLatencyMs(measuredLatency);
      } catch {
        toast.error("Lỗi xử lý", "Không thể dừng micro.");
      }
    } else {
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      if (spokenText) {
        setPendingSpokenText(spokenText);
        setPendingLatencyMs(measuredLatency);
      }
    }
  }, [recorder, speechRec, promptDisplayTime]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await executeEvaluation(pendingSpokenText, pendingLatencyMs);
  }, [pendingSpokenText, pendingLatencyMs, executeEvaluation]);

  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  const handleContinue = () => {
    setPendingSpokenText(null);
    speechRec.resetTranscript();
    if (mode === "chain_builder") {
      fetchNextChainTask();
    } else {
      fetchNextSingleTask();
    }
  };

  const handleRetryCurrent = () => {
    useChunkStore.setState({ lastChainEvaluation: null, lastSingleEvaluation: null });
    setPendingSpokenText(null);
    speechRec.resetTranscript();
    setPromptDisplayTime(Date.now());
  };

  // ── Restart after Summary ─────────────────────────────────────────────────
  const handleRestartAfterSummary = () => {
    resetSession();
    dismissSummary();
    fetchNextChainTask();
  };

  // ── Apply Topic ───────────────────────────────────────────────────────────
  const handleApplyTopic = () => {
    setSelectedTopic(pendingTopicId, localCustomTopic);
    setIsTopicDialogOpen(false);
  };

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (isTopicDialogOpen || isStrategyDialogOpen) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastChainEvaluation || lastSingleEvaluation) {
          handleRetryCurrent();
        } else if (recorder.status === "recording") {
          handleStopRecord();
        } else if (pendingSpokenText) {
          handleReRecord();
        } else if (!isEvaluating && !isGenerating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        speechRec.resetTranscript();
        setPendingSpokenText(null);
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !lastChainEvaluation && !lastSingleEvaluation && !isEvaluating) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.code === "KeyR" && recorder.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleContinue();
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastChainEvaluation || lastSingleEvaluation) {
          e.preventDefault();
          handleContinue();
        }
      } else if (e.code === "Escape") {
        if (isLibraryOpen) {
          e.preventDefault();
          setIsLibraryOpen(false);
        } else if (currentHintTier > 0) {
          e.preventDefault();
          setCurrentHintTier(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    lastChainEvaluation,
    lastSingleEvaluation,
    recorder.status,
    isEvaluating,
    isGenerating,
    pendingSpokenText,
    isLibraryOpen,
    isTopicDialogOpen,
    isStrategyDialogOpen,
    currentHintTier,
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    router,
    speechRec,
  ]);

  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col bg-background overflow-hidden select-none">
      {/* ── Studio Header ─────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full hover:bg-muted"
              title="Thoát Studio"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground hidden sm:block">
              Chunk Automaticity Studio
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono hidden lg:inline-flex">
              {mode === "chain_builder" ? "Speech Chain Assembly" : "Progressive Recall"}
            </Badge>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              onClick={() => {
                setMode("chain_builder");
                setPendingSpokenText(null);
                fetchNextChainTask();
              }}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-semibold transition-all",
                mode === "chain_builder"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              4 Khối
            </button>
            <button
              onClick={() => {
                setMode("single_chunk");
                setPendingSpokenText(null);
                fetchNextSingleTask();
              }}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-semibold transition-all",
                mode === "single_chunk"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recall T1-T4
            </button>
          </div>

          {/* Topic Selector Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPendingTopicId(selectedTopicId || "random");
              setLocalCustomTopic(customTopicText || "");
              setIsTopicDialogOpen(true);
            }}
            className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-border/80 hidden md:inline-flex max-w-[150px]"
            title="Chọn chủ đề luyện tập"
          >
            <Compass className="size-3.5 shrink-0" />
            <span className="truncate">{currentTopicLabel}</span>
            <ChevronDown className="size-3 shrink-0 opacity-60" />
          </Button>

          {/* Strategy Selector Button */}
          {mode === "chain_builder" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStrategyDialogOpen(true)}
              className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-border/80 hidden lg:inline-flex max-w-[160px]"
              title="Chọn mô hình lập luận"
            >
              <GitFork className="size-3.5 shrink-0" />
              <span className="truncate">{currentStrategyLabel}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" />
            </Button>
          )}

          {/* Session Counter */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border/60 text-xs font-mono">
            <span className="text-muted-foreground">Câu #{currentTaskIndex}</span>
            {completedTasksCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-emerald-600 font-semibold">✓ {completedTasksCount}</span>
              </>
            )}
          </div>

          {/* My Chunks */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLibraryOpen(true)}
            className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-border/80 hidden lg:inline-flex"
          >
            <BookOpen className="size-3.5" />
            <span>My Chunks ({library.length})</span>
          </Button>

          {/* Next Chain */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleContinue}
            disabled={isGenerating || isEvaluating}
            className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            title="Chuỗi tiếp (phím R)"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Tiếp [R]</span>
          </Button>

          {/* Finish & Summary */}
          {completedTasksCount > 0 && (
            <Button
              size="sm"
              onClick={finishSessionManually}
              className="rounded-xl text-xs font-bold h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30"
              title="Kết thúc & Xem kết quả"
            >
              <Trophy className="size-3.5" />
              <span className="hidden sm:inline">Kết thúc</span>
            </Button>
          )}

          <GlobalAiSelector size="sm" />
        </div>
      </header>

      {/* ── Main Studio Body ───────────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden min-h-0">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
          {/* Column 1 (4 cols): Prompt Card */}
          <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
            {isGenerating ? (
              <Card className="h-full rounded-3xl border border-border/80 bg-card p-6 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="size-7 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    AI đang thiết kế chuỗi khối Speech Chain...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chuẩn bị 4 khối kết nối tự nhiên theo chủ đề {currentTopicLabel}
                  </p>
                </div>
                <Skeleton className="h-32 w-full rounded-2xl mt-4" />
              </Card>
            ) : generationError ? (
              <Card className="h-full rounded-3xl border border-red-500/30 bg-red-500/5 p-6 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="size-12 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Không thể tạo bài tập từ AI</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">{generationError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      clearGenerationError();
                      if (mode === "chain_builder") fetchNextChainTask();
                      else fetchNextSingleTask();
                    }}
                    className="rounded-xl font-bold text-xs gap-1.5 h-9 px-4 btn-spring"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Thử lại ngay</span>
                  </Button>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs h-9 px-3 gap-1.5">
                      <Settings2 className="size-3.5" />
                      <span>Cài đặt AI Model</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <ChunkPromptCard
                mode={mode}
                chainTask={currentChainTask}
                singleTask={currentSingleTask}
                currentHintTier={currentHintTier}
                onSelectHintTier={setCurrentHintTier}
                onNextTask={handleContinue}
                isGeneratingNext={isGenerating}
                onRegenerateAI={generateNewTaskWithAI}
                isRegeneratingAI={isRegeneratingAI}
              />
            )}
          </div>

          {/* Column 2 (5 cols): Context Card */}
          <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
            <ChunkContextCard
              mode={mode}
              chainTask={currentChainTask}
              singleTask={currentSingleTask}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          </div>

          {/* Column 3 (3 cols): Speaking Controller OR Feedback */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
            {lastChainEvaluation || lastSingleEvaluation ? (
              <ChunkFeedbackCard
                chainEvaluation={lastChainEvaluation}
                singleEvaluation={lastSingleEvaluation}
                onRetry={handleRetryCurrent}
                onContinue={handleContinue}
              />
            ) : (
              <SpeakingController
                compact={true}
                status={
                  isEvaluating
                    ? "processing"
                    : recorder.status === "recording"
                    ? "recording"
                    : "idle"
                }
                isListening={speechRec.isListening}
                liveTranscript={speechRec.fullTranscript || speechRec.transcript}
                durationMs={recordingDurationMs}
                autoStartMic={autoStartMic}
                onToggleAutoStartMic={setAutoStartMic}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
                onSubmitTextFallback={(text) => executeEvaluation(text, 1500)}
                onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1))}
                isEvaluating={isEvaluating}
                onResetLiveTranscript={() => {
                  speechRec.resetTranscript();
                  setPendingSpokenText(null);
                }}
                pendingText={pendingSpokenText}
                onConfirmSubmit={handleConfirmSubmit}
                onReRecord={handleReRecord}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Studio Footer Dock ─────────────────────────────────────────────── */}
      <footer className="h-10 border-t border-border/40 px-4 sm:px-6 flex items-center justify-between bg-card/40 backdrop-blur-xs text-[11px] text-muted-foreground font-mono shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Space</kbd>
            <span>
              {lastChainEvaluation || lastSingleEvaluation
                ? "Nói lại"
                : pendingSpokenText
                ? "Thu âm lại"
                : recorder.status === "recording"
                ? "Dừng nói"
                : "Bật mic"}
            </span>
          </span>
          {recorder.status === "recording" && (
            <span className="flex items-center gap-1.5 text-red-500 font-semibold animate-pulse">
              <kbd className="px-1 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 text-[10px]">
                Backspace
              </kbd>
              <span>Xóa câu dở</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">H</kbd>
            <span>Đổi gợi ý T1-T4</span>
          </span>
          {pendingSpokenText && !isEvaluating && (
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <kbd className="px-1 py-0.5 rounded bg-primary text-primary-foreground border text-[10px]">Enter</kbd>
              <span>Nộp bài chấm điểm</span>
            </span>
          )}
          {(lastChainEvaluation || lastSingleEvaluation) && (
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <kbd className="px-1 py-0.5 rounded bg-primary text-primary-foreground border text-[10px]">Enter</kbd>
              <span>Chuỗi tiếp theo</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">R</kbd>
            <span>Chuỗi mới</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd>
            <span>Thoát Studio</span>
          </span>
        </div>

        <span className="hidden sm:inline text-primary font-bold">
          100% Real Dynamic AI Engine
        </span>
      </footer>

      {/* ── My Chunks Drawer ───────────────────────────────────────────────── */}
      <MyChunksDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        library={library}
        onSaveCustomChunk={saveCustomChunk}
        onSelectChunkForPractice={(chunk) => {
          setMode("single_chunk");
          fetchNextSingleTask(chunk);
        }}
      />

      {/* ── Chunk Summary Modal ────────────────────────────────────────────── */}
      <ChunkSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        onRestart={handleRestartAfterSummary}
        onDismiss={dismissSummary}
      />

      {/* ── Topic Selector Dialog ──────────────────────────────────────────── */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Compass className="size-4 text-primary" />
              Chọn chủ đề luyện tập
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setPendingTopicId(topic.id)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all hover:scale-[1.02]",
                    pendingTopicId === topic.id
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border/60 bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{TOPIC_ICON_MAP[topic.icon] ?? "📚"}</span>
                    {pendingTopicId === topic.id && (
                      <CheckCircle2 className="size-3.5 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{topic.labelVi}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                    {topic.descriptionVi}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Topic Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Hoặc nhập tình huống tự do
              </label>
              <textarea
                className="w-full rounded-2xl border border-border/70 bg-muted/30 text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 transition-all"
                rows={2}
                placeholder='Ví dụ: "Đàm phán tăng lương với sếp trong buổi 1-1 cuối năm..."'
                value={localCustomTopic}
                onChange={(e) => {
                  setLocalCustomTopic(e.target.value);
                  if (e.target.value.trim()) setPendingTopicId("random");
                }}
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button
              className="flex-1 rounded-2xl font-bold h-10 gap-2 btn-spring"
              onClick={handleApplyTopic}
            >
              <CheckCircle2 className="size-4" />
              Áp dụng chủ đề
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl h-10 px-4 border-border/80"
              onClick={() => setIsTopicDialogOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Strategy Selector Dialog ───────────────────────────────────────── */}
      <Dialog open={isStrategyDialogOpen} onOpenChange={setIsStrategyDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <GitFork className="size-4 text-primary" />
              Chọn mô hình lập luận (Pragmatic Strategy)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {PRAGMATIC_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => {
                  setSelectedStrategy(strategy.id as PragmaticStrategyType | "all");
                  setIsStrategyDialogOpen(false);
                }}
                className={cn(
                  "w-full p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] flex items-start gap-3",
                  selectedStrategy === strategy.id
                    ? "border-primary bg-primary/8 shadow-sm"
                    : "border-border/60 bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-foreground">{strategy.labelVi}</span>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", strategy.color)}>
                      {strategy.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{strategy.descVi}</p>
                </div>
                {selectedStrategy === strategy.id && (
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
