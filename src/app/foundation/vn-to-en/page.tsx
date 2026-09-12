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
  Zap,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Clock,
  Target,
  Flame,
  Brain,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Settings2,
} from "lucide-react";

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
  const tts = useBrowserTTS();
  const {
    currentTask,
    isGenerating,
    isEvaluating,
    setIsEvaluating,
    sessionConfig,
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
    fetchFirstTask,
    processEvaluation,
    advanceToNextTask,
    setHintTier,
    incrementAttempt,
    setAutoStartMic,
    setPrepCountdown,
    setIsCountingDown,
    clearGenerationError,
    resetSession,
  } = useVNToENStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2000);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or Select Mode
  const handleStartSession = async (mode: VNToENRetrievalMode) => {
    setHasStartedSession(true);
    await initSession(mode);
  };

  // Preparation Countdown Timer routine when a new task is loaded
  useEffect(() => {
    if (!hasStartedSession || !currentTask || lastEvaluation || isSessionCompleted) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }

    setPromptDisplayTime(Date.now());
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    if (autoStartMic && (sessionConfig.mode === "timed" || sessionConfig.mode === "rapid_fire")) {
      setIsCountingDown(true);
      let count = Math.round(currentTask.prepTimeSec || (sessionConfig.mode === "rapid_fire" ? 1.0 : 2.0));
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
  }, [currentTask?.id, autoStartMic, hasStartedSession, sessionConfig.mode, lastEvaluation, isSessionCompleted, setIsCountingDown, setPrepCountdown]);

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

  // Stop Recording -> Do NOT send immediately, store in pending review state
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
        } else if (hasStartedSession) {
          setHasStartedSession(false);
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
    hasStartedSession,
    pendingSpokenText,
    handleConfirmSubmit,
    handleReRecord,
    handleStopRecord,
    handleStartRecord,
    handleRetryTask,
    handleResetLiveTranscript,
    handleContinueTask,
    setHintTier,
  ]);

  // 1. Session Setup Screen (Lobby View)
  if (!hasStartedSession || (!currentTask && !isGenerating && !generationError)) {
    return (
      <div className="space-y-8 pb-16 animate-in fade-in-0 duration-300 max-w-5xl mx-auto">
        {/* Top Bar with Global AI Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
              <ArrowLeft className="size-4" />
              <span>Quay lại Foundation</span>
            </Button>
          </Link>
          <GlobalAiSelector />
        </div>

        {/* Hero Banner */}
        <div className="p-6 md:p-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-sm space-y-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold w-fit">
            <Zap className="size-3.5" />
            <span>Spoken Retrieval Engine • 100% Real Dynamic AI</span>
          </div>

          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Vietnamese → English Speaking
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ép não bộ truy xuất trực tiếp từ ý niệm tiếng Việt sang phát âm tiếng Anh tự nhiên — dứt điểm thói quen dịch nhẩm từng từ trong đầu.
            </p>
          </div>
        </div>

        {/* 3 Retrieval Modes Selection */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Chọn chế độ truy xuất khẩu ngữ:
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Direct Retrieval */}
            <Card
              onClick={() => handleStartSession("direct")}
              className="rounded-3xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-xs"
            >
              <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Target className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Direct Retrieval (Tự do)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tự do suy nghĩ và chủ động bấm Mic khi đã sẵn sàng.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                8 câu • Không áp lực
              </Badge>
            </Card>

            {/* Timed Retrieval */}
            <Card
              onClick={() => handleStartSession("timed")}
              className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 hover:border-primary transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <Badge className="text-[9px] font-bold bg-primary text-primary-foreground">Khuyên dùng</Badge>
              </div>
              <div className="size-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Timed Retrieval (Đếm lùi)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Đếm lùi chuẩn bị (2s) rồi tự bật Mic ép phản xạ dứt khoát.</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                10 câu • Áp lực thời gian
              </Badge>
            </Card>

            {/* Rapid Fire */}
            <Card
              onClick={() => handleStartSession("rapid_fire")}
              className="rounded-3xl border border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-xs"
            >
              <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Flame className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Rapid Fire (Liên hoàn &lt;2s)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Chuỗi phản xạ câu ngắn giao tiếp liên tục dưới 2 giây.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                12 câu • Tốc độ tối đa
              </Badge>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State while generating first task
  if (isGenerating && !currentTask && !generationError) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-6 max-w-2xl mx-auto my-12 text-center animate-in fade-in-0">
        <div className="size-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-7 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">AI đang tạo tình huống phản xạ...</h2>
          <p className="text-xs text-muted-foreground">
            Hệ thống 100% sử dụng AI thật, tối ưu hoá theo khoảng cách phản xạ của bạn.
          </p>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  // 3. Error Banner View (if AI generation fails)
  if (generationError && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-5 max-w-xl mx-auto my-12 text-center animate-in fade-in-0">
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

  // 4. Immersive Studio View (Professional 3-Column Split Studio)
  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs animate-in fade-in-0 duration-200">
      {/* Studio Header Bar */}
      <header className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (prepTimerRef.current) clearInterval(prepTimerRef.current);
              setHasStartedSession(false);
            }}
            className="h-8 px-2.5 rounded-xl gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Thoát Studio"
          >
            <X className="size-4" />
            <span className="hidden sm:inline">Thoát</span>
          </Button>

          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-primary/30 text-primary">
            VN → EN • <span className="capitalize">{sessionConfig.mode.replace("_", " ")}</span>
          </Badge>

          {/* Global AI Engine Badge / Selector */}
          <GlobalAiSelector size="sm" />
        </div>

        {/* Center Progress Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-foreground">
            Câu {currentTaskIndex + 1}/{sessionConfig.targetCount}
          </span>
          <div className="w-16 sm:w-28">
            <Progress
              value={((currentTaskIndex + 1) / sessionConfig.targetCount) * 100}
              className="h-1.5 rounded-full"
            />
          </div>
        </div>

        {/* Right Status Indicator & Next Task Button */}
        <div className="flex items-center gap-2">
          {/* Next Task Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipOrNextTask}
            disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-2xs btn-spring"
            title="Đổi sang câu hỏi tiếp theo (Phím R)"
          >
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>Câu tiếp theo</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>

          {isCountingDown && prepCountdown !== null ? (
            <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-mono animate-pulse">
              Chuẩn bị: {prepCountdown}s
            </Badge>
          ) : sessionConfig.mode === "rapid_fire" && adaptiveState.rapidStreak > 0 ? (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono">
              🔥 Streak: {adaptiveState.rapidStreak}
            </Badge>
          ) : null}
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

      {/* Completion Summary Modal */}
      <VNSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        onRestart={() => {
          resetSession();
          setHasStartedSession(false);
        }}
      />
    </div>
  );
}
