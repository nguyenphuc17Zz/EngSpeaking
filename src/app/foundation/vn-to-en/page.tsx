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
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";

import { VNPromptCard } from "@/components/foundation/vn-to-en/VNPromptCard";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { VNFeedbackCard } from "@/components/foundation/vn-to-en/VNFeedbackCard";
import { VNSummaryModal } from "@/components/foundation/vn-to-en/VNSummaryModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";

import type { VNToENRetrievalMode } from "@/types/vn-to-en";

export default function VNToENPage() {
  const {
    currentTask,
    isGenerating,
    isEvaluating,
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

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

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
    if (recorder.status === "recording") {
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
  }, [recorder.status, recordingStartTime]);

  // Start Voice Recording
  const handleStartRecord = useCallback(async () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setIsCountingDown(false);
    setPrepCountdown(null);

    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setRecordingStartTime(Date.now());

    try {
      await recorder.start();
      speechRec.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [recorder, speechRec, setIsCountingDown, setPrepCountdown]);

  // Stable ref for auto-start timer
  const handleStartRecordRef = useRef(handleStartRecord);
  handleStartRecordRef.current = handleStartRecord;

  // Submit attempt for AI evaluation
  const submitAttemptForEvaluation = useCallback(
    async (spokenText: string, speechDurationMs: number) => {
      if (!currentTask) return;

      const responseLatencyMs = Math.max(400, recordingStartTime ? recordingStartTime - promptDisplayTime : 2000);

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

      try {
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
      }
    },
    [currentTask, recordingStartTime, promptDisplayTime, hintTier, attemptCount, processEvaluation]
  );

  // Stop Recording and Evaluate
  const handleStopRecord = useCallback(async () => {
    if (recorder.status !== "recording") return;

    soundEffects.playMicStop();
    speechRec.stopListening();
    const durationMs = Math.max(700, Date.now() - recordingStartTime);

    try {
      await recorder.stop();
      await new Promise((r) => setTimeout(r, 400));
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();

      await submitAttemptForEvaluation(spokenText, durationMs);
    } catch {
      toast.error("Lỗi hoàn thành thu âm", "Hãy thử nói lại câu.");
    }
  }, [recorder, speechRec, recordingStartTime, submitAttemptForEvaluation]);

  // Reset Live Transcript during recording (Backspace)
  const handleResetLiveTranscript = useCallback(() => {
    speechRec.resetTranscript();
    toast.info("Đã xoá câu nói", "Micro vẫn mở, hãy nói lại từ đầu trôi chảy.");
  }, [speechRec]);

  // Handle Text Fallback Submit
  const handleTextFallbackSubmit = async (text: string) => {
    await submitAttemptForEvaluation(text, 2200);
  };

  // Retry same task (Say Again)
  const handleRetryTask = useCallback(() => {
    incrementAttempt(false);
    speechRec.resetTranscript();
    if (autoStartMic) {
      handleStartRecord();
    }
  }, [incrementAttempt, speechRec, autoStartMic, handleStartRecord]);

  // Say It Better
  const handleSayItBetter = useCallback(() => {
    incrementAttempt(true);
    speechRec.resetTranscript();
    toast.info("Chế độ 'Say It Better'", "Hãy nhại lại câu bản xứ tự nhiên hơn để ghi nhớ mẫu câu!");
    if (autoStartMic) {
      handleStartRecord();
    }
  }, [incrementAttempt, speechRec, autoStartMic, handleStartRecord]);

  // Continue to Next Task
  const handleContinueTask = useCallback(() => {
    speechRec.resetTranscript();
    advanceToNextTask();
  }, [speechRec, advanceToNextTask]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastEvaluation) {
          handleRetryTask();
        } else if (recorder.status === "recording") {
          handleStopRecord();
        } else if (!isEvaluating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        handleResetLiveTranscript();
      } else if (e.code === "KeyH" && !isEvaluating) {
        e.preventDefault();
        setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4);
      } else if (e.code === "Enter" && lastEvaluation) {
        e.preventDefault();
        handleContinueTask();
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
    recorder.status,
    isEvaluating,
    lastEvaluation,
    hintTier,
    hasStartedSession,
    handleStartRecord,
    handleStopRecord,
    handleResetLiveTranscript,
    handleRetryTask,
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

  // 4. Immersive Zero-Scroll 2-Column Split Studio
  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl p-3 md:p-5 flex flex-col justify-between overflow-hidden">
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
          <GlobalAiSelector />
        </div>

        {/* Center Progress Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-foreground">
            Câu {currentTaskIndex + 1}/{sessionConfig.targetCount}
          </span>
          <div className="w-24 sm:w-36">
            <Progress
              value={((currentTaskIndex + 1) / sessionConfig.targetCount) * 100}
              className="h-1.5 rounded-full"
            />
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-2">
          {isCountingDown && prepCountdown !== null ? (
            <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-mono animate-pulse">
              Chuẩn bị: {prepCountdown}s
            </Badge>
          ) : sessionConfig.mode === "rapid_fire" && adaptiveState.rapidStreak > 0 ? (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono">
              🔥 Streak: {adaptiveState.rapidStreak}
            </Badge>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
              Khẩu ngữ phản xạ
            </span>
          )}
        </div>
      </header>

      {/* Main 2-Column Split Studio Grid (Zero-Scroll Stage) */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 my-3 overflow-hidden min-h-0">
        {/* Left Column (5 cols): Vietnamese Prompt Card, Vocab Chips & Inline Hints */}
        <div className="md:col-span-5 flex flex-col h-full overflow-hidden min-h-0">
          {currentTask && (
            <VNPromptCard
              task={currentTask}
              currentTaskIndex={currentTaskIndex}
              totalTasks={sessionConfig.targetCount}
              prepCountdown={prepCountdown}
              isCountingDown={isCountingDown}
              rapidStreak={adaptiveState.rapidStreak}
              currentHintTier={hintTier}
              onSelectHintTier={setHintTier}
            />
          )}
        </div>

        {/* Right Column (7 cols): Speaking Controller OR Evaluation Feedback */}
        <div className="md:col-span-7 flex flex-col h-full overflow-hidden min-h-0">
          {lastEvaluation ? (
            <VNFeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryTask}
              onContinue={handleContinueTask}
              onSayItBetter={handleSayItBetter}
            />
          ) : (
            <SpeakingController
              status={recorder.status === "recording" ? "recording" : "idle"}
              isListening={speechRec.isListening}
              liveTranscript={speechRec.fullTranscript}
              durationMs={recordingDurationMs}
              autoStartMic={autoStartMic}
              onToggleAutoStartMic={setAutoStartMic}
              onStartRecord={handleStartRecord}
              onStopRecord={handleStopRecord}
              onSubmitTextFallback={handleTextFallbackSubmit}
              onOpenHints={() => setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4)}
              isEvaluating={isEvaluating}
              onResetLiveTranscript={handleResetLiveTranscript}
            />
          )}
        </div>
      </main>

      {/* Bottom Footer Dock */}
      <footer className="flex items-center justify-between border-t border-border/40 pt-2 shrink-0 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>[Space]: {lastEvaluation ? "Nói lại" : "Thu âm/Dừng"}</span>
          <span>•</span>
          <span>[Backspace]: Xoá nói lại</span>
          <span>•</span>
          <span>[H]: Gợi ý</span>
          {lastEvaluation && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Câu tiếp</span>
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
