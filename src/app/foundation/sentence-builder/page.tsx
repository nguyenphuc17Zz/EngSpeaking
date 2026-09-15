"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  Layers,
  Zap,
  RotateCcw,
  Volume2,
  Mic,
  ArrowRight,
  ArrowLeft,
  Clock,
  Target,
  Trophy,
  Flame,
  Brain,
  HelpCircle,
  X,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Settings2,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Laptop,
  MessageCircle,
  HeartPulse,
  GraduationCap,
  Compass,
  Shuffle,
  Check,
  Wand2,
  ChevronDown,
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

import { useSentenceBuilderStore } from "@/stores/sentence-builder-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { soundEffects } from "@/lib/audio/audio-chimes";

import { TaskCard } from "@/components/foundation/sentence-builder/TaskCard";
import { SentenceBuilderContextCard } from "@/components/foundation/sentence-builder/SentenceBuilderContextCard";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { FeedbackCard } from "@/components/foundation/sentence-builder/FeedbackCard";
import { SessionSummaryModal } from "@/components/foundation/sentence-builder/SessionSummaryModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import {
  computeFastPassMatch,
  buildFastPassEvaluation,
} from "@/lib/foundation/sentence-builder/fast-pass.service";

import type { SessionMode } from "@/types/sentence-builder";

