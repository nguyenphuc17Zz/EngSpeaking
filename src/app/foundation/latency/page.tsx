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
} from "lucide-react";

import { useLatencyStore } from "@/stores/latency-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { computeFastPassLatencyMatch } from "@/lib/foundation/latency/fast-pass.service";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { LatencyPromptCard } from "@/components/foundation/latency/LatencyPromptCard";
import { LatencyFeedbackCard } from "@/components/foundation/latency/LatencyFeedbackCard";
import { LatencySummaryModal } from "@/components/foundation/latency/LatencySummaryModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import type { LatencyDrillMode } from "@/types/latency-training";

export default function LatencyTrainingPage() {
  const {
    currentTask,
    isGenerating,
    isEvaluating,
    setIsEvaluating,
    currentDrillMode,
    targetCount,
    currentTaskIndex,
    isSessionCompleted,
    sessionSummary,
    lastEvaluation,
    adaptiveState,
    generationError,
    clearGenerationError,
    initSession,
    processEvaluation,
    advanceToNextTask,
    resetSession,
  } = useLatencyStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  const [hasStartedSession, setHasStartedSession] = useState(false);
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

  // Initialize Mode
  const handleStartMode = async (mode: LatencyDrillMode, count?: number) => {
    setCurrentHintTier(0);
    setHasStartedSession(true);
    await initSession(mode, count);
  };

  // Stopwatch routine for measuring response latency
  useEffect(() => {
    if (!hasStartedSession || !currentTask || lastEvaluation || isSessionCompleted) {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      return;
    }

    const t0 = Date.now();
    setPromptDisplayTime(t0);
    setElapsedMs(0);
    setSpeechStartTimestamp(null);
    setDetectedSpeechOnsetMs(null);

    stopwatchRef.current = setInterval(() => {
      setElapsedMs(Date.now() - t0);
    }, 30);

    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [currentTask?.id, lastEvaluation, isSessionCompleted, hasStartedSession]);

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

  // Exit Studio
  const handleExitStudio = () => {
    resetSession();
    setIsEvaluating(false);
    setPendingSpokenText(null);
    setHasStartedSession(false);
    setCurrentHintTier(0);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      // Space: Toggle Mic / Re-record / Retry
      if (e.code === "Space") {
        e.preventDefault();
        if (hasStartedSession && currentTask && !lastEvaluation) {
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
        } else if (hasStartedSession) {
          handleExitStudio();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasStartedSession,
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
  ]);

  const liveText = unifiedSTT.fullTranscript || unifiedSTT.transcript;

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
              handleStartMode(currentDrillMode, targetCount);
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
            Quay lại trang chính
          </Button>
        </div>
      </div>
    );
  }

  // ==================== 1. STUDIO MODE (Zero-Scroll 2-Column Split) ====================
  if (hasStartedSession && (currentTask || isGenerating)) {
    return (
      <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden text-foreground rounded-3xl border border-border/80 bg-card shadow-xs">
        {/* Studio Top Header Bar */}
        <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExitStudio}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Thoát phòng tập (Esc)"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Rời Studio</span>
            </Button>

            <div className="h-4 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                <span>Response Latency Gym</span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono capitalize border-amber-500/30 text-amber-600 dark:text-amber-400 hidden md:inline-flex"
              >
                {currentDrillMode.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Center: Progress Bar */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block font-mono text-xs">
              <span className="text-muted-foreground">Tiến độ: </span>
              <span className="font-bold text-foreground">
                {currentTaskIndex + 1}/{targetCount}
              </span>
            </div>
            <div className="w-24 sm:w-32">
              <Progress
                value={((currentTaskIndex + 1) / targetCount) * 100}
                className="h-2 rounded-full"
              />
            </div>
          </div>

          {/* Right Header: AI Engine Selector */}
          <div className="flex items-center gap-2">
            <GlobalAiSelector size="sm" />
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

        {/* Studio Main Body: 2 Columns Zero-Scroll */}
        <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-3 md:p-5 overflow-hidden">
          {/* Column 1: Prompt & Millisecond Stopwatch & Hints Stepper (5 Cols) */}
          <section className="md:col-span-5 h-full overflow-hidden flex flex-col min-h-0">
            {currentTask ? (
              <LatencyPromptCard
                task={currentTask}
                currentTaskIndex={currentTaskIndex}
                totalTasks={targetCount}
                isRecording={unifiedSTT.isListening}
                elapsedMs={elapsedMs}
                rapidStreak={adaptiveState.rapidStreak}
                currentHintTier={currentHintTier}
                onSelectHintTier={setCurrentHintTier}
                staircaseTargetMs={adaptiveState.currentTargetLatencyMs}
              />
            ) : (
              <Card className="rounded-3xl border border-border/80 bg-card p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="size-8 text-amber-500 animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">AI đang chuẩn bị câu hỏi tiếp theo...</h3>
                  <p className="text-xs text-muted-foreground">Đo độ trễ chính xác từ mốc hiển thị đầu tiên.</p>
                </div>
              </Card>
            )}
          </section>

          {/* Column 2: Recording Controller or 4-Quadrant Feedback (7 Cols) */}
          <section className="md:col-span-7 h-full overflow-hidden flex flex-col min-h-0">
            {!lastEvaluation ? (
              <SpeakingController
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
        <footer className="h-10 border-t border-border/40 bg-card/80 px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
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
              <span>Đổi tầng gợi ý</span>
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

        {/* Completion Summary Modal */}
        <LatencySummaryModal
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

  // ==================== 2. LOBBY & DASHBOARD VIEW (Before starting session) ====================
  return (
    <div className="space-y-8 pb-16 animate-in fade-in-0 duration-300 max-w-4xl mx-auto px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="size-9 p-0 rounded-full">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="size-4 text-amber-500 fill-amber-500" />
              <span>Response Latency Training (Phòng Tập Tốc Độ Phản Xạ)</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Rèn phản xạ tự động dưới 2.5s — Chuyển dịch từ Slow + Correct sang Fast + Correct
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalAiSelector size="sm" />
          <Badge
            variant="outline"
            className="text-xs font-mono border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            Function 4 • Real AI
          </Badge>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="p-6 md:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background shadow-sm space-y-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold w-fit">
          <Zap className="size-3.5 fill-current" />
          <span>Spoken Retrieval Speed Gym</span>
        </div>

        <div className="max-w-2xl space-y-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Bứt phá độ trễ khẩu ngữ: Bật câu tiếng Anh ngay lập tức
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Người học thường tốn 5-7 giây suy nghĩ dịch từ tiếng Việt trước khi nói. Phòng tập tốc độ sẽ áp đặt áp lực thời gian có kiểm soát để kích hoạt vùng ngôn ngữ tự động (Automatic Retrieval).
          </p>
        </div>
      </div>

      {/* Baseline Test Card */}
      <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 p-6 space-y-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Baseline Latency Test (Kiểm tra mốc phản xạ khởi đầu)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                10 câu hỏi chuẩn hóa để đo lường Median Latency và thiết lập mục tiêu cá nhân hóa.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => handleStartMode("baseline_test", 10)}
            className="rounded-2xl font-bold gap-1.5 shadow-md shadow-primary/25 btn-spring shrink-0 w-full sm:w-auto"
          >
            <span>Làm bài Test (10 câu)</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Card>

      {/* 3 Main Drill Modes */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Hoặc chọn chế độ phòng tập tốc độ:
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* Open Response */}
          <Card
            onClick={() => handleStartMode("open_response", 8)}
            className="rounded-3xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-xs"
          >
            <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Target className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Open Response</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Câu hỏi mở thực tế, rèn phản xạ tự nhiên không đóng băng tư duy.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              8 câu • ~3.0s target
            </Badge>
          </Card>

          {/* Rapid Retrieval */}
          <Card
            onClick={() => handleStartMode("rapid_retrieval", 12)}
            className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/5 hover:border-amber-500 transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-3 right-3">
              <Badge className="text-[9px] font-bold bg-amber-500 text-white">Khuyên dùng</Badge>
            </div>
            <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Flame className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Rapid Retrieval</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chuỗi phản xạ câu ngắn liên hoàn ép tốc độ dưới 1.8 giây.
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30"
            >
              12 câu • Phản xạ tức thì
            </Badge>
          </Card>

          {/* Timed Countdown */}
          <Card
            onClick={() => handleStartMode("timed_countdown", 10)}
            className="rounded-3xl border border-border/80 bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer p-5 space-y-3 btn-spring shadow-xs"
          >
            <div className="size-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Clock className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Timed Countdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Áp lực bậc thang đếm lùi rút ngắn dần từ 3.0s xuống 1.5s.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              10 câu • Bậc thang thời gian
            </Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
