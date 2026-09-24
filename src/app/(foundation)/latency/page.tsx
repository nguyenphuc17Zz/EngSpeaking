"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  Zap,
  Clock,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Target,
  Flame,
  Sparkles,
  BarChart3,
  Loader2,
  AlertTriangle,
  X,
  Play,
  RefreshCw,
  Settings2,
  Compass,
  ChevronDown,
  Wand2,
  Check,
  Trophy,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Laptop,
  MessageCircle,
  HeartPulse,
  GraduationCap,
  Shuffle,
} from "lucide-react";

import {
  PRESET_TOPICS,
  getTopicDisplay,
} from "@/lib/foundation/sentence-builder/topics";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Laptop,
  MessageCircle,
  HeartPulse,
  GraduationCap,
  Shuffle,
};

const DRILL_MODES: Array<{
  id: LatencyDrillMode;
  label: string;
  sub: string;
  targetDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "open_response",
    label: "Open Response",
    sub: "Câu hỏi mở tự nhiên",
    targetDesc: "~3.0s target",
    icon: Target,
  },
  {
    id: "rapid_retrieval",
    label: "Rapid Fire",
    sub: "Phản xạ chớp nhoáng",
    targetDesc: "<1.8s target",
    icon: Flame,
  },
  {
    id: "timed_countdown",
    label: "Timed Countdown",
    sub: "Bậc thang đếm lùi",
    targetDesc: "Rút ngắn dần",
    icon: Clock,
  },
  {
    id: "baseline_test",
    label: "Baseline Test",
    sub: "Đo chuẩn mốc phản xạ",
    targetDesc: "10 câu chuẩn hóa",
    icon: BarChart3,
  },
];

import { useLatencyStore } from "@/stores/latency-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { computeFastPassLatencyMatch } from "@/lib/foundation/latency/fast-pass.service";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { LatencyPromptCard } from "@/components/foundation/latency/LatencyPromptCard";
import { LatencyContextCard } from "@/components/foundation/latency/LatencyContextCard";
import { LatencyFeedbackCard } from "@/components/foundation/latency/LatencyFeedbackCard";
import { LatencySummaryModal } from "@/components/foundation/latency/LatencySummaryModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import type { LatencyDrillMode } from "@/types/latency-training";

