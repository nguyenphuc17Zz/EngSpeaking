"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Trophy,
  RotateCcw,
  Mic,
  Square,
  Volume2,
} from "lucide-react";

import { useSurvivalStore } from "@/stores/survival-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";

import { SurvivalPromptCard } from "@/components/foundation/survival/SurvivalPromptCard";
import { SurvivalFeedbackCard } from "@/components/foundation/survival/SurvivalFeedbackCard";
import { SurvivalSessionSummaryModal } from "@/components/foundation/survival/SurvivalSessionSummaryModal";

export default function SurvivalSpeakingPage() {
  const router = useRouter();
  const {
    mode,
    currentCircumTask,
    currentScenarioTask,
    isGenerating,
    isEvaluating,
    generationError,
    lastEvaluation,
    sessionAttempts,
    setMode,
    clearGenerationError,
    fetchNextCircumTask,
    fetchNextScenarioTask,
    processEvaluation,
    resetSessionStats,
    getSessionSummary,
  } = useSurvivalStore();

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [autoStartMic, setAutoStartMic] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    if (mode === "circumlocution" && !currentCircumTask) {
      fetchNextCircumTask();
    } else if (mode === "scenarios" && !currentScenarioTask) {
      fetchNextScenarioTask();
    }
  }, [mode, currentCircumTask, currentScenarioTask, fetchNextCircumTask, fetchNextScenarioTask]);

  // Countdown timer on prompt ready
  useEffect(() => {
    setPromptDisplayTime(Date.now());
    setCountdownSeconds(5);
    setCurrentHintTier(0);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [currentCircumTask?.id, currentScenarioTask?.id]);

  // Recording duration timer
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

  // Start recording
  const handleStartRecord = useCallback(async () => {
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    try {
      await recorder.start();
      speechRec.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro.");
    }
  }, [recorder, speechRec]);

  // Evaluate attempt
  const executeEvaluation = useCallback(async (spokenText: string, measuredLatency: number) => {
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
      useSurvivalStore.setState({ isEvaluating: true });
      const res = await fetch("/api/foundation/survival/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          task: mode === "circumlocution" ? currentCircumTask : currentScenarioTask,
          userTranscript: spokenText,
          responseLatencyMs: measuredLatency,
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
      useSurvivalStore.setState({ isEvaluating: false });
    }
  }, [mode, currentCircumTask, currentScenarioTask, processEvaluation]);

  // Stop recording and evaluate
  const handleStopRecord = useCallback(async () => {
    if (recorder.status !== "recording") return;

    soundEffects.playMicStop();
    speechRec.stopListening();

    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

    try {
      await recorder.stop();
      await new Promise((r) => setTimeout(r, 400));
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      await executeEvaluation(spokenText, measuredLatency);
    } catch {
      toast.error("Lỗi xử lý", "Không thể dừng micro.");
    }
  }, [recorder, speechRec, promptDisplayTime, executeEvaluation]);

  // Submit fallback text
  const handleSubmitTextFallback = useCallback(async (text: string) => {
    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);
    await executeEvaluation(text.trim(), measuredLatency);
  }, [promptDisplayTime, executeEvaluation]);

  // Continue to next challenge
  const handleContinue = useCallback(() => {
    speechRec.resetTranscript();
    setCurrentHintTier(0);
    if (mode === "circumlocution") {
      fetchNextCircumTask();
    } else {
      fetchNextScenarioTask();
    }
  }, [mode, speechRec, fetchNextCircumTask, fetchNextScenarioTask]);

  // Retry current challenge
  const handleRetryCurrent = useCallback(() => {
    useSurvivalStore.setState({ lastEvaluation: null });
    speechRec.resetTranscript();
    setPromptDisplayTime(Date.now());
  }, [speechRec]);

  // Keyboard Shortcuts (Space, Backspace, H, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastEvaluation) {
          handleRetryCurrent();
        } else if (recorder.status === "recording") {
          handleStopRecord();
        } else if (!isEvaluating && !isGenerating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        speechRec.resetTranscript();
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !lastEvaluation) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.code === "Enter" && lastEvaluation) {
        e.preventDefault();
        handleContinue();
      } else if (e.code === "Escape") {
        e.preventDefault();
        router.push("/foundation");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    recorder.status,
    isEvaluating,
    isGenerating,
    lastEvaluation,
    handleStartRecord,
    handleStopRecord,
    handleRetryCurrent,
    handleContinue,
    router,
    speechRec,
  ]);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-background text-foreground flex flex-col justify-between overflow-hidden z-40 select-none">
      {/* Studio Header */}
      <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/foundation">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full hover:bg-muted"
              title="Thoát Studio (Esc)"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="size-4" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-foreground">
              Survival Speaking Studio
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono hidden sm:inline-flex">
              {mode === "circumlocution" ? "Circumlocution Gym" : "Real-Life Scenarios"}
            </Badge>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Summary, GlobalAiSelector */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              onClick={() => setMode("circumlocution")}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                mode === "circumlocution"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Circumlocution
            </button>
            <button
              onClick={() => setMode("scenarios")}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                mode === "scenarios"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Scenarios
            </button>
          </div>

          {sessionAttempts > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSummaryOpen(true)}
              className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-border/80"
            >
              <Trophy className="size-3.5 text-amber-500" />
              <span>Tổng kết ({sessionAttempts})</span>
            </Button>
          )}

          <GlobalAiSelector size="sm" />
        </div>
      </header>

      {/* Main Studio Body: 2-Column Split Studio */}
      <main className="flex-1 p-3 sm:p-5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (5 Cols): Prompt Card OR Skeleton OR Error */}
        <div className="lg:col-span-5 h-full overflow-hidden flex flex-col justify-between">
          {isGenerating ? (
            <Card className="h-full rounded-3xl border border-border/80 bg-card p-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center animate-pulse">
                <Sparkles className="size-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  AI đang tạo tình huống sinh tồn giao tiếp...
                </p>
                <p className="text-xs text-muted-foreground">
                  Chuẩn bị bối cảnh đời thực và các nấc thang gợi ý
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
                <h3 className="text-sm font-bold text-foreground">Không thể tạo thử thách từ AI</h3>
                <p className="text-xs text-muted-foreground max-w-sm">{generationError}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  clearGenerationError();
                  if (mode === "circumlocution") fetchNextCircumTask();
                  else fetchNextScenarioTask();
                }}
                className="rounded-xl font-bold text-xs gap-1.5 h-9 px-4 btn-spring"
              >
                <RotateCcw className="size-3.5" />
                <span>Thử lại ngay</span>
              </Button>
            </Card>
          ) : (
            <SurvivalPromptCard
              mode={mode}
              circumTask={currentCircumTask}
              scenarioTask={currentScenarioTask}
              countdownSeconds={countdownSeconds}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          )}
        </div>

        {/* Right Column (7 Cols): Speaking Controller OR Evaluation Feedback */}
        <div className="lg:col-span-7 h-full overflow-hidden flex flex-col justify-between">
          {lastEvaluation ? (
            <SurvivalFeedbackCard
              evaluation={lastEvaluation}
              onRetry={handleRetryCurrent}
              onContinue={handleContinue}
            />
          ) : (
            <SpeakingController
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
              onSubmitTextFallback={handleSubmitTextFallback}
              onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1))}
              isEvaluating={isEvaluating}
              onResetLiveTranscript={() => speechRec.resetTranscript()}
            />
          )}
        </div>
      </main>

      {/* Footer Studio Shortcuts Cheatsheet */}
      <footer className="h-10 border-t border-border/40 px-4 sm:px-6 flex items-center justify-between text-[11px] text-muted-foreground bg-card/40 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Space</kbd>
            <span>{lastEvaluation ? "Nói lại" : recorder.status === "recording" ? "Dừng & Chấm" : "Bật mic"}</span>
          </span>
          {recorder.status === "recording" && (
            <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse">
              <kbd className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] font-mono font-bold">Backspace</kbd>
              <span>Xóa nói dở</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">H</kbd>
            <span>Nấc gợi ý ({currentHintTier}/4)</span>
          </span>
          {lastEvaluation && (
            <span className="flex items-center gap-1 text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-mono">Enter</kbd>
              <span>Tiếp tục</span>
            </span>
          )}
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px]">
          <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> Thoát
        </span>
      </footer>

      {/* Session Summary Modal */}
      <SurvivalSessionSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        summary={getSessionSummary()}
        onRestart={() => {
          resetSessionStats();
          setIsSummaryOpen(false);
          handleContinue();
        }}
      />
    </div>
  );
}