export default function SentenceBuilderPage() {
  const {
    currentTask,
    isGenerating,
    isEvaluating,
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
    skillMastery,
    generationError,
    initSession,
    finishSessionManually,
    fetchFirstTask,
    generateNewTaskWithAI,
    clearGenerationError,
    processEvaluation,
    advanceToNextTask,
    setHintTier,
    incrementAttempt,
    setAutoStartMic,
    setPrepCountdown,
    setIsCountingDown,
    setIsEvaluating,
    resetSession,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
  } = useSentenceBuilderStore();

  const router = useRouter();
  const settings = useSettingsStore();
  const activeAiModel =
    settings.sentenceBuilderGen?.model ||
    (settings.activeProvider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
    "gemini-3.5-flash-lite";

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const tts = useBrowserTTS();

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isHintDrawerOpen, setIsHintDrawerOpen] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [hasListenedBaseSentence, setHasListenedBaseSentence] = useState(false);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2000);
  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");

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

  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep stable ref for unifiedSTT to avoid render cascades
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  // Reset base sentence listen state and stop mic when task changes
  useEffect(() => {
    setHasListenedBaseSentence(false);
    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
    }
  }, [currentTask?.id]);

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
    router.push("/");
  };

  // Finish Endless Practice Session Manually & View Report
  const handleFinishSession = () => {
    if (completedTasksCount === 0 && !currentTask) {
      toast.info("Bạn chưa hoàn thành câu nào trong buổi tập này.");
      return;
    }
    finishSessionManually();
  };

  // Start Voice Recording
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
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [setIsCountingDown, setPrepCountdown]);

  // Submit attempt for AI evaluation
  const submitAttemptForEvaluation = useCallback(
    async (spokenText: string, speechDurationMs: number) => {
      if (!currentTask) return;

      setIsEvaluating(true);
      try {
        const latencyMs = Math.max(
          500,
          recordingStartTime ? Date.now() - recordingStartTime - speechDurationMs : 2000
        );

        // 1. FAST-PASS 0ms EVALUATION (Client/Edge)
        // If user formulated an exact or near-exact match to expected models, return instant result
        if (currentTask.expectedResponses && currentTask.expectedResponses.length > 0) {
          const match = computeFastPassMatch(
            spokenText,
            currentTask.expectedResponses,
            currentTask.requiredElements
          );

          if (match.isMatch && match.matchedResponse && hintTier <= 2) {
            const fastEval = buildFastPassEvaluation({
              task: currentTask,
              userTranscript: spokenText,
              matchedResponse: match.matchedResponse,
              confidence: match.confidence,
              latencyMs,
              speechDurationMs,
              hintTierUsed: hintTier,
              attemptNumber: attemptCount,
            });

            soundEffects.playAIReady();
            processEvaluation(fastEval);
            return;
          }
        }

        // 2. DEEP AI EVALUATION FALLTHROUGH
        const provider = settings.sentenceBuilderEval?.provider || settings.activeProvider || "gemini";
        const model =
          settings.sentenceBuilderEval?.model ||
          (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
          "auto";

        const res = await fetch("/api/foundation/sentence-builder/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: currentTask,
            userTranscript: spokenText,
            latencyMs,
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
        }
      } catch {
        toast.error("Lỗi đánh giá câu", "Không thể hoàn thành chấm điểm lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [currentTask, recordingStartTime, hintTier, attemptCount, processEvaluation, settings, setIsEvaluating]
  );

  // Stop Recording -> Do NOT send immediately, store in pending review state
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;

    soundEffects.playMicStop();
    const durationMs = Math.max(800, Date.now() - recordingStartTime);

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

  // User confirms submitting the recorded answer for AI evaluation
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    const text = pendingSpokenText;
    const dur = pendingDurationMs;
    await submitAttemptForEvaluation(text, dur);
  }, [pendingSpokenText, pendingDurationMs, submitAttemptForEvaluation]);

  // User decides to re-record
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

  // Play English Base Sentence TTS (Single Play)
  const handlePlayBaseSentence = useCallback(() => {
    if (!currentTask?.baseSentence || hasListenedBaseSentence) return;
    setHasListenedBaseSentence(true);
    tts.speak(currentTask.baseSentence, { lang: "en-US" });
    toast.info("Đã nghe câu gốc", "Bạn chỉ được nghe 1 lần duy nhất cho câu này.");
  }, [currentTask?.baseSentence, hasListenedBaseSentence, tts]);

  // Handle Text Fallback Submit
  const handleTextFallbackSubmit = async (text: string) => {
    await submitAttemptForEvaluation(text, 2500);
  };

  // Retry same task (Say Again)
  const handleRetryTask = useCallback(() => {
    incrementAttempt();
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    if (autoStartMic) {
      handleStartRecord();
    }
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  // Continue to Next Task
  const handleContinueTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Skip or Next Task shortcut
  const handleSkipOrNextTask = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  // Stable refs for callbacks inside timers and listeners
  const handleSkipOrNextTaskRef = useRef(handleSkipOrNextTask);
  handleSkipOrNextTaskRef.current = handleSkipOrNextTask;
  const handleStartRecordRef = useRef(handleStartRecord);
  handleStartRecordRef.current = handleStartRecord;
  const handleStopRecordRef = useRef(handleStopRecord);
  handleStopRecordRef.current = handleStopRecord;
  const handleConfirmSubmitRef = useRef(handleConfirmSubmit);
  handleConfirmSubmitRef.current = handleConfirmSubmit;
  const handleReRecordRef = useRef(handleReRecord);
  handleReRecordRef.current = handleReRecord;
  handleStopRecordRef.current = handleStopRecord;
  const handleResetLiveTranscriptRef = useRef(handleResetLiveTranscript);
  handleResetLiveTranscriptRef.current = handleResetLiveTranscript;
  const handleRetryTaskRef = useRef(handleRetryTask);
  handleRetryTaskRef.current = handleRetryTask;
  const handleContinueTaskRef = useRef(handleContinueTask);
  handleContinueTaskRef.current = handleContinueTask;

  // Preparation Countdown Timer routine when a new task is loaded
  useEffect(() => {
    if (!currentTask || lastEvaluation || isSessionCompleted) {
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
      }
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }

    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }

    if (autoStartMic) {
      setIsCountingDown(true);
      let count = Math.round(currentTask.prepTimeSec || 3.0);
      setPrepCountdown(count);

      prepTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (prepTimerRef.current) {
            clearInterval(prepTimerRef.current);
            prepTimerRef.current = null;
          }
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
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
      }
    };
  }, [currentTask?.id, autoStartMic, !!lastEvaluation, isSessionCompleted, setIsCountingDown, setPrepCountdown]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in textarea/input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (unifiedSTTRef.current.status === "recording") {
          handleStopRecordRef.current();
        } else if (lastEvaluation) {
          handleRetryTaskRef.current();
        } else if (pendingSpokenText) {
          handleReRecordRef.current();
        } else if (!isEvaluating) {
          handleStartRecordRef.current();
        }
      } else if (e.code === "Backspace" && unifiedSTTRef.current.status === "recording") {
        e.preventDefault();
        handleResetLiveTranscriptRef.current();
      } else if (e.code === "KeyH" && !isEvaluating) {
        e.preventDefault();
        setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4);
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmitRef.current();
        } else if (lastEvaluation) {
          e.preventDefault();
          handleContinueTaskRef.current();
        }
      } else if (e.code === "KeyR" && unifiedSTTRef.current.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleSkipOrNextTaskRef.current();
      } else if (e.code === "Escape") {
        setHintTier(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEvaluating, !!lastEvaluation, pendingSpokenText, hintTier, setHintTier]);

  // 1. Error State View (if AI generation fails and no task loaded)
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
              router.push("/");
            }}
            className="rounded-xl"
          >
            Về Trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // 2. Loading State while generating task (Zero-Lobby initial load)
  if (!currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">AI đang thiết kế bài tập phản xạ...</h2>
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
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5 shrink-0">
        {/* Left: Exit Studio & Mode Info */}
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

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-bold tracking-tight text-foreground">
                Sentence Builder
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
        </div>

        {/* Center: Preparation Countdown Pulse Badge (if counting down) */}
        {isCountingDown && prepCountdown !== null ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-mono font-bold animate-pulse">
            <Clock className="size-3.5" />
            <span>Nói sau {prepCountdown}s...</span>
          </div>
        ) : null}

        {/* Right: Next Task Button + Progress Indicator & Streak */}
        <div className="flex items-center gap-2.5">
          {/* Next Task Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipOrNextTask}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-2xs btn-spring"
            title="Đổi sang bài tập tiếp theo (Phím R)"
          >
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>Bài tiếp theo</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>

          {skillMastery.streakCount > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
              <Flame className="size-3" />
              <span>Streak {skillMastery.streakCount}</span>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">
              {sessionConfig.mode === "endless"
                ? `Câu #${currentTaskIndex + 1}`
                : `${currentTaskIndex + 1}/${sessionConfig.targetCount}`}
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
        {/* Column 1 (4 cols): Task Card, Vietnamese Prompt & Vocabulary */}
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          {currentTask && (
            <TaskCard
              task={currentTask}
              currentTaskIndex={currentTaskIndex}
              totalTasks={sessionConfig.targetCount}
              prepCountdown={prepCountdown}
              isCountingDown={isCountingDown}
              hasListenedBaseSentence={hasListenedBaseSentence}
              onPlayBaseSentence={handlePlayBaseSentence}
              isSpeakingBaseSentence={tts.isSpeaking}
              onPlayTerm={(term) => tts.speak(term)}
              onNextTask={handleSkipOrNextTask}
              isGeneratingNext={isGenerating}
              onRegenerateWithAI={generateNewTaskWithAI}
              isRegeneratingAI={isRegeneratingAI}
            />
          )}
        </div>

        {/* Column 2 (5 cols): Scaffold Context & Progressive Hints */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          {currentTask && (
            <SentenceBuilderContextCard
              task={currentTask}
              currentHintTier={hintTier}
              onSelectHintTier={setHintTier}
            />
          )}
        </div>

        {/* Column 3 (3 cols): Compact Speaking Controller OR Evaluation Feedback */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {lastEvaluation ? (
            <FeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryTask}
              onContinue={handleContinueTask}
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
              durationMs={unifiedSTT.audioRecorder.durationMs}
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
          <span>[R]: Bài tiếp theo</span>
          {pendingSpokenText && !isEvaluating && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Nộp bài chấm điểm</span>
            </>
          )}
          {lastEvaluation && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Tiếp tục bài mới</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Mastery: {skillMastery.overallMastery}%</span>
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

      {/* Completion Summary Modal */}
      <SessionSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        skillMastery={skillMastery}
        onRestart={() => {
          resetSession();
          initSession("endless");
        }}
      />
    </div>
  );
}