export default function LatencyTrainingPage() {
  const router = useRouter();
  const {
    currentTask,
    isGenerating,
    isEvaluating,
    setIsEvaluating,
    isRegeneratingAI,
    currentDrillMode,
    targetCount,
    currentTaskIndex,
    completedTasksCount,
    isSessionCompleted,
    sessionSummary,
    lastEvaluation,
    adaptiveState,
    generationError,
    clearGenerationError,
    initSession,
    setDrillMode,
    finishSessionManually,
    generateNewTaskWithAI,
    processEvaluation,
    advanceToNextTask,
    resetSession,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
  } = useLatencyStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");

  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [speechStartTimestamp, setSpeechStartTimestamp] = useState<number | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [detectedSpeechOnsetMs, setDetectedSpeechOnsetMs] = useState<number | null>(null);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingLatencyMs, setPendingLatencyMs] = useState<number>(2000);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(1000);

  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const speechDurationRef = useRef<NodeJS.Timeout | null>(null);

  // Zero-Lobby: Automatically initialize Endless Mode on first mount if no task
  useEffect(() => {
    if (!currentTask && !isGenerating && !generationError) {
      initSession("open_response", 0);
    }
  }, [currentTask, isGenerating, generationError, initSession]);

  useEffect(() => {
    if (selectedTopicId === "custom") {
      setCustomInputVal(customTopicText || "");
    }
  }, [selectedTopicId, customTopicText]);

  // Stopwatch routine for measuring response latency
  useEffect(() => {
    if (!currentTask || lastEvaluation || isSessionCompleted) {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      return;
    }

    const t0 = Date.now();
    setPromptDisplayTime(t0);
    setElapsedMs(0);
    setSpeechStartTimestamp(null);
    setDetectedSpeechOnsetMs(null);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }

    stopwatchRef.current = setInterval(() => {
      setElapsedMs(Date.now() - t0);
    }, 30);

    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [currentTask?.id, lastEvaluation, isSessionCompleted]);

  // Speech Duration Tracker while recording
  useEffect(() => {
    if (unifiedSTT.isListening) {
      const recStart = Date.now();
      speechDurationRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - recStart);
      }, 100);
    } else {
      if (speechDurationRef.current) clearInterval(speechDurationRef.current);
      setRecordingDurationMs(0);
    }
    return () => {
      if (speechDurationRef.current) clearInterval(speechDurationRef.current);
    };
  }, [unifiedSTT.isListening]);

  // Speech-Onset VAD detector: captures millisecond when user first utters sound
  useEffect(() => {
    if (unifiedSTT.isListening && detectedSpeechOnsetMs === null) {
      const live = (unifiedSTT.fullTranscript || unifiedSTT.transcript).trim();
      if (live.length > 0) {
        const onset = Math.max(300, Date.now() - promptDisplayTime);
        setDetectedSpeechOnsetMs(onset);
      }
    }
  }, [unifiedSTT.isListening, unifiedSTT.fullTranscript, unifiedSTT.transcript, detectedSpeechOnsetMs, promptDisplayTime]);

  // Start Mic
  const handleStartRecord = useCallback(async () => {
    const tSpeech = Date.now();
    setSpeechStartTimestamp(tSpeech);
    setRecordingStartTime(tSpeech);
    if (stopwatchRef.current) clearInterval(stopwatchRef.current);

    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);

    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, []);

  // Submit attempt for AI evaluation (Fast-Pass <30ms with deep fallback)
  const submitAttemptForEvaluation = useCallback(
    async (spokenText: string, measuredLatencyMs: number, measuredDurationMs: number) => {
      if (!currentTask) return;

      setIsEvaluating(true);
      try {
        const targetLatencyMs =
          adaptiveState.currentTargetLatencyMs ??
          currentTask.staircaseTargetMs ??
          currentTask.targetLatencyMs ??
          3000;

        // 1. Fast-Pass Instant Semantic Matching (<30ms)
        const fastPassResult = computeFastPassLatencyMatch(currentTask, spokenText, {
          responseLatencyMs: measuredLatencyMs,
          speechDurationMs: measuredDurationMs,
          speechOnsetMs: detectedSpeechOnsetMs ?? measuredLatencyMs,
          targetLatencyMs,
        });

        if (fastPassResult.canFastPass) {
          soundEffects.playAIReady();
          processEvaluation(fastPassResult.evaluation);
          return;
        }

        // 2. Tier 2 Deep LLM Evaluation Fallback
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

        const res = await fetch("/api/foundation/latency/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: currentTask,
            userTranscript: spokenText,
            responseLatencyMs: measuredLatencyMs,
            speechDurationMs: measuredDurationMs,
            speechOnsetMs: detectedSpeechOnsetMs ?? measuredLatencyMs,
            provider,
            model,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.evaluation) {
          throw new Error(data.error || "Không thể đánh giá độ trễ");
        }

        soundEffects.playAIReady();
        processEvaluation(data.evaluation);
      } catch (err) {
        toast.error("Lỗi đánh giá", err instanceof Error ? err.message : "Không thể hoàn thành chấm điểm lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [currentTask, adaptiveState.currentTargetLatencyMs, detectedSpeechOnsetMs, processEvaluation, setIsEvaluating]
  );

  // Stop Mic -> Do NOT send immediately, store in pending review state
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening || !currentTask) return;

    soundEffects.playMicStop();
    const durationMs = Math.max(600, Date.now() - recordingStartTime);
    const measuredLatencyMs = detectedSpeechOnsetMs ?? Math.max(400, (speechStartTimestamp || Date.now()) - promptDisplayTime);

    try {
      const { text: spokenText } = await unifiedSTTRef.current.stopListening();

      if (!spokenText || !spokenText.trim()) {
        toast.error("Chưa ghi nhận được âm thanh", "Vui lòng bấm mic và nói lại câu.");
        return;
      }

      setPendingSpokenText(spokenText.trim());
      setPendingLatencyMs(measuredLatencyMs);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi hoàn thành thu âm", "Hãy thử nói lại câu.");
    }
  }, [
    currentTask,
    recordingStartTime,
    detectedSpeechOnsetMs,
    speechStartTimestamp,
    promptDisplayTime,
  ]);

  // Confirm submit pending speech
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await submitAttemptForEvaluation(pendingSpokenText, pendingLatencyMs, pendingDurationMs);
  }, [pendingSpokenText, pendingLatencyMs, pendingDurationMs, submitAttemptForEvaluation]);

  // Re-record
  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  // Continue to Next Task
  const handleContinueTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    setCurrentHintTier(0);
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Skip / Next Task
  const handleSkipOrNextTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    setCurrentHintTier(0);
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Exit Studio
  const handleExitStudio = () => {
    if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }
    resetSession();
    setIsEvaluating(false);
    setPendingSpokenText(null);
    setCurrentHintTier(0);
    router.push("/");
  };

  // Finish session manually & view results
  const handleFinishSession = () => {
    if (completedTasksCount === 0 && !currentTask) {
      toast.info("Bạn chưa hoàn thành câu nào trong buổi tập này.");
      return;
    }
    finishSessionManually();
  };

  // Switch drill mode
  const handleModeChange = async (mode: LatencyDrillMode) => {
    if (mode === currentDrillMode) {
      setIsDrillModalOpen(false);
      return;
    }
    setIsDrillModalOpen(false);
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    await setDrillMode(mode);
    const modeLabel = DRILL_MODES.find((m) => m.id === mode)?.label || mode;
    toast.success("Đã chuyển chế độ", modeLabel);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      // Space: Toggle Mic / Re-record / Retry
      if (e.code === "Space") {
        e.preventDefault();
        if (currentTask && !lastEvaluation) {
          if (unifiedSTTRef.current.isListening) {
            handleStopRecord();
          } else if (pendingSpokenText) {
            handleReRecord();
          } else if (!isEvaluating) {
            handleStartRecord();
          }
        } else if (lastEvaluation) {
          // Retry same task
          useLatencyStore.setState({ lastEvaluation: null });
          setPendingSpokenText(null);
          setCurrentHintTier(0);
        }
      }

      // Backspace: Reset live transcript while recording
      if (e.code === "Backspace") {
        if (unifiedSTTRef.current.isListening) {
          e.preventDefault();
          unifiedSTTRef.current.resetTranscript();
          setPendingSpokenText(null);
          soundEffects.playMicStop();
        }
      }

      // Key H: Cycle Hints (0 -> 1 -> 2 -> 3 -> 4 -> 0)
      if (e.code === "KeyH" && !isEvaluating) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      }

      // Key R: Skip to next task
      if (e.code === "KeyR" && !unifiedSTTRef.current.isListening && !isEvaluating) {
        e.preventDefault();
        handleSkipOrNextTask();
      }

      // Enter: Confirm pending submit or Advance to next question
      if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastEvaluation) {
          e.preventDefault();
          handleContinueTask();
        }
      }

      // Esc: Collapse hint or Exit Studio
      if (e.code === "Escape") {
        e.preventDefault();
        if (currentHintTier > 0) {
          setCurrentHintTier(0);
        } else {
          handleExitStudio();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentTask,
    lastEvaluation,
    currentHintTier,
    isEvaluating,
    pendingSpokenText,
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    handleContinueTask,
    handleSkipOrNextTask,
  ]);

  const liveText = unifiedSTT.fullTranscript || unifiedSTT.transcript;
  const currentModeInfo = DRILL_MODES.find((m) => m.id === currentDrillMode) || DRILL_MODES[0];

  // ==================== 0. ERROR STATE (AI generation failed) ====================
  if (generationError && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-5 max-w-xl mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-foreground">Không thể tạo bài tập từ AI</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {generationError}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => {
              clearGenerationError();
              initSession(currentDrillMode, 0);
            }}
            className="gap-2 rounded-xl btn-spring"
          >
            <RefreshCw className="size-4" />
            <span>Thử lại ngay</span>
          </Button>
          <Link href="/settings">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Settings2 className="size-4" />
              <span>Kiểm tra API Key & Model</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleExitStudio}
            className="rounded-xl"
          >
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // ==================== 1. ZERO-LOBBY STUDIO VIEW ====================
  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden text-foreground rounded-3xl border border-border/80 bg-card shadow-xs">
      {/* Studio Top Header Bar */}
      <header className="h-13 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitStudio}
            className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Thoát phòng tập (Esc)"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Rời Studio</span>
          </Button>

          <div className="h-4 w-px bg-border/60 hidden sm:block shrink-0" />

          {/* Topic Selector Button */}
          <button
            type="button"
            onClick={() => setIsTopicModalOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs shrink-0 max-w-[130px] sm:max-w-[180px]"
            title="Đổi chủ đề / ngữ cảnh luyện phản xạ"
          >
            <Compass className="size-3.5 text-primary shrink-0" />
            <span className="truncate">
              {
                getTopicDisplay(
                  selectedTopicId === "custom" && customTopicText
                    ? `custom_scenario: ${customTopicText}`
                    : currentTask?.topic || selectedTopicId
                ).label
              }
            </span>
            <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
          </button>

          {/* Drill Mode Switcher Button */}
          <button
            type="button"
            onClick={() => setIsDrillModalOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
            title="Chuyển chế độ luyện phản xạ tốc độ"
          >
            <currentModeInfo.icon className="size-3.5 text-amber-500" />
            <span className="hidden md:inline">{currentModeInfo.label}</span>
            <ChevronDown className="size-3 opacity-60 ml-0.5" />
          </button>

          <div className="hidden lg:block shrink-0">
            <GlobalAiSelector size="sm" />
          </div>
        </div>

        {/* Right Header: Next Task Button + Progress Bar + Finish Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="lg:hidden">
            <GlobalAiSelector size="sm" />
          </div>

          {/* Next Task Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipOrNextTask}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 transition-all shadow-2xs btn-spring shrink-0 cursor-pointer"
            title="Đổi sang câu hỏi tiếp theo (Phím R)"
          >
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>Câu tiếp theo</span>
            <ArrowRight className="size-3.5 hidden sm:inline" />
            <span className="text-[9px] font-mono opacity-60 hidden md:inline">[R]</span>
          </Button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">
              {targetCount > 0
                ? `${currentTaskIndex + 1}/${targetCount}`
                : `Câu #${currentTaskIndex + 1}`}
            </span>
            {targetCount === 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 hidden sm:inline-flex"
              >
                Đã xong {completedTasksCount}
              </Badge>
            ) : (
              <div className="w-16 sm:w-20">
                <Progress
                  value={((currentTaskIndex + 1) / targetCount) * 100}
                  className="h-1.5 rounded-full"
                />
              </div>
            )}
          </div>

          {/* Finish & View Results Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFinishSession}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 transition-all shadow-2xs btn-spring"
            title="Kết thúc buổi tập và xem báo cáo tổng kết"
          >
            <Trophy className="size-3.5" />
            <span className="hidden sm:inline">Kết thúc & Xem kết quả</span>
            <span className="sm:hidden">Nghỉ tập</span>
          </Button>
        </div>
      </header>

      {/* Generation Error Banner */}
      {generationError && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-between text-xs text-destructive shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{generationError}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => useLatencyStore.getState().fetchFirstTask()}
              className="h-6 px-2 text-[11px] border-destructive/30 hover:bg-destructive/10 text-destructive"
            >
              Thử lại ngay
            </Button>
            <Link href="/settings">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
              >
                Kiểm tra API Key
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearGenerationError}
              className="size-6 p-0 text-destructive"
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Studio Main Body: Professional 3-Column Split */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 p-2.5 sm:p-3.5 overflow-hidden">
        {/* Column 1 (4 cols): Prompt & Millisecond Stopwatch Gauge */}
        <section className="lg:col-span-4 h-full overflow-hidden flex flex-col min-h-0">
          {currentTask ? (
            <LatencyPromptCard
              task={currentTask}
              currentTaskIndex={currentTaskIndex}
              totalTasks={targetCount}
              isRecording={unifiedSTT.isListening}
              elapsedMs={elapsedMs}
              rapidStreak={adaptiveState.rapidStreak}
              staircaseTargetMs={adaptiveState.currentTargetLatencyMs}
              onNextTask={handleSkipOrNextTask}
              isGeneratingNext={isGenerating}
              onRegenerateWithAI={generateNewTaskWithAI}
              isRegeneratingAI={isRegeneratingAI}
            />
          ) : (
            <Card className="rounded-3xl border border-border/80 bg-card p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="size-8 text-amber-500 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  AI đang chuẩn bị câu hỏi phản xạ tiếp theo...
                </h3>
                <p className="text-xs text-muted-foreground">
                  Đo độ trễ chính xác từ mốc hiển thị đầu tiên.
                </p>
              </div>
            </Card>
          )}
        </section>

        {/* Column 2 (5 cols): Buffer Phrases, Model Answer & Progressive Hints */}
        <section className="lg:col-span-5 h-full overflow-hidden flex flex-col min-h-0">
          {currentTask && (
            <LatencyContextCard
              task={currentTask}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          )}
        </section>

        {/* Column 3 (3 cols): Compact Speaking Controller or Feedback */}
        <section className="lg:col-span-3 h-full overflow-hidden flex flex-col min-h-0">
          {!lastEvaluation ? (
            <SpeakingController
              compact
              status={unifiedSTT.isListening ? "recording" : "idle"}
              isListening={unifiedSTT.isListening}
              liveTranscript={liveText}
              durationMs={recordingDurationMs}
              autoStartMic={autoStartMic}
              onToggleAutoStartMic={setAutoStartMic}
              onStartRecord={handleStartRecord}
              onStopRecord={handleStopRecord}
              onSubmitTextFallback={(text) => {
                submitAttemptForEvaluation(text, 2000, 2000);
              }}
              onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 1 : prev + 1))}
              isEvaluating={isEvaluating}
              onResetLiveTranscript={() => {
                unifiedSTTRef.current.resetTranscript();
                setPendingSpokenText(null);
              }}
              pendingText={pendingSpokenText}
              onConfirmSubmit={handleConfirmSubmit}
              onReRecord={handleReRecord}
            />
          ) : (
            <LatencyFeedbackCard
              evaluation={lastEvaluation}
              onContinue={handleContinueTask}
              onRetry={() => {
                useLatencyStore.setState({ lastEvaluation: null });
                setPendingSpokenText(null);
                setCurrentHintTier(0);
              }}
            />
          )}
        </section>
      </main>

      {/* Studio Footer Keybindings Dock */}
      <footer className="h-9 border-t border-border/40 bg-card/80 px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <span className="flex items-center gap-1 font-mono">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
              Space
            </kbd>
            <span>{lastEvaluation ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Nói / Dừng"}</span>
          </span>
          <span className="flex items-center gap-1 font-mono hidden sm:inline-flex">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
              Backspace
            </kbd>
            <span>Xóa nói lại</span>
          </span>
          <span className="flex items-center gap-1 font-mono">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
              H
            </kbd>
            <span>Đổi gợi ý</span>
          </span>
          {pendingSpokenText && !isEvaluating ? (
            <span className="flex items-center gap-1 font-mono text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground border text-[10px] font-bold">
                Enter
              </kbd>
              <span>Nộp bài chấm điểm</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono hidden md:inline-flex">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                Enter
              </kbd>
              <span>Câu tiếp</span>
            </span>
          )}
          <span className="flex items-center gap-1 font-mono">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
              Esc
            </kbd>
            <span>Đóng gợi ý / Thoát</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="hidden md:inline">Response Latency Active</span>
        </div>
      </footer>

      {/* In-Studio Topic Selector Dialog */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <span>Đổi chủ đề luyện tập phản xạ</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn một ngữ cảnh có sẵn hoặc tự gõ bất kỳ tình huống nào bạn muốn AI tạo câu hỏi phản xạ.
            </DialogDescription>
          </DialogHeader>

          {/* Preset Topics Grid */}
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
                    <span className="text-xs font-bold text-foreground block truncate">
                      {topic.labelVi}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">
                      {topic.labelEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Topic Input */}
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
                placeholder="Ví dụ: Đặt khách sạn ở Tokyo, Mua trà sữa ít ngọt, Phỏng vấn xin việc..."
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

      {/* In-Studio Drill Mode Selector Dialog */}
      <Dialog open={isDrillModalOpen} onOpenChange={setIsDrillModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="size-5 text-amber-500 fill-amber-500" />
              <span>Chọn kiểu bài tập phản xạ</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thay đổi áp lực thời gian và mục tiêu độ trễ để rèn luyện các tầng phản xạ khác nhau.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 pt-1">
            {DRILL_MODES.map((mode) => {
              const IconComp = mode.icon;
              const isSelected = currentDrillMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left btn-spring ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-xs"
                      : "border-border/70 bg-card hover:border-amber-500/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconComp className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {mode.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {mode.sub}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className="text-[10px] font-mono shrink-0"
                  >
                    {mode.targetDesc}
                  </Badge>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Summary Modal */}
      <LatencySummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        onRestart={() => {
          resetSession();
          initSession(currentDrillMode, 0);
        }}
      />
    </div>
  );
}
