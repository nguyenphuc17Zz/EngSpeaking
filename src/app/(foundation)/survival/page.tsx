"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Trophy,
  Settings2,
  X,
  Compass,
  ChevronDown,
  Wand2,
  Check,
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
  Flame,
  RefreshCw,
} from "lucide-react";
import { PRESET_TOPICS, getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";

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

import { useSurvivalStore } from "@/stores/survival-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";

import { SurvivalPromptCard } from "@/components/foundation/survival/SurvivalPromptCard";
import { SurvivalContextCard } from "@/components/foundation/survival/SurvivalContextCard";
import { SurvivalFeedbackCard } from "@/components/foundation/survival/SurvivalFeedbackCard";
import { SurvivalSessionSummaryModal } from "@/components/foundation/survival/SurvivalSessionSummaryModal";

export default function SurvivalSpeakingPage() {
  const router = useRouter();
  const {
    mode,
    currentCircumTask,
    currentScenarioTask,
    isGenerating,
    isRegeneratingAI,
    isEvaluating,
    setIsEvaluating,
    generationError,
    lastEvaluation,
    sessionHistory,
    currentTaskIndex,
    sessionConfig,
    completedTasksCount,
    isSessionCompleted,
    sessionSummary,
    hintTier,
    setHintTier,
    attemptCount,
    incrementAttempt,
    autoStartMic,
    setAutoStartMic,
    prepCountdown,
    setPrepCountdown,
    isCountingDown,
    setIsCountingDown,
    adaptiveState,
    skillMastery,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
    setMode,
    clearGenerationError,
    initSession,
    finishSessionManually,
    fetchCurrentKindTask,
    generateNewTaskWithAI,
    processEvaluation,
    advanceToNextTask,
    resetSession,
    resetSessionStats,
    getSessionSummary,
  } = useSurvivalStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;
  const tts = useBrowserTTS();

  const currentTask = mode === "circumlocution" ? currentCircumTask : currentScenarioTask;

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2000);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // Zero-Lobby: auto init endless session (chuẩn SB/VN-EN)
  useEffect(() => {
    if (!currentTask && !isGenerating && !generationError) {
      initSession("endless");
    }
  }, [currentTask, isGenerating, generationError, initSession]);

  useEffect(() => {
    if (selectedTopicId === "custom") {
      setCustomInputVal(customTopicText || "");
    }
  }, [selectedTopicId, customTopicText]);

  // Reset mic & prompt display time on task switch
  useEffect(() => {
    setPromptDisplayTime(Date.now());
    setPendingSpokenText(null);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCircumTask?.id, currentScenarioTask?.id]);

  // Unified countdown timer (prepCountdown when autoStartMic is true, 5s challenge countdown otherwise)
  useEffect(() => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!currentTask || lastEvaluation || isSessionCompleted) {
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }

    if (autoStartMic) {
      setIsCountingDown(true);
      const prepSec = Math.round(
        currentTask.prepTimeSec ?? adaptiveState.prepTimeSec ?? 2.5
      );
      let count = Math.max(1, prepSec);
      setPrepCountdown(count);
      setCountdownSeconds(count);
      prepTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setIsCountingDown(false);
          setPrepCountdown(null);
          setCountdownSeconds(0);
          handleStartRecordRef.current();
        } else {
          setPrepCountdown(count);
          setCountdownSeconds(count);
        }
      }, 1000);
    } else {
      setIsCountingDown(false);
      setPrepCountdown(null);
      setCountdownSeconds(5);
      countdownRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask?.id, autoStartMic, lastEvaluation, isSessionCompleted]);

  // Recording duration tracker
  useEffect(() => {
    if (unifiedSTT.isListening) {
      durationTimerRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - recordingStartTime);
      }, 100);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setRecordingDurationMs(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [unifiedSTT.isListening, recordingStartTime]);

  const handleExitStudio = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }
    setIsCountingDown(false);
    setPrepCountdown(null);
    setIsEvaluating(false);
    setPendingSpokenText(null);
    resetSession();
    router.push("/");
  };

  const handleFinishSession = () => {
    if (sessionHistory.length === 0 && !currentTask) {
      toast.info("Bạn chưa hoàn thành thử thách nào trong buổi tập này.");
      return;
    }
    finishSessionManually();
    setIsSummaryOpen(true);
  };

  // Start recording (chuẩn SB/VN-EN)
  const handleStartRecord = useCallback(async () => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    setIsCountingDown(false);
    setPrepCountdown(null);
    setPendingSpokenText(null);

    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setRecordingStartTime(Date.now());

    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro.");
    }
  }, [setIsCountingDown, setPrepCountdown]);

  // Evaluate attempt (server đã có fast-pass 0ms + deterministic fallback)
  const executeEvaluation = useCallback(
    async (spokenText: string, measuredLatency: number, speechDurationMs: number) => {
      const task = mode === "circumlocution" ? currentCircumTask : currentScenarioTask;
      if (!task) return;
      let provider = "gemini";
      let model = "auto";
      try {
        const { useSettingsStore } = await import("@/stores/settings-store");
        const settings = useSettingsStore.getState();
        provider = settings.survivalSpeaking?.provider || settings.activeProvider || "gemini";
        model =
          settings.survivalSpeaking?.model ||
          (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
          "auto";
      } catch {}

      try {
        setIsEvaluating(true);
        const res = await fetch("/api/foundation/survival/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            task,
            userTranscript: spokenText,
            responseLatencyMs: measuredLatency,
            speechDurationMs,
            hintTierUsed: hintTier,
            attemptNumber: attemptCount,
            provider,
            model,
          }),
        });

        const data = await res.json();
        if (data.evaluation) {
          soundEffects.playAIReady();
          processEvaluation(data.evaluation);
        } else {
          toast.error("Lỗi đánh giá", data.error || "Không nhận được phản hồi từ AI.");
        }
      } catch {
        toast.error("Lỗi đánh giá", "Không thể hoàn tất đánh giá lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [mode, currentCircumTask, currentScenarioTask, hintTier, attemptCount, processEvaluation, setIsEvaluating]
  );

  // Stop recording -> pending review (không gửi ngay)
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(800, Date.now() - recordingStartTime);
    try {
      const { text: spokenText } = await unifiedSTTRef.current.stopListening();
      if (!spokenText) {
        toast.error("Chưa ghi nhận được âm thanh", "Vui lòng bấm mic và nói lại.");
        return;
      }
      setPendingSpokenText(spokenText);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi xử lý", "Không thể dừng micro.");
    }
  }, [recordingStartTime]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const measuredLatency = Math.max(500, recordingStartTime - promptDisplayTime);
    try {
      await executeEvaluation(pendingSpokenText, measuredLatency, pendingDurationMs);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [pendingSpokenText, pendingDurationMs, recordingStartTime, promptDisplayTime, executeEvaluation]);

  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  const handleSubmitTextFallback = useCallback(
    async (text: string) => {
      const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);
      await executeEvaluation(text.trim(), measuredLatency, 2500);
    },
    [promptDisplayTime, executeEvaluation]
  );

  const handleResetLiveTranscript = useCallback(() => {
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);
    toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
  }, []);

  const handleContinue = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  const handleRetryCurrent = useCallback(() => {
    incrementAttempt(false);
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    setPromptDisplayTime(Date.now());
    if (autoStartMic) handleStartRecord();
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  const handleSayItBetter = useCallback(() => {
    incrementAttempt(true);
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    toast.info("Chế độ 'Say It Better'", "Hãy nhại lại câu bản xứ tự nhiên hơn!");
    if (autoStartMic) handleStartRecord();
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  const handlePracticeVariant = useCallback(
    (variantText: string) => {
      incrementAttempt(true);
      setPendingSpokenText(null);
      unifiedSTTRef.current.resetTranscript();
      toast.info("Luyện nói bản này", `Mẫu: "${variantText}". Hãy bấm mic để nói!`);
      if (autoStartMic) handleStartRecord();
    },
    [incrementAttempt, autoStartMic, handleStartRecord]
  );

  // Stable refs for timers/listeners
  const handleStartRecordRef = useRef(handleStartRecord);
  handleStartRecordRef.current = handleStartRecord;
  const handleStopRecordRef = useRef(handleStopRecord);
  handleStopRecordRef.current = handleStopRecord;
  const handleConfirmSubmitRef = useRef(handleConfirmSubmit);
  handleConfirmSubmitRef.current = handleConfirmSubmit;
  const handleReRecordRef = useRef(handleReRecord);
  handleReRecordRef.current = handleReRecord;
  const handleRetryCurrentRef = useRef(handleRetryCurrent);
  handleRetryCurrentRef.current = handleRetryCurrent;
  const handleContinueRef = useRef(handleContinue);
  handleContinueRef.current = handleContinue;

  // Keyboard Shortcuts (chuẩn SB/VN-EN: Space/H/R/Enter/Backspace/Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastEvaluation) {
          handleRetryCurrentRef.current();
        } else if (unifiedSTT.status === "recording") {
          handleStopRecordRef.current();
        } else if (pendingSpokenText) {
          handleReRecordRef.current();
        } else if (!isEvaluating && !isGenerating) {
          handleStartRecordRef.current();
        }
      } else if (e.code === "Backspace" && unifiedSTT.status === "recording") {
        e.preventDefault();
        unifiedSTTRef.current.resetTranscript();
        setPendingSpokenText(null);
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !lastEvaluation && !isEvaluating) {
        e.preventDefault();
        setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4);
      } else if (e.code === "KeyR" && unifiedSTT.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleContinueRef.current();
      } else if (e.code === "Enter") {
        if (lastEvaluation) {
          e.preventDefault();
          handleContinueRef.current();
        }
      } else if (e.code === "Escape") {
        e.preventDefault();
        if (isTopicModalOpen) {
          setIsTopicModalOpen(false);
        } else if (isSummaryOpen) {
          setIsSummaryOpen(false);
        } else if (hintTier > 0) {
          setHintTier(0);
        } else {
          handleExitStudio();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    unifiedSTT.status,
    isEvaluating,
    isGenerating,
    lastEvaluation,
    pendingSpokenText,
    isTopicModalOpen,
    isSummaryOpen,
    hintTier,
    setHintTier,
  ]);

  // Error state (chuẩn SB/VN-EN)
  if (generationError && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-5 max-w-xl mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-foreground">Không thể tạo thử thách từ AI</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">{generationError}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => {
              clearGenerationError();
              fetchCurrentKindTask();
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
          <Button variant="ghost" onClick={() => router.push("/")} className="rounded-xl">
            Về Trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Loading state (zero-lobby)
  if (!currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">AI đang tạo tình huống sinh tồn...</h2>
          <p className="text-xs text-muted-foreground">
            Chủ đề: {getTopicDisplay(selectedTopicId).label}. Vào phòng tập ngay.
          </p>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full h-full max-h-[calc(100vh-5rem)] flex flex-col justify-between overflow-hidden rounded-none border-2 border-border bg-card p-2.5 sm:p-3.5 shadow-[4px_4px_0px_var(--industrial-shadow-color)] animate-in fade-in-0 duration-200">
      {/* Top Header Bar (JapSpeak CombatCapsuleHUD Style) */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-border pb-2.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            type="button"
            onClick={handleExitStudio}
            className="size-8 shrink-0 bg-foreground text-background hover:bg-primary hover:text-primary-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] flex items-center justify-center transition-colors cursor-pointer"
            title="Thoát phiên luyện tập [ESC]"
          >
            <X className="size-4 stroke-[2.5]" />
          </button>

          <span className="px-2 py-1 bg-primary text-primary-foreground font-mono text-[10px] font-extrabold border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] uppercase tracking-wider shrink-0">
            LAB-06 // SURVIVE
          </span>

          <span className="text-xs md:text-sm font-serif font-extrabold uppercase tracking-tight text-foreground hidden sm:inline">
            Survival Speaking
          </span>

          <button
            type="button"
            onClick={() => setIsTopicModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] text-xs font-mono font-extrabold transition-all cursor-pointer group max-w-[200px] sm:max-w-[260px] truncate"
            title="Bấm để đổi chủ đề luyện tập"
          >
            <Compass className="size-3.5 shrink-0 stroke-[2.5] group-hover:rotate-45 transition-transform" />
            <span className="truncate">
              {getTopicDisplay(currentTask?.topic || selectedTopicId).label}
            </span>
            <ChevronDown className="size-3.5 shrink-0 ml-0.5 stroke-[2.5]" />
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center border-2 border-border bg-secondary p-0.5 shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
            <button
              type="button"
              onClick={() => {
                setMode("circumlocution");
                setPendingSpokenText(null);
              }}
              className={`text-[10px] sm:text-xs px-2.5 py-0.5 font-mono font-extrabold uppercase transition-all cursor-pointer ${
                mode === "circumlocution"
                  ? "bg-primary text-primary-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Circumlocution
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("scenarios");
                setPendingSpokenText(null);
              }}
              className={`text-[10px] sm:text-xs px-2.5 py-0.5 font-mono font-extrabold uppercase transition-all cursor-pointer ${
                mode === "scenarios"
                  ? "bg-primary text-primary-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Scenarios
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleContinue}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 font-mono font-extrabold text-xs gap-1.5 border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground text-foreground shadow-[2px_2px_0px_var(--industrial-shadow-color)] transition-all"
            title="Thử thách tiếp theo (Phím R)"
          >
            <Sparkles className={`size-3.5 text-primary ${isGenerating ? "animate-spin" : ""}`} />
            <span>TIẾP</span>
            <kbd className="hidden sm:inline-flex">R</kbd>
          </Button>

          {skillMastery.streakCount > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#FFB800] text-[#0D0E0D] border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] text-[10px] font-mono font-extrabold uppercase">
              <Flame className="size-3 fill-current" />
              <span>STREAK {skillMastery.streakCount}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-secondary border-2 border-border font-mono text-[10px] font-extrabold text-foreground">
            <span>
              {sessionConfig.mode === "endless"
                ? `#${currentTaskIndex + 1} · DONE: ${completedTasksCount}`
                : `${currentTaskIndex + 1}/${sessionConfig.targetCount}`}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFinishSession}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 font-mono font-extrabold text-xs gap-1.5 border-2 border-border bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-[2px_2px_0px_var(--industrial-shadow-color)] transition-all"
            title="Kết thúc buổi tập và xem báo cáo"
          >
            <Trophy className="size-3.5 text-accent" />
            <span className="hidden sm:inline">KẾT THÚC</span>
          </Button>
        </div>
      </header>

      {/* Main Studio Body: 3-Column */}
      <main className="flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          <SurvivalPromptCard
            mode={mode}
            circumTask={currentCircumTask}
            scenarioTask={currentScenarioTask}
            countdownSeconds={countdownSeconds}
            currentHintTier={hintTier}
            onSelectHintTier={(t) => setHintTier(t as 0 | 1 | 2 | 3 | 4)}
            onRegenerateAI={generateNewTaskWithAI}
            isRegeneratingAI={isRegeneratingAI}
            onNextTask={handleContinue}
            currentTaskIndex={currentTaskIndex}
            totalTasks={sessionConfig.targetCount}
            prepCountdown={prepCountdown}
            isCountingDown={isCountingDown}
            rapidStreak={skillMastery.streakCount}
          />
        </div>

        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          <SurvivalContextCard
            mode={mode}
            circumTask={currentCircumTask}
            scenarioTask={currentScenarioTask}
            currentHintTier={hintTier}
            onSelectHintTier={(t) => setHintTier(t as 0 | 1 | 2 | 3 | 4)}
          />
        </div>

        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {lastEvaluation ? (
            <SurvivalFeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryCurrent}
              onContinue={handleContinue}
              onSayItBetter={handleSayItBetter}
              onPracticeVariant={handlePracticeVariant}
            />
          ) : (
            <SpeakingController
              compact
              status={
                isEvaluating || unifiedSTT.isTranscribing
                  ? "processing"
                  : unifiedSTT.isListening
                    ? "recording"
                    : "idle"
              }
              isListening={unifiedSTT.isListening}
              liveTranscript={unifiedSTT.fullTranscript}
              durationMs={recordingDurationMs || unifiedSTT.audioRecorder.durationMs}
              autoStartMic={autoStartMic}
              onToggleAutoStartMic={setAutoStartMic}
              onStartRecord={handleStartRecord}
              onStopRecord={handleStopRecord}
              onSubmitTextFallback={handleSubmitTextFallback}
              onOpenHints={() => setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4)}
              isEvaluating={isEvaluating || unifiedSTT.isTranscribing}
              onResetLiveTranscript={handleResetLiveTranscript}
              pendingText={pendingSpokenText}
              onConfirmSubmit={handleConfirmSubmit}
              onReRecord={handleReRecord}
            />
          )}
        </div>
      </main>

      {/* Bottom Footer Dock (JapSpeak Mechanical Keycaps Style) */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border pt-2 shrink-0 text-[10px] font-mono font-extrabold text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd>SPACE</kbd>
            <span>{lastEvaluation ? "NÓI LẠI" : pendingSpokenText ? "THU LẠI" : "THU ÂM/DỪNG"}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd>BKSP</kbd>
            <span>XOÁ NÓI LẠI</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd>H</kbd>
            <span>GỢI Ý (T{hintTier}/4)</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd>R</kbd>
            <span>ĐỔI BÀI</span>
          </span>
          {pendingSpokenText && !isEvaluating && (
            <span className="flex items-center gap-1 text-primary">
              <kbd>ENTER</kbd>
              <span>NỘP BÀI</span>
            </span>
          )}
          {lastEvaluation && (
            <span className="flex items-center gap-1 text-primary">
              <kbd>ENTER</kbd>
              <span>BÀI MỚI</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-secondary text-foreground border border-border">
            MASTERY: {skillMastery.overallMastery}%
          </span>
          <span className="px-2 py-0.5 bg-secondary text-foreground border border-border hidden sm:inline">
            LVL {adaptiveState.currentDifficulty}/10
          </span>
        </div>
      </footer>

      {/* Topic Selector Dialog (chuẩn SB/VN-EN) */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <span>Đổi chủ đề luyện Survival</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn ngữ cảnh có sẵn hoặc tự gõ tình huống bạn muốn AI tạo thử thách.
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
                placeholder="Ví dụ: Phỏng vấn visa Mỹ, Đặt khách sạn Tokyo, Họp với sếp khó tính..."
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

      {/* Summary Modals */}
      <SurvivalSessionSummaryModal
        isOpen={isSummaryOpen || isSessionCompleted}
        onClose={() => setIsSummaryOpen(false)}
        summary={sessionSummary || getSessionSummary()}
        onRestart={() => {
          resetSessionStats();
          resetSession();
          setIsSummaryOpen(false);
          initSession("endless");
        }}
      />
    </div>
  );
}
