"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

import { useSentenceBuilderStore } from "@/stores/sentence-builder-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { soundEffects } from "@/lib/audio/audio-chimes";

import { TaskCard } from "@/components/foundation/sentence-builder/TaskCard";
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
    fetchFirstTask,
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
  } = useSentenceBuilderStore();

  const settings = useSettingsStore();
  const activeAiModel =
    settings.sentenceBuilderGen?.model ||
    (settings.activeProvider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
    "gemini-3.5-flash-lite";

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const tts = useBrowserTTS();

  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [isHintDrawerOpen, setIsHintDrawerOpen] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [hasListenedBaseSentence, setHasListenedBaseSentence] = useState(false);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2000);

  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep stable ref for unifiedSTT to avoid render cascades
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  // Reset base sentence listen state when task changes
  useEffect(() => {
    setHasListenedBaseSentence(false);
  }, [currentTask?.id]);

  // Initialize or Select Mode
  const handleStartSession = async (mode: SessionMode) => {
    setHasStartedSession(true);
    await initSession(mode);
  };

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
    setHasStartedSession(false);
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

  // Stable refs for callbacks inside timers and listeners
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
    if (!hasStartedSession || !currentTask || lastEvaluation || isSessionCompleted) {
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
  }, [currentTask?.id, autoStartMic, hasStartedSession, !!lastEvaluation, isSessionCompleted, setIsCountingDown, setPrepCountdown]);

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
      } else if (e.code === "Escape") {
        setHintTier(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEvaluating, !!lastEvaluation, pendingSpokenText, hintTier, setHintTier]);

  // 1. Session Setup Screen (Lobby View)
  if (!hasStartedSession || (!currentTask && !isGenerating)) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in-0 duration-200 max-w-5xl mx-auto">
        {/* Compact Hero Banner */}
        <div className="p-5 md:p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
              <Sparkles className="size-3.5" />
              <span>Spoken Retrieval Studio</span>
            </div>

            <div className="flex items-center gap-2">
              <GlobalAiSelector size="sm" />
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary hidden sm:inline-flex">
                Nâng phản xạ từ Thụ động → Tự động
              </Badge>
            </div>
          </div>

          <div className="max-w-2xl space-y-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Sentence Builder & Controlled Speaking
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Khai mở phản xạ nói tức thì từ kiến thức từ vựng/ngữ pháp sẵn có. Luyện tập theo cơ chế thích ứng đa tầng (Level A → C).
            </p>
          </div>

          {/* Quick Mastery Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-2xl bg-card border border-border/60">
              <span className="text-[10px] font-semibold text-muted-foreground block">Mastery Tổng hợp</span>
              <span className="font-mono text-base font-bold text-primary">{skillMastery.overallMastery}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-card border border-border/60">
              <span className="text-[10px] font-semibold text-muted-foreground block">Truy xuất từ vựng</span>
              <span className="font-mono text-base font-bold text-indigo-500">{skillMastery.vocabularyRetrieval}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-card border border-border/60">
              <span className="text-[10px] font-semibold text-muted-foreground block">Cấu trúc câu</span>
              <span className="font-mono text-base font-bold text-emerald-500">{skillMastery.sentenceConstruction}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-card border border-border/60">
              <span className="text-[10px] font-semibold text-muted-foreground block">Mức độ Tự lập</span>
              <span className="font-mono text-base font-bold text-amber-500">{skillMastery.independence}%</span>
            </div>
          </div>
        </div>

        {/* AI Generation Error Banner with Retry */}
        {generationError && (
          <div className="p-4 rounded-3xl bg-destructive/10 border border-destructive/30 text-destructive space-y-3 animate-in fade-in-0 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-sm block">Không thể tạo bài tập bằng AI</span>
                <p className="text-muted-foreground leading-relaxed">{generationError}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => fetchFirstTask()}
                className="h-8 rounded-xl text-xs gap-1.5 font-semibold btn-spring"
              >
                <RefreshCw className="size-3.5" />
                <span>Thử lại ngay</span>
              </Button>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                  Mở Cài đặt API Key
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 4 Session Modes Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Chọn phòng tập phản xạ:
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">
              Chu kỳ thích ứng tự động (Adaptive Ladder)
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Quick Practice */}
            <Card
              onClick={() => handleStartSession("quick")}
              className="rounded-3xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer p-4 space-y-2.5 btn-spring shadow-2xs group"
            >
              <div className="size-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Clock className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Quick (~3')</h3>
                <p className="text-xs text-muted-foreground mt-0.5">4 câu phản xạ nhanh khởi động ngày mới.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                4 tasks • Bật phản xạ
              </Badge>
            </Card>

            {/* Standard Practice */}
            <Card
              onClick={() => handleStartSession("standard")}
              className="rounded-3xl border-2 border-primary/50 bg-gradient-to-br from-card via-card to-primary/10 hover:border-primary transition-all cursor-pointer p-4 space-y-2.5 btn-spring shadow-xs relative overflow-hidden group"
            >
              <div className="absolute top-3 right-3">
                <Badge className="text-[9px] font-bold bg-primary text-primary-foreground py-0 px-1.5">Khuyên dùng</Badge>
              </div>
              <div className="size-9 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Flame className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Standard (~10')</h3>
                <p className="text-xs text-muted-foreground mt-0.5">10 câu chuẩn: Khởi động → Tăng tốc → Sửa lỗi.</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/40">
                10 tasks • Thích ứng toàn diện
              </Badge>
            </Card>

            {/* Deep Practice */}
            <Card
              onClick={() => handleStartSession("deep")}
              className="rounded-3xl border border-border/80 bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer p-4 space-y-2.5 btn-spring shadow-2xs group"
            >
              <div className="size-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Brain className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Deep (~20')</h3>
                <p className="text-xs text-muted-foreground mt-0.5">20 câu nâng cao, đa dạng cấu trúc phức.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                20 tasks • Đào sâu ngữ cảnh
              </Badge>
            </Card>

            {/* Weakness Focus */}
            <Card
              onClick={() => handleStartSession("weakness_focus")}
              className="rounded-3xl border border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer p-4 space-y-2.5 btn-spring shadow-2xs group"
            >
              <div className="size-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Target className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Weakness Focus</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Quét Error Bank và drill vào mẫu câu yếu nhất.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                Micro-Drill • Sửa dứt điểm
              </Badge>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State View (if AI generation fails and no task loaded)
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
              setHasStartedSession(false);
            }}
            className="rounded-xl"
          >
            Quay lại chọn chế độ
          </Button>
        </div>
      </div>
    );
  }

  // 3. Loading State while generating task
  if (isGenerating && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">AI đang thiết kế bài tập phản xạ...</h2>
          <p className="text-xs text-muted-foreground">
            Tình huống giao tiếp tự nhiên trong đời sống & công việc.
          </p>
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  // 3. Immersive Studio View (Zero-Scroll 2-Column Split Studio)
  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-3 md:p-5 shadow-xs animate-in fade-in-0 duration-200">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 shrink-0">
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
                Sentence Builder Studio
              </span>
              <Badge variant="outline" className="text-[10px] font-mono capitalize px-2 py-0">
                {sessionConfig.mode.replace("_", " ")}
              </Badge>
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

        {/* Right: Progress Indicator & Streak */}
        <div className="flex items-center gap-3">
          {skillMastery.streakCount > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
              <Flame className="size-3" />
              <span>Streak {skillMastery.streakCount}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">
              {currentTaskIndex + 1}/{sessionConfig.targetCount}
            </span>
            <div className="w-20 sm:w-28">
              <Progress
                value={((currentTaskIndex + 1) / sessionConfig.targetCount) * 100}
                className="h-1.5 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main 2-Column Split Studio Grid (Zero-Scroll Stage) */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 my-3 overflow-hidden min-h-0">
        {/* Left Column (5 cols): Task Card, Vietnamese Prompt & Scaffold */}
        <div className="md:col-span-5 flex flex-col h-full overflow-hidden min-h-0">
          {currentTask && (
            <TaskCard
              task={currentTask}
              currentTaskIndex={currentTaskIndex}
              totalTasks={sessionConfig.targetCount}
              prepCountdown={prepCountdown}
              isCountingDown={isCountingDown}
              currentHintTier={hintTier}
              onSelectHintTier={setHintTier}
              hasListenedBaseSentence={hasListenedBaseSentence}
              onPlayBaseSentence={handlePlayBaseSentence}
              isSpeakingBaseSentence={tts.isSpeaking}
              onPlayTerm={(term) => tts.speak(term)}
            />
          )}
        </div>

        {/* Right Column (7 cols): Speaking Controller OR Evaluation Feedback */}
        <div className="md:col-span-7 flex flex-col h-full overflow-hidden min-h-0">
          {lastEvaluation ? (
            <FeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryTask}
              onContinue={handleContinueTask}
            />
          ) : (
            <SpeakingController
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
              onOpenHints={() => setIsHintDrawerOpen(true)}
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
      <footer className="flex items-center justify-between border-t border-border/40 pt-2 shrink-0 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>[Space]: {lastEvaluation ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Thu âm/Dừng"}</span>
          <span>•</span>
          <span>[Backspace]: Xoá nói lại</span>
          <span>•</span>
          <span>[H]: Gợi ý</span>
          {pendingSpokenText && !isEvaluating && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Nộp bài chấm điểm</span>
            </>
          )}
          {lastEvaluation && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Câu tiếp</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Mastery: {skillMastery.overallMastery}%</span>
        </div>
      </footer>

      {/* Completion Summary Modal */}
      <SessionSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        skillMastery={skillMastery}
        onRestart={() => {
          resetSession();
          setHasStartedSession(false);
        }}
      />
    </div>
  );
}
