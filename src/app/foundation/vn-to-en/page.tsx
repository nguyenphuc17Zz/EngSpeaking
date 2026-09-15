"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Sparkles,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Clock,
  Target,
  Flame,
  AlertTriangle,
  RefreshCw,
  X,
  Settings2,
  Trophy,
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

import { useVNToENStore } from "@/stores/vn-to-en-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { soundEffects } from "@/lib/audio/audio-chimes";

import { VNPromptCard } from "@/components/foundation/vn-to-en/VNPromptCard";
import { VNContextCard } from "@/components/foundation/vn-to-en/VNContextCard";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { VNFeedbackCard } from "@/components/foundation/vn-to-en/VNFeedbackCard";
import { VNSummaryModal } from "@/components/foundation/vn-to-en/VNSummaryModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { computeFastPassVNMatch } from "@/lib/foundation/vn-to-en/fast-pass.service";

import type { VNToENRetrievalMode } from "@/types/vn-to-en";

export default function VNToENPage() {
  const router = useRouter();
  const tts = useBrowserTTS();
  const {
    currentTask,
    isGenerating,
    isEvaluating,
    setIsEvaluating,
    isRegeneratingAI,
    sessionConfig,
    completedTasksCount,
    currentTaskIndex,
    isSessionCompleted,
    sessionSummary,
    hintTier,
    attemptCount,
    lastEvaluation,
    autoStartMic,
    prepCountdown,
    isCountingDown,
    adaptiveState,
    generationError,
    initSession,
    finishSessionManually,
    fetchFirstTask,
    generateNewTaskWithAI,
    processEvaluation,
    advanceToNextTask,
    setHintTier,
    incrementAttempt,
    setAutoStartMic,
    setPrepCountdown,
    setIsCountingDown,
    clearGenerationError,
    resetSession,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
  } = useVNToENStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2000);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Zero-Lobby: Automatically initialize Endless Mode on first mount if no task
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

  // Exit Studio View
  const handleExitStudio = () => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening();
    }
    setIsCountingDown(false);
    setPrepCountdown(null);
    setIsEvaluating(false);
    setPendingSpokenText(null);
    resetSession();
    router.push("/foundation");
  };

  // Finish Endless Practice Session Manually & View Report
  const handleFinishSession = () => {
    if (completedTasksCount === 0 && !currentTask) {
      toast.info("Bạn chưa hoàn thành câu nào trong buổi tập này.");
      return;
    }
    finishSessionManually();
  };

  // Preparation Countdown Timer routine when a new task is loaded
  useEffect(() => {
    if (!currentTask || lastEvaluation || isSessionCompleted) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }

    setPromptDisplayTime(Date.now());
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }

    if (autoStartMic) {
      setIsCountingDown(true);
      let count = Math.round(currentTask.prepTimeSec || 2.0);
      setPrepCountdown(count);

      prepTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setIsCountingDown(false);
          setPrepCountdown(null);
          handleStartRecordRef.current();
        } else {
          setPrepCountdown(count);
        }
      }, 1000);
    } else {
      setIsCountingDown(false);
      setPrepCountdown(null);
    }

    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [currentTask?.id, autoStartMic, lastEvaluation, isSessionCompleted, setIsCountingDown, setPrepCountdown]);

  // Recording Duration Tracker
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

  // Start Voice Recording
  const handleStartRecord = useCallback(async () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setIsCountingDown(false);
    setPrepCountdown(null);
    setPendingSpokenText(null);

    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setRecordingStartTime(Date.now());

    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [setIsCountingDown, setPrepCountdown]);

  // Stable ref for auto-start timer
  const handleStartRecordRef = useRef(handleStartRecord);
  handleStartRecordRef.current = handleStartRecord;

  // Submit attempt for AI evaluation
  const submitAttemptForEvaluation = useCallback(
    async (spokenText: string, speechDurationMs: number) => {
      if (!currentTask) return;

      const responseLatencyMs = Math.max(400, recordingStartTime ? recordingStartTime - promptDisplayTime : 2000);

      // --- Tier 1: Client-side Fast-Pass Evaluation (<100ms) ---
      const fastPassResult = computeFastPassVNMatch(currentTask, spokenText, {
        responseLatencyMs,
        speechDurationMs,
        hintTierUsed: hintTier,
        attemptNumber: attemptCount,
      });

      if (fastPassResult.canFastPass && fastPassResult.evaluation) {
        soundEffects.playAIReady();
        processEvaluation(fastPassResult.evaluation);
        setIsEvaluating(false);
        setPendingSpokenText(null);
        return;
      }
      // ---------------------------------------------------------

      setIsEvaluating(true);
      try {
        // Read active evaluation model from settings
        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.evaluation?.provider || settings.activeProvider || "gemini";
          model =
            settings.evaluation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        const res = await fetch("/api/foundation/vn-to-en/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: currentTask,
            userTranscript: spokenText,
            responseLatencyMs,
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
          toast.error("Lỗi đánh giá câu", data.error || "Không thể hoàn thành chấm điểm lúc này.");
        }
      } catch {
        toast.error("Lỗi đánh giá câu", "Không thể hoàn thành chấm điểm lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [currentTask, recordingStartTime, promptDisplayTime, hintTier, attemptCount, processEvaluation, setIsEvaluating]
  );

  // Stop Recording -> store in pending review state
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;

    soundEffects.playMicStop();
    const durationMs = Math.max(700, Date.now() - recordingStartTime);

    try {
      const { text: spokenText } = await unifiedSTTRef.current.stopListening();

      if (!spokenText) {
        toast.error("Chưa ghi nhận được âm thanh", "Vui lòng bấm mic và nói lại câu.");
        return;
      }

      setPendingSpokenText(spokenText);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi hoàn thành thu âm", "Hãy thử nói lại câu.");
    }
  }, [recordingStartTime]);

  // Confirm submit pending speech
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await submitAttemptForEvaluation(pendingSpokenText, pendingDurationMs);
  }, [pendingSpokenText, pendingDurationMs, submitAttemptForEvaluation]);

  // Re-record
  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  // Reset Live Transcript during recording (Backspace / Undo)
  const handleResetLiveTranscript = useCallback(() => {
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);
    toast.info("Đã xoá câu nói", "Micro vẫn mở, hãy nói lại từ đầu trôi chảy.");
  }, []);

  // Handle Text Fallback Submit
  const handleTextFallbackSubmit = async (text: string) => {
    await submitAttemptForEvaluation(text, 2500);
  };

  // Retry same task (Say Again)
  const handleRetryTask = useCallback(() => {
    incrementAttempt(false);
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    if (autoStartMic) {
      handleStartRecord();
    }
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  // Say It Better
  const handleSayItBetter = useCallback(() => {
    incrementAttempt(true);
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    toast.info("Chế độ 'Say It Better'", "Hãy nhại lại câu bản xứ tự nhiên hơn để ghi nhớ mẫu câu!");
    if (autoStartMic) {
      handleStartRecord();
    }
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  // Practice specific Say It Better variant
  const handlePracticeVariant = useCallback(
    (variantText: string) => {
      incrementAttempt(true);
      setPendingSpokenText(null);
      unifiedSTTRef.current.resetTranscript();
      toast.info("Luyện nói bản này", `Mẫu: "${variantText}". Hãy bấm mic để nói!`);
      if (autoStartMic) {
        handleStartRecord();
      }
    },
    [incrementAttempt, autoStartMic, handleStartRecord]
  );

  // Continue to Next Task
  const handleContinueTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Skip / Next Task
  const handleSkipOrNextTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (unifiedSTT.status === "recording") {
          handleStopRecord();
        } else if (lastEvaluation) {
          handleRetryTask();
        } else if (pendingSpokenText) {
          handleReRecord();
        } else if (!isEvaluating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && unifiedSTT.status === "recording") {
        e.preventDefault();
        handleResetLiveTranscript();
      } else if (e.code === "KeyH" && !isEvaluating) {
        e.preventDefault();
        setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4);
      } else if (e.code === "KeyR" && unifiedSTT.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleSkipOrNextTask();
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastEvaluation) {
          e.preventDefault();
          handleContinueTask();
        }
      } else if (e.code === "Escape") {
        if (hintTier > 0) {
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
    lastEvaluation,
    hintTier,
    pendingSpokenText,
    handleConfirmSubmit,
    handleReRecord,
    handleStopRecord,
    handleStartRecord,
    handleRetryTask,
    handleResetLiveTranscript,
    handleContinueTask,
    handleSkipOrNextTask,
    setHintTier,
  ]);

  // 1. Error State View (if AI generation fails and no task loaded)
  if (generationError && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-5 max-w-xl mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-foreground">Không thể tạo câu hỏi từ AI</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {generationError}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => {
              clearGenerationError();
              fetchFirstTask();
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
            onClick={() => {
              clearGenerationError();
              router.push("/foundation");
            }}
            className="rounded-xl"
          >
            Về trang Foundation
          </Button>
        </div>
      </div>
    );
  }

  // 2. Loading State while generating initial task (Zero-Lobby initial load)
  if (!currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">AI đang chuẩn bị câu phản xạ VN → EN...</h2>
          <p className="text-xs text-muted-foreground">
            Chủ đề: {getTopicDisplay(selectedTopicId).label}. Vào phòng tập ngay.
          </p>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // 3. Immersive Studio View (Professional 3-Column Split Studio)
  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs animate-in fade-in-0 duration-200">
      {/* Studio Header Bar */}
      <header className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0 gap-3">
        {/* Left: Exit Studio & Inline Topic Selector */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitStudio}
            className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Thoát phiên luyện tập"
          >
            <X className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold tracking-tight text-foreground">
              VN → EN Speaking
            </span>
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-foreground text-xs font-mono transition-all cursor-pointer group max-w-[200px] sm:max-w-[260px] truncate"
              title="Bấm để đổi chủ đề luyện tập"
            >
              <Compass className="size-3 text-primary shrink-0 group-hover:rotate-45 transition-transform" />
              <span className="truncate font-medium">{getTopicDisplay(currentTask?.topic || selectedTopicId).label}</span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
            </button>
            <GlobalAiSelector size="sm" />
          </div>
        </div>

        {/* Center: Preparation Countdown Pulse Badge (if counting down) */}
        {isCountingDown && prepCountdown !== null ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-mono font-bold animate-pulse">
            <Clock className="size-3.5" />
            <span>Nói sau {prepCountdown}s...</span>
          </div>
        ) : null}

        {/* Right: Next Task Button, Progress Indicator & Finish Button */}
        <div className="flex items-center gap-2.5">
          {/* Next Task Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipOrNextTask}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-2xs btn-spring"
            title="Đổi sang câu tiếp theo (Phím R)"
          >
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>Câu tiếp theo</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>

          {adaptiveState.rapidStreak > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
              <Flame className="size-3" />
              <span>Streak {adaptiveState.rapidStreak}</span>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">
              {sessionConfig.mode === "endless"
                ? `Câu #${currentTaskIndex + 1}`
                : `Câu ${currentTaskIndex + 1}/${sessionConfig.targetCount}`}
            </span>
            {sessionConfig.mode === "endless" ? (
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                Đã xong {completedTasksCount}
              </Badge>
            ) : (
              <div className="w-16 sm:w-24">
                <Progress
                  value={((currentTaskIndex + 1) / (sessionConfig.targetCount || 1)) * 100}
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

      {/* Main Studio Body: Professional 3-Column Split */}
      <main className="flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
        {/* Column 1 (4 cols): Vietnamese Prompt Card, Vocab Chips */}
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          {currentTask && (
            <VNPromptCard
              task={currentTask}
              currentTaskIndex={currentTaskIndex}
              totalTasks={sessionConfig.targetCount}
              prepCountdown={prepCountdown}
              isCountingDown={isCountingDown}
              rapidStreak={adaptiveState.rapidStreak}
              onPlayTerm={(term) => tts.speak(term)}
              onNextTask={handleSkipOrNextTask}
              isGeneratingNext={isGenerating}
              onRegenerateWithAI={generateNewTaskWithAI}
              isRegeneratingAI={isRegeneratingAI}
            />
          )}
        </div>

        {/* Column 2 (5 cols): English Model Structure & 4-Tier Hints */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          {currentTask && (
            <VNContextCard
              task={currentTask}
              currentHintTier={hintTier}
              onSelectHintTier={setHintTier}
            />
          )}
        </div>

        {/* Column 3 (3 cols): Compact Speaking Controller OR Evaluation Feedback */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {lastEvaluation ? (
            <VNFeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryTask}
              onContinue={handleContinueTask}
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
              onSubmitTextFallback={handleTextFallbackSubmit}
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

      {/* Bottom Footer Dock */}
      <footer className="flex items-center justify-between border-t border-border/40 pt-1.5 shrink-0 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>[Space]: {lastEvaluation ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Thu âm/Dừng"}</span>
          <span>•</span>
          <span>[Backspace]: Xoá nói lại</span>
          <span>•</span>
          <span>[H]: Gợi ý ({hintTier}/4)</span>
          <span>•</span>
          <span>[R]: Câu tiếp theo</span>
          {pendingSpokenText && !isEvaluating && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Nộp bài chấm điểm</span>
            </>
          )}
          {lastEvaluation && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Tiếp tục câu mới</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Tự lập: {lastEvaluation?.independenceScore ?? 100}%</span>
        </div>
      </footer>

      {/* In-Studio Topic Selector Dialog */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <span>Đổi chủ đề luyện phản xạ VN → EN</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn một ngữ cảnh có sẵn hoặc tự gõ bất kỳ tình huống nào bạn muốn AI tạo câu.
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
                placeholder="Ví dụ: Phỏng vấn xin việc, Đặt đồ ăn ở Singapore, Đi khám bác sĩ..."
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

      {/* Completion Summary Modal */}
      <VNSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        onRestart={() => {
          resetSession();
          initSession("endless");
        }}
      />
    </div>
  );
}
